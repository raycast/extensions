/**
 * Typed winget command API.
 *
 * Flag policy (accumulated knowledge — do not change casually):
 * - All commands: --disable-interactivity --accept-source-agreements
 * - install/repair: + --accept-package-agreements --silent, retried once
 *   WITHOUT --silent when the failure is the requires-administrator class
 *   (silent mode suppresses some installers' UAC elevation prompt)
 * - upgrade: + --accept-package-agreements, NO --silent (some installers need
 *   an interactive elevation prompt that silent mode suppresses)
 * - uninstall: base flags only (--accept-package-agreements is invalid here);
 *   --force only with explicit caller opt-in (user-confirmed — forced removal
 *   deletes a modified portable package's user changes)
 * - upgrade: retried once WITH --force when a modified portable package
 *   refuses removal (winget's own printed remedy; an upgrade replaces the
 *   package either way)
 * - download/import: + --accept-package-agreements, no --silent
 * - Every targeted operation: --exact --id <id> --source <source>
 */

import {
  CancelledError,
  COMMAND_REQUIRES_ADMIN,
  getExitCodeMessage,
  NO_APPLICATIONS_FOUND,
  PORTABLE_UNINSTALL_FAILED,
  toUnsignedHResult,
} from "./errors";
import {
  interpretOperationResult,
  parseInstalledPackages,
  parsePackageDetails,
  parsePinnedPackages,
  parseSearchResults,
  parseUpgradePackages,
  parseVersionList,
  type TableParseResult,
} from "./parser";
import { WingetProgressDetector } from "./progress";
import { runWinget, withQuerySlot } from "./spawn";
import {
  type WingetExecutorOptions,
  type WingetInstalledPackage,
  type WingetOperationResult,
  type WingetPackageDetails,
  type WingetPinnedPackage,
  type WingetSearchPackage,
  type WingetSource,
  type WingetUpgradePackage,
  type WingetVersionList,
} from "./types";

const BASE_FLAGS = ["--disable-interactivity", "--accept-source-agreements"];
const PACKAGE_AGREEMENT_FLAGS = ["--accept-package-agreements"];
const SILENT_FLAGS = ["--silent"];
const EXACT_ID_FLAGS = ["--exact", "--id"];

const INSTALL_FLAGS = [...BASE_FLAGS, ...PACKAGE_AGREEMENT_FLAGS, ...SILENT_FLAGS];
const UPGRADE_FLAGS = [...BASE_FLAGS, ...PACKAGE_AGREEMENT_FLAGS];
/** install/repair elevation-retry flags: the same no---silent set. */
const ELEVATION_RETRY_FLAGS = UPGRADE_FLAGS;
const REPAIR_FLAGS = [...BASE_FLAGS, ...PACKAGE_AGREEMENT_FLAGS, ...SILENT_FLAGS];
const UNINSTALL_FLAGS = [...BASE_FLAGS];
const DOWNLOAD_FLAGS = [...BASE_FLAGS, ...PACKAGE_AGREEMENT_FLAGS];
const IMPORT_FLAGS = [...BASE_FLAGS, ...PACKAGE_AGREEMENT_FLAGS];

const CATALOG_TIMEOUT_MS = 180_000;
const QUERY_TIMEOUT_MS = 120_000;
const DETAILS_TIMEOUT_MS = 30_000;

function withSource(args: string[], source: WingetSource): string[] {
  return [...args, "--source", source];
}

// ---------------------------------------------------------------------------
// Failure-message enrichment
// ---------------------------------------------------------------------------

/**
 * Resolve a human-readable description for an HRESULT-ish error code that was
 * embedded in winget OUTPUT (codes from the exit-code map are already
 * resolved). Falls back to asking `winget error <code>`.
 */
async function resolveErrorDescriptionViaCli(errorCode: string, signal?: AbortSignal): Promise<string | undefined> {
  // Negative decimal codes would parse as a flag-like argv token; winget
  // accepts the hex form for both.
  let code = errorCode.trim();
  if (/^-\d+$/.test(code)) {
    code = `0x${toUnsignedHResult(Number.parseInt(code, 10)).toString(16).toUpperCase()}`;
  }
  try {
    const result = await runWinget(["error", code], {
      timeout: 10_000,
      signal,
    });
    if (result.exitCode !== 0) return undefined;
    const lines = (result.stdout || result.stderr)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.find((l) => !/^0x[0-9a-f]+$/i.test(l) && !/^-?\d+$/.test(l));
  } catch {
    return undefined;
  }
}

/** Append installer-log location and a CLI-resolved description where useful. */
async function enrichFailureMessage(
  result: WingetOperationResult,
  signal?: AbortSignal,
): Promise<WingetOperationResult> {
  if (result.success) return result;

  let message = result.message;
  // Resolve a bare hex code into a human-readable description.
  if (result.errorCode && (!message || /^WinGet exited with code/.test(message))) {
    const description = await resolveErrorDescriptionViaCli(result.errorCode, signal);
    if (description) {
      message = description;
    }
  }
  if (message && result.installerLogPath) {
    message = `${message}. Installer log: ${result.installerLogPath}`;
  }
  return { ...result, message };
}

// ---------------------------------------------------------------------------
// Core executors
// ---------------------------------------------------------------------------

async function executeOperation(args: string[], options: WingetExecutorOptions = {}): Promise<WingetOperationResult> {
  const detector = new WingetProgressDetector((state) => options.onProgress?.(state));

  try {
    const execResult = await runWinget(args, {
      signal: options.signal,
      timeout: options.timeout,
      staleWatchdog: true,
      onSpawn: options.onSpawn,
      onStdout: (chunk) => detector.feed(chunk),
      onStderr: (chunk) => detector.feed(chunk),
    });
    detector.flush();
    const result = interpretOperationResult(execResult.exitCode, detector.getBuffer());
    return enrichFailureMessage(result, options.signal);
  } catch (error) {
    if (error instanceof CancelledError) {
      return {
        success: false,
        cancelled: true,
        message: "Operation was cancelled",
      };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function isWingetAvailable(): Promise<boolean> {
  try {
    const result = await runWinget(["--version"], { timeout: 10_000 });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * The full catalog. Requires an explicit empty query — winget lists the whole
 * source only for `search -q ""` (and cmd.exe would drop the empty arg, which
 * is one reason we spawn winget directly).
 */
async function searchAllPackages(signal?: AbortSignal): Promise<TableParseResult<WingetSearchPackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["search", "-q", "", ...BASE_FLAGS], {
      timeout: CATALOG_TIMEOUT_MS,
      signal,
    });
    return parseSearchResults(result.stdout);
  });
}

async function listInstalledPackages(signal?: AbortSignal): Promise<TableParseResult<WingetInstalledPackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["list", ...BASE_FLAGS], {
      timeout: QUERY_TIMEOUT_MS,
      signal,
    });
    return parseInstalledPackages(result.stdout);
  });
}

async function listUpgradePackages(signal?: AbortSignal): Promise<TableParseResult<WingetUpgradePackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["upgrade", ...BASE_FLAGS], {
      timeout: QUERY_TIMEOUT_MS,
      signal,
    });
    return parseUpgradePackages(result.stdout);
  });
}

async function listPinnedPackages(signal?: AbortSignal): Promise<TableParseResult<WingetPinnedPackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["pin", "list", ...BASE_FLAGS], {
      timeout: QUERY_TIMEOUT_MS,
      signal,
    });
    return parsePinnedPackages(result.stdout);
  });
}

interface MutableData {
  installed: WingetInstalledPackage[];
  upgradable: WingetUpgradePackage[];
  pinned: WingetPinnedPackage[];
  droppedTruncatedIds: number;
}

/**
 * The three mutable slices, fetched concurrently as ONE consistent snapshot —
 * used where a decision joins across slices (upgrade-all preflight). Index
 * refreshes use core/refresh.refreshSlicesIncrementally instead, which
 * commits each slice as it arrives. Queries are read-only and winget handles
 * parallel invocations; measured on a 290-package system: 19.4 s sequential
 * vs 12.5 s concurrent (winget self-contends on its source index, so the win
 * is ~35%, not 3x).
 */
async function fetchMutableData(signal?: AbortSignal): Promise<MutableData> {
  const [installed, upgradable, pinned] = await Promise.all([
    listInstalledPackages(signal),
    listUpgradePackages(signal),
    listPinnedPackages(signal),
  ]);
  return {
    installed: installed.items,
    upgradable: upgradable.items,
    pinned: pinned.items,
    droppedTruncatedIds:
      installed.stats.droppedTruncatedIds + upgradable.stats.droppedTruncatedIds + pinned.stats.droppedTruncatedIds,
  };
}

async function showPackageDetails(
  id: string,
  source: WingetSource,
  signal?: AbortSignal,
): Promise<WingetPackageDetails | null> {
  return withQuerySlot(async () => {
    const result = await runWinget(withSource(["show", ...EXACT_ID_FLAGS, id, ...BASE_FLAGS], source), {
      timeout: DETAILS_TIMEOUT_MS,
      signal,
    });
    const details = parsePackageDetails(result.stdout);
    if (details === null && result.exitCode !== 0 && toUnsignedHResult(result.exitCode) !== NO_APPLICATIONS_FOUND) {
      // Transient failure (network/source), not a definitive "no such
      // package" — throw so callers don't cache the absence.
      throw new Error(getExitCodeMessage(result.exitCode) ?? "Failed to load package details");
    }
    return details;
  });
}

async function showPackageVersions(
  id: string,
  source: WingetSource,
  signal?: AbortSignal,
): Promise<WingetVersionList | null> {
  return withQuerySlot(async () => {
    const result = await runWinget(withSource(["show", ...EXACT_ID_FLAGS, id, "--versions", ...BASE_FLAGS], source), {
      timeout: DETAILS_TIMEOUT_MS,
      signal,
    });
    const versions = parseVersionList(result.stdout);
    if (versions === null && result.exitCode !== 0 && toUnsignedHResult(result.exitCode) !== NO_APPLICATIONS_FOUND) {
      // Transient failure (network/source), not a definitive "no such
      // package" — throw so callers don't cache the absence.
      throw new Error(getExitCodeMessage(result.exitCode) ?? "Failed to load package versions");
    }
    return versions;
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * The requires-administrator failure class: winget's silent mode blocks the
 * installer's UAC prompt for some packages (the root cause behind upgrade's
 * no---silent policy). Anchored to locale-independent signals: the winget
 * exit code, the curated message from the failure-pattern catalog (matched as
 * a prefix — enrichment appends the installer-log path), or installer exit
 * code 740 (ERROR_ELEVATION_REQUIRED). A free-text scan would over-trigger on
 * enriched content such as log paths under C:\Users\Administrator.
 */
function isElevationFailure(result: WingetOperationResult): boolean {
  if (result.success || result.cancelled) return false;
  if (result.exitCode !== undefined && toUnsignedHResult(result.exitCode) === COMMAND_REQUIRES_ADMIN) {
    return true;
  }
  const message = result.message ?? "";
  return message.startsWith("Requires administrator") || /exit code:?\s*740\b/i.test(message);
}

/**
 * Run an install/repair invocation silent-first; when it fails with the
 * requires-administrator class, retry once without --silent so the installer
 * can raise its UAC prompt.
 */
async function executeWithElevationRetry(
  argsFor: (flags: string[]) => string[],
  silentFlags: string[],
  options: WingetExecutorOptions,
): Promise<WingetOperationResult> {
  const result = await executeOperation(argsFor(silentFlags), options);
  if (!isElevationFailure(result)) {
    return result;
  }
  return executeOperation(argsFor(ELEVATION_RETRY_FLAGS), options);
}

async function installPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  return executeWithElevationRetry(
    (flags) => withSource(["install", ...EXACT_ID_FLAGS, id, ...flags], source),
    INSTALL_FLAGS,
    options,
  );
}

/**
 * Install a specific version, then add a blocking pin (version installs are
 * always pinned so upgrades don't undo the chosen version).
 * A pin failure never masks the install result — the install succeeded.
 */
async function installPackageVersion(
  id: string,
  version: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  const result = await executeWithElevationRetry(
    (flags) => withSource(["install", ...EXACT_ID_FLAGS, id, "--version", version, ...flags], source),
    INSTALL_FLAGS,
    options,
  );
  if (!result.success) {
    return result;
  }

  const pinResult = await executeOperation(
    withSource(["pin", "add", ...EXACT_ID_FLAGS, id, "--blocking", ...BASE_FLAGS], source),
    { signal: options.signal, onSpawn: options.onSpawn },
  );
  if (pinResult.cancelled) {
    // The install itself completed — never report it as not having happened,
    // but disclose that the auto-pin was skipped.
    return {
      ...result,
      message: `Installed ${version}, but the auto-pin was skipped (cancelled). Pin it manually to keep this version`,
    };
  }
  if (!pinResult.success && !pinResult.noop) {
    return {
      ...result,
      message: `Installed ${version}, but pinning failed${pinResult.message ? `. ${pinResult.message}` : ""}`,
    };
  }
  return result;
}

/**
 * Upgrade-specific exit-code remap: with a `--source` filter, winget reports
 * an installed-but-up-to-date package as NO_APPLICATIONS_FOUND ("No installed
 * package found matching input criteria") instead of UPDATE_NOT_APPLICABLE —
 * verified live (winget 1.28: 0x8A15002B without --source, 0x8A150014 with).
 * For an upgrade that is a no-op, not a failure. (For uninstall the same code
 * genuinely means "not installed" and stays a failure.)
 */
function remapUpgradeNotFound(result: WingetOperationResult): WingetOperationResult {
  if (
    !result.success &&
    !result.cancelled &&
    result.exitCode !== undefined &&
    toUnsignedHResult(result.exitCode) === NO_APPLICATIONS_FOUND
  ) {
    return {
      ...result,
      success: true,
      noop: true,
      message: "No applicable update",
      errorCode: undefined,
    };
  }
  return result;
}

/**
 * Portable packages modified after install refuse removal during upgrade or
 * uninstall ("Unable to remove Portable package as it has been modified; to
 * override this check use --force") — winget's printed guidance is --force.
 * Matched by the PORTABLE_UNINSTALL_FAILED exit code (locale-independent) or
 * the curated/raw message wording (English output).
 */
function isModifiedPortableFailure(result: WingetOperationResult): boolean {
  if (result.success || result.cancelled) return false;
  if (result.exitCode !== undefined && toUnsignedHResult(result.exitCode) === PORTABLE_UNINSTALL_FAILED) {
    return true;
  }
  const message = result.message ?? "";
  return /portable package/i.test(message) && /modified/i.test(message);
}

/**
 * Run an upgrade invocation normally; when it fails because a portable
 * package was modified after install, retry once with --force (the remedy
 * winget itself prints — an upgrade replaces the package either way). The
 * success message discloses the override. Uninstall deliberately does NOT
 * auto-force: forced removal deletes the user's modifications, so it runs
 * only after the runner's explicit confirmation prompt.
 */
async function executeWithForceRetry(
  argsFor: (extra: string[]) => string[],
  options: WingetExecutorOptions,
): Promise<WingetOperationResult> {
  const result = await executeOperation(argsFor([]), options);
  if (!isModifiedPortableFailure(result)) {
    return result;
  }
  const retried = await executeOperation(argsFor(["--force"]), options);
  if (retried.success && !retried.noop) {
    // Append rather than replace: a successful retry can carry its own
    // message (e.g. "Restart your PC to finish") that must stay visible.
    const disclosure = "modified portable package, used --force";
    return {
      ...retried,
      message: retried.message ? `${retried.message} (${disclosure})` : "Modified portable package, used --force",
    };
  }
  return retried;
}

async function upgradePackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  const result = await executeWithForceRetry(
    (extra) => withSource(["upgrade", ...EXACT_ID_FLAGS, id, ...UPGRADE_FLAGS, ...extra], source),
    options,
  );
  return remapUpgradeNotFound(result);
}

/**
 * `version` is required when multiple versions of the package are installed —
 * winget refuses an ambiguous uninstall ("Multiple versions of this package
 * are installed"). Callers pass the row's installed version in that case.
 * `force` overrides the modified-portable-package check; it is destructive
 * (deletes the user's modifications) and must be user-confirmed upstream.
 */
async function uninstallPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
  version?: string,
  force = false,
): Promise<WingetOperationResult> {
  const versionFlags = version ? ["--version", version] : [];
  const forceFlags = force ? ["--force"] : [];
  return executeOperation(
    withSource(["uninstall", ...EXACT_ID_FLAGS, id, ...versionFlags, ...UNINSTALL_FLAGS, ...forceFlags], source),
    options,
  );
}

async function repairPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  return executeWithElevationRetry(
    (flags) => withSource(["repair", ...EXACT_ID_FLAGS, id, ...flags], source),
    REPAIR_FLAGS,
    options,
  );
}

async function downloadInstaller(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  return executeOperation(withSource(["download", ...EXACT_ID_FLAGS, id, ...DOWNLOAD_FLAGS], source), options);
}

async function pinPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  return executeOperation(
    withSource(["pin", "add", ...EXACT_ID_FLAGS, id, "--blocking", ...BASE_FLAGS], source),
    options,
  );
}

async function unpinPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  return executeOperation(withSource(["pin", "remove", ...EXACT_ID_FLAGS, id, ...BASE_FLAGS], source), options);
}

async function exportPackages(
  outputPath: string,
  includeVersions: boolean,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  const args = ["export", "-o", outputPath, ...BASE_FLAGS];
  if (includeVersions) {
    args.push("--include-versions");
  }
  return executeOperation(args, options);
}

async function importPackages(
  inputPath: string,
  options: {
    ignoreUnavailable?: boolean;
    ignoreVersions?: boolean;
    noUpgrade?: boolean;
  } & WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  const args = ["import", "-i", inputPath, ...IMPORT_FLAGS];
  if (options.ignoreUnavailable) args.push("--ignore-unavailable");
  if (options.ignoreVersions) args.push("--ignore-versions");
  if (options.noUpgrade) args.push("--no-upgrade");
  return executeOperation(args, options);
}

export {
  isElevationFailure,
  isModifiedPortableFailure,
  remapUpgradeNotFound,
  downloadInstaller,
  exportPackages,
  fetchMutableData,
  importPackages,
  installPackage,
  installPackageVersion,
  isWingetAvailable,
  listInstalledPackages,
  listPinnedPackages,
  listUpgradePackages,
  pinPackage,
  repairPackage,
  searchAllPackages,
  showPackageDetails,
  showPackageVersions,
  uninstallPackage,
  unpinPackage,
  upgradePackage,
  type MutableData,
};
