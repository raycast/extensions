/**
 * Homebrew upgrade utilities with progress tracking.
 *
 * Provides functions for upgrading packages with detailed progress updates.
 *
 * Note: Homebrew does NOT support concurrent `brew upgrade` commands.
 * Running multiple upgrade processes simultaneously causes lock errors.
 * However, Homebrew supports concurrent downloads via HOMEBREW_DOWNLOAD_CONCURRENCY.
 *
 * Strategy for faster upgrades:
 * 1. Pre-fetch all packages concurrently using `brew fetch`
 * 2. Upgrade packages sequentially (avoiding lock conflicts)
 * 3. Continue with remaining packages when one fails
 */

import { OutdatedResults } from "../types";
import { restrictToSelection } from "../upgrade-selection";
import { actionsLogger } from "../logger";
import { execBrewWithProgress, BrewProgress, DEFAULT_STALE_TIMEOUT_MS } from "./progress";
import { getErrorMessage, ensureError, StaleProcessError, BrewLockError, upgradeSkipReason } from "../errors";
import { preferences } from "../preferences";
import { brewPinnedIdentifiers, isPinnedPackage, normalizeOutdatedResults } from "./helpers";

/// Upgrade Types

/**
 * A package included in an upgrade run.
 */
export interface UpgradePackage {
  name: string;
  isCask: boolean;
}

/**
 * Status of a single package during an upgrade run.
 */
export type UpgradePackageStatus = "upgrading" | "upgraded" | "failed" | "skipped";

/**
 * Events emitted while upgrading outdated packages.
 *
 * Consumers can use these to drive a toast/HUD and, optionally, a minimal
 * per-package indicator.
 */
export type UpgradeEvent =
  /** Running `brew update` */
  | { type: "update" }
  /** Checking which packages are outdated */
  | { type: "check" }
  /** Outdated packages resolved: the run is about to start */
  | { type: "start"; outdated: OutdatedResults; packages: UpgradePackage[]; skipped: UpgradePackage[] }
  /** Pre-fetching downloads for all packages */
  | { type: "prefetch"; progress?: BrewProgress }
  /** Progress for a single package */
  | {
      type: "package";
      package: UpgradePackage;
      status: UpgradePackageStatus;
      progress?: BrewProgress;
      message?: string;
      error?: Error;
    };

/**
 * Callback for upgrade events.
 */
export type UpgradeEventCallback = (event: UpgradeEvent) => void;

/**
 * Summary of an upgrade run.
 */
export interface UpgradeSummary {
  upgraded: UpgradePackage[];
  failed: UpgradePackage[];
  skipped: UpgradePackage[];
  /** True if the run was cancelled before all packages were upgraded */
  cancelled: boolean;
}

/**
 * Options for the upgrade operation.
 */
export interface UpgradeOptions {
  /** Include auto-updating casks */
  greedy?: boolean;
  /** Pre-fetch all packages before upgrading (uses Homebrew's concurrent downloads) */
  prefetch?: boolean;
  /** Continue upgrading remaining packages if one fails */
  continueOnError?: boolean;
  /** Timeout for stale process detection (ms) */
  staleTimeoutMs?: number;
  /** Callback for progress events */
  onEvent?: UpgradeEventCallback;
  /** AbortSignal for cancellation */
  cancel?: AbortSignal;
  /**
   * Restrict the run to these packages. The run still resolves its own
   * outdated list (after its own `brew update`) and upgrades the intersection
   * of that list with the selection — a package that is no longer outdated is
   * dropped, and one that became outdated during the update is not upgraded
   * unreviewed. Packages outside the selection are left completely untouched.
   * Omit to upgrade everything outdated.
   */
  selection?: UpgradePackage[];
}

/**
 * Stable key for a package, suitable for use in a status map.
 */
export function upgradeKey(pkg: UpgradePackage): string {
  return `${pkg.isCask ? "cask" : "formula"}-${pkg.name}`;
}

/// Upgrade

/**
 * Upgrade all outdated packages, reporting progress via events.
 *
 * Features:
 * - Optional pre-fetching with Homebrew's concurrent downloads
 * - Pinned formulae are skipped
 * - Continue upgrading remaining packages when one fails
 * - Cancellation via AbortSignal
 *
 * Throws if `brew update` or `brew outdated` fail, since neither leaves
 * anything to upgrade.
 *
 * @param options - Upgrade options, including the event callback & cancellation signal
 * @returns Summary of the upgrade run
 */
export async function brewUpgradeOutdated(options?: UpgradeOptions): Promise<UpgradeSummary> {
  const onEvent = options?.onEvent;
  const cancel = options?.cancel;
  const prefetch = options?.prefetch ?? true; // Default to pre-fetching
  const continueOnError = options?.continueOnError ?? true; // Default to continuing
  const staleTimeoutMs = options?.staleTimeoutMs ?? DEFAULT_STALE_TIMEOUT_MS;
  const verboseLogging = preferences.verboseLogging ?? false;
  const execOptions = { staleTimeoutMs, verboseLogging };

  // Step 1: Update brew - 'outdated' is only reliable after a 'brew update'
  onEvent?.({ type: "update" });
  await execBrewWithProgress("update", undefined, cancel, execOptions);

  // Step 2: Check for outdated packages
  onEvent?.({ type: "check" });
  let cmd = "outdated --json=v2";
  if (options?.greedy) {
    cmd += " --greedy";
  }
  const result = await execBrewWithProgress(cmd, undefined, cancel, execOptions);
  const outdated = normalizeOutdatedResults(JSON.parse(result.stdout) as OutdatedResults);

  // Pinned packages cannot be upgraded, so exclude them from the run.
  // This matters because we name every package explicitly: Homebrew only warns
  // about a pinned package on a bare `brew upgrade`, but errors (exit 1) when it
  // is named. Leaving one in would report a deliberate skip as a failure.
  //
  // Read the pin state from disk rather than trusting the payload: a package
  // pinned in another command, or outside Raycast, is pinned in Homebrew's eyes
  // whatever this snapshot says. One snapshot of both pin directories per run.
  const pins = await brewPinnedIdentifiers();
  const isPinned = (name: string, isCask: boolean) => isPinnedPackage(pins, name, isCask);

  const all: UpgradePackage[] = [
    ...outdated.formulae.map((formula) => ({ name: formula.name, isCask: false })),
    ...outdated.casks.map((cask) => ({ name: cask.name, isCask: true })),
  ];
  let packages: UpgradePackage[] = all.filter((pkg) => !isPinned(pkg.name, pkg.isCask));
  const pinned: UpgradePackage[] = all.filter((pkg) => isPinned(pkg.name, pkg.isCask));

  // Honour the selection: upgrade only the reviewed packages that are still
  // outdated. Everything else stays untouched.
  if (options?.selection) {
    packages = restrictToSelection(packages, options.selection);
  }

  onEvent?.({ type: "start", outdated, packages, skipped: pinned });
  for (const pkg of pinned) {
    onEvent?.({ type: "package", package: pkg, status: "skipped", message: "Pinned" });
  }

  const summary: UpgradeSummary = { upgraded: [], failed: [], skipped: [...pinned], cancelled: false };

  if (packages.length === 0) {
    actionsLogger.log("No packages to upgrade");
    return summary;
  }

  actionsLogger.log("Starting batch upgrade", {
    totalPackages: packages.length,
    formulae: outdated.formulae.length,
    casks: outdated.casks.length,
    pinned: pinned.length,
    prefetch,
    continueOnError,
  });

  // Step 3 (optional): Pre-fetch all packages concurrently
  // This leverages HOMEBREW_DOWNLOAD_CONCURRENCY for parallel downloads
  if (prefetch && packages.length > 1) {
    onEvent?.({ type: "prefetch" });
    // Batch progress only — deliberately NOT attributed to a row. brew prints
    // every `Fetching <name> from <tap>` line while ENQUEUEING (cmd/fetch.rb),
    // then downloads the queue concurrently, so those lines say what is about to
    // be fetched, not what is downloading now. Marking rows from them would race
    // through the whole list and then park on whichever was announced last.
    // The toast reports the batch; per-row status resumes at the sequential
    // upgrade loop below, where it is real.
    const onFetchProgress = (progress: BrewProgress) => onEvent?.({ type: "prefetch", progress });

    // Fetch formulae and casks separately (brew fetch syntax)
    const formulaNames = packages.filter((pkg) => !pkg.isCask).map((pkg) => pkg.name);
    const caskNames = packages.filter((pkg) => pkg.isCask).map((pkg) => pkg.name);

    try {
      if (formulaNames.length > 0) {
        await execBrewWithProgress(`fetch ${formulaNames.join(" ")}`, onFetchProgress, cancel, execOptions);
      }
      if (caskNames.length > 0) {
        await execBrewWithProgress(`fetch --cask ${caskNames.join(" ")}`, onFetchProgress, cancel, execOptions);
      }
      actionsLogger.log("Pre-fetch completed", { packages: packages.length });
    } catch (error) {
      // Pre-fetch failure is not fatal - we can still try to upgrade
      // A cancellation is handled by the upgrade loop below
      actionsLogger.warn("Pre-fetch failed, continuing with upgrades", { error: getErrorMessage(error) });
    }
  }

  // Step 4: Upgrade each package sequentially
  // Note: We MUST upgrade sequentially because Homebrew doesn't support concurrent upgrades
  let stop = false;

  for (const pkg of packages) {
    if (cancel?.aborted) {
      summary.cancelled = true;
    }

    // Skip the remaining packages once cancelled, locked out or stopped by an error
    if (summary.cancelled || stop) {
      summary.skipped.push(pkg);
      onEvent?.({
        type: "package",
        package: pkg,
        status: "skipped",
        message: summary.cancelled ? "Cancelled" : "Skipped",
      });
      continue;
    }

    onEvent?.({ type: "package", package: pkg, status: "upgrading" });

    try {
      const cmd = `upgrade ${pkg.isCask ? "--cask " : ""}${pkg.name}`;
      const result = await execBrewWithProgress(
        cmd,
        (progress) => onEvent?.({ type: "package", package: pkg, status: "upgrading", progress }),
        cancel,
        { ...execOptions, packageName: pkg.name },
      );

      // Exit 0 does not mean it was upgraded: Homebrew warns and skips a
      // disabled, unavailable or already-current package.
      const declined = upgradeSkipReason(`${result.stderr ?? ""}\n${result.stdout ?? ""}`, pkg.name);
      if (declined) {
        summary.skipped.push(pkg);
        onEvent?.({ type: "package", package: pkg, status: "skipped", message: declined });
        continue;
      }

      summary.upgraded.push(pkg);
      onEvent?.({ type: "package", package: pkg, status: "upgraded" });
      actionsLogger.log("Package upgraded", { identifier: pkg.name });
    } catch (err) {
      const error = ensureError(err);

      // Cancellation aborts the running brew process: treat it as skipped
      if (cancel?.aborted || error.name === "AbortError") {
        summary.cancelled = true;
        summary.skipped.push(pkg);
        onEvent?.({ type: "package", package: pkg, status: "skipped", message: "Cancelled" });
        continue;
      }

      const message = getErrorMessage(error);
      summary.failed.push(pkg);
      onEvent?.({ type: "package", package: pkg, status: "failed", message, error });

      actionsLogger.error("Package upgrade failed", {
        identifier: pkg.name,
        error: message,
        errorType: error.name,
      });

      if (error instanceof StaleProcessError) {
        actionsLogger.warn("Stale process detected", {
          packageName: pkg.name,
          lastPhase: error.lastPhase,
          staleDurationMs: error.staleDurationMs,
        });
      }

      // A lock error affects every subsequent upgrade, so stop here
      if (error instanceof BrewLockError) {
        actionsLogger.warn("Lock error detected, skipping remaining packages");
        stop = true;
      } else if (!continueOnError) {
        stop = true;
      }
    }
  }

  actionsLogger.log("Batch upgrade completed", {
    upgraded: summary.upgraded.length,
    failed: summary.failed.length,
    skipped: summary.skipped.length,
    cancelled: summary.cancelled,
  });

  return summary;
}
