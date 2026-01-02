/**
 * Homebrew upgrade utilities with progress tracking.
 *
 * Provides functions for upgrading packages with detailed progress updates.
 *
 * Note: Homebrew does NOT support concurrent `brew upgrade` commands.
 * Running multiple upgrade processes simultaneously causes lock errors.
 * However, Homebrew 5.0 supports concurrent downloads via HOMEBREW_DOWNLOAD_CONCURRENCY.
 *
 * Strategy for faster upgrades:
 * 1. Pre-fetch all packages concurrently using `brew fetch`
 * 2. Upgrade packages sequentially (avoiding lock conflicts)
 * 3. Continue with remaining packages when one fails
 */

import { Cask, Nameable, OutdatedCask, OutdatedFormula } from "../types";
import { actionsLogger } from "../logger";
import { execBrewWithProgress, ProgressCallback, BrewProgress, DEFAULT_STALE_TIMEOUT_MS } from "./progress";
import { brewIdentifier, brewCaskOption, isCask } from "./helpers";
import { formatCount } from "../text";
import { isRecoverableError, getErrorMessage, StaleProcessError, BrewLockError } from "../errors";
import { preferences } from "../preferences";

/// Upgrade Types

/**
 * Status of an upgrade step.
 */
export type UpgradeStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

/**
 * Information about a single upgrade step.
 */
export interface UpgradeStep {
  id: string;
  title: string;
  subtitle?: string;
  status: UpgradeStepStatus;
  message?: string;
  startTime?: number;
  endTime?: number;
  progress?: BrewProgress;
  /** Error that caused the step to fail */
  error?: Error;
  /** Whether the error is recoverable (can be retried) */
  isRecoverable?: boolean;
  /** Current phase within the step (for detailed progress) */
  currentPhase?: string;
}

/**
 * Callback for upgrade progress updates.
 */
export type UpgradeProgressCallback = (steps: UpgradeStep[], output?: string) => void;

/**
 * Result of an upgrade operation.
 */
export interface UpgradeResult {
  success: boolean;
  steps: UpgradeStep[];
  error?: Error;
}

/**
 * Options for the upgrade operation.
 */
export interface UpgradeOptions {
  /** Include auto-updating casks */
  greedy?: boolean;
  /** Pre-fetch all packages before upgrading (uses Homebrew 5.0 concurrent downloads) */
  prefetch?: boolean;
  /** Continue upgrading remaining packages if one fails */
  continueOnError?: boolean;
  /** Timeout for stale process detection (ms) */
  staleTimeoutMs?: number;
}

/**
 * Upgrade all outdated packages with progress tracking.
 *
 * Features:
 * - Optional pre-fetching with Homebrew 5.0 concurrent downloads
 * - Detailed per-phase progress tracking
 * - Stale process detection and timeout handling
 * - Continue upgrading remaining packages when one fails
 * - Recoverable error detection for retry suggestions
 *
 * @param greedy - Include auto-updating casks (legacy parameter)
 * @param onProgress - Callback for progress updates
 * @param cancel - AbortSignal for cancellation
 * @param options - Additional upgrade options
 * @returns Result of the upgrade operation
 */
export async function brewUpgradeWithProgress(
  greedy: boolean,
  onProgress?: UpgradeProgressCallback,
  cancel?: AbortSignal,
  options?: Omit<UpgradeOptions, "greedy">,
): Promise<UpgradeResult> {
  const steps: UpgradeStep[] = [];
  let outputLog = "";
  const prefetch = options?.prefetch ?? true; // Default to pre-fetching
  const continueOnError = options?.continueOnError ?? true; // Default to continuing
  const staleTimeoutMs = options?.staleTimeoutMs ?? DEFAULT_STALE_TIMEOUT_MS;
  const verboseLogging = preferences.verboseLogging ?? false;

  // Step 1: Update brew
  const updateStep: UpgradeStep = {
    id: "update",
    title: "Updating Homebrew",
    status: "running",
    startTime: Date.now(),
  };
  steps.push(updateStep);
  onProgress?.(steps, outputLog);

  try {
    await execBrewWithProgress(
      "update",
      (progress) => {
        updateStep.message = progress.message;
        updateStep.currentPhase = progress.phase;
        onProgress?.(steps, outputLog);
      },
      cancel,
      { staleTimeoutMs, verboseLogging },
    );
    updateStep.status = "completed";
    updateStep.endTime = Date.now();
    onProgress?.(steps, outputLog);
  } catch (error) {
    updateStep.status = "failed";
    updateStep.endTime = Date.now();
    updateStep.error = error instanceof Error ? error : new Error(String(error));
    updateStep.message = getErrorMessage(error);
    updateStep.isRecoverable = isRecoverableError(error);
    actionsLogger.error("Homebrew update failed", {
      error: updateStep.message,
      isRecoverable: updateStep.isRecoverable,
    });
    return { success: false, steps, error: updateStep.error };
  }

  // Step 2: Check for outdated packages
  const checkStep: UpgradeStep = {
    id: "check",
    title: "Checking for outdated packages",
    status: "running",
    startTime: Date.now(),
  };
  steps.push(checkStep);
  onProgress?.(steps, outputLog);

  let outdated: { formulae: OutdatedFormula[]; casks: OutdatedCask[] };
  try {
    // Skip the update since we just did it - call outdated directly
    let cmd = "outdated --json=v2";
    if (greedy) {
      cmd += " --greedy";
    }
    const result = await execBrewWithProgress(cmd, undefined, cancel, { staleTimeoutMs, verboseLogging });
    outdated = JSON.parse(result.stdout);
    checkStep.status = "completed";
    checkStep.endTime = Date.now();
    checkStep.message = `Found ${formatCount(outdated.formulae.length, "formula", "formulae")} and ${formatCount(outdated.casks.length, "cask")}`;
    onProgress?.(steps, outputLog);
  } catch (error) {
    checkStep.status = "failed";
    checkStep.endTime = Date.now();
    checkStep.error = error instanceof Error ? error : new Error(String(error));
    checkStep.message = getErrorMessage(error);
    checkStep.isRecoverable = isRecoverableError(error);
    return { success: false, steps, error: checkStep.error };
  }

  // If nothing to upgrade, we're done
  if (outdated.formulae.length === 0 && outdated.casks.length === 0) {
    actionsLogger.log("No packages to upgrade");
    return { success: true, steps };
  }

  // Create steps for each package
  const packageSteps: UpgradeStep[] = [
    ...outdated.formulae.map((f) => ({
      id: `formula-${f.name}`,
      title: f.name,
      subtitle: `${f.installed_versions[0] || "?"} → ${f.current_version}`,
      status: "pending" as UpgradeStepStatus,
    })),
    ...outdated.casks.map((c) => ({
      id: `cask-${c.name}`,
      title: c.name,
      subtitle: `${c.installed_versions} → ${c.current_version}`,
      status: "pending" as UpgradeStepStatus,
    })),
  ];
  steps.push(...packageSteps);
  onProgress?.(steps, outputLog);

  actionsLogger.log("Starting batch upgrade", {
    totalPackages: packageSteps.length,
    formulae: outdated.formulae.length,
    casks: outdated.casks.length,
    prefetch,
    continueOnError,
  });

  // Step 3 (optional): Pre-fetch all packages concurrently
  // This leverages Homebrew 5.0's HOMEBREW_DOWNLOAD_CONCURRENCY for parallel downloads
  if (prefetch && packageSteps.length > 1) {
    const fetchStep: UpgradeStep = {
      id: "fetch",
      title: "Pre-fetching downloads",
      subtitle: `${packageSteps.length} packages`,
      status: "running",
      startTime: Date.now(),
    };
    // Insert after check step, before package steps
    const insertIndex = steps.indexOf(checkStep) + 1;
    steps.splice(insertIndex, 0, fetchStep);
    onProgress?.(steps, outputLog);

    try {
      // Build fetch command with all packages
      const formulaNames = outdated.formulae.map((f) => f.name);
      const caskNames = outdated.casks.map((c) => `--cask ${c.name}`);
      const allPackages = [...formulaNames, ...caskNames.map((c) => c.split(" ")[1])];

      // Fetch formulae and casks separately (brew fetch syntax)
      if (formulaNames.length > 0) {
        fetchStep.message = `Fetching ${formulaNames.length} formulae...`;
        fetchStep.currentPhase = "downloading";
        onProgress?.(steps, outputLog);

        await execBrewWithProgress(
          `fetch ${formulaNames.join(" ")}`,
          (progress) => {
            fetchStep.message = progress.message;
            fetchStep.currentPhase = progress.phase;
            outputLog += progress.message + "\n";
            onProgress?.(steps, outputLog);
          },
          cancel,
          { staleTimeoutMs, verboseLogging },
        );
      }

      if (outdated.casks.length > 0) {
        fetchStep.message = `Fetching ${outdated.casks.length} casks...`;
        fetchStep.currentPhase = "downloading";
        onProgress?.(steps, outputLog);

        await execBrewWithProgress(
          `fetch --cask ${outdated.casks.map((c) => c.name).join(" ")}`,
          (progress) => {
            fetchStep.message = progress.message;
            fetchStep.currentPhase = progress.phase;
            outputLog += progress.message + "\n";
            onProgress?.(steps, outputLog);
          },
          cancel,
          { staleTimeoutMs, verboseLogging },
        );
      }

      fetchStep.status = "completed";
      fetchStep.endTime = Date.now();
      fetchStep.message = `Pre-fetched ${allPackages.length} packages`;
      actionsLogger.log("Pre-fetch completed", { packages: allPackages.length });
    } catch (error) {
      // Pre-fetch failure is not fatal - we can still try to upgrade
      fetchStep.status = "failed";
      fetchStep.endTime = Date.now();
      fetchStep.error = error instanceof Error ? error : new Error(String(error));
      fetchStep.message = `Pre-fetch failed: ${getErrorMessage(error)}`;
      fetchStep.isRecoverable = true; // Always recoverable since we can still upgrade
      actionsLogger.warn("Pre-fetch failed, continuing with upgrades", {
        error: fetchStep.message,
      });
    }
    onProgress?.(steps, outputLog);
  }

  // Step 4: Upgrade each package sequentially
  // Note: We MUST upgrade sequentially because Homebrew doesn't support concurrent upgrades
  let hasLockError = false;

  for (let i = 0; i < packageSteps.length; i++) {
    // Check for cancellation
    if (cancel?.aborted) {
      const remainingCount = packageSteps.length - i;
      actionsLogger.log("Upgrade cancelled by user", {
        completedPackages: i,
        remainingPackages: remainingCount,
        totalPackages: packageSteps.length,
      });
      // Mark remaining as skipped
      for (let j = i; j < packageSteps.length; j++) {
        packageSteps[j].status = "skipped";
        packageSteps[j].message = "Cancelled by user";
      }
      onProgress?.(steps, outputLog);
      break;
    }

    // If we hit a lock error, skip remaining packages
    if (hasLockError) {
      packageSteps[i].status = "skipped";
      packageSteps[i].message = "Skipped due to brew lock error";
      onProgress?.(steps, outputLog);
      continue;
    }

    const step = packageSteps[i];
    step.status = "running";
    step.startTime = Date.now();
    step.currentPhase = "starting";
    onProgress?.(steps, outputLog);

    const isCaskPackage = step.id.startsWith("cask-");
    const packageName = step.id.replace(/^(formula|cask)-/, "");

    try {
      const caskOption = isCaskPackage ? "--cask" : "";
      const cmd = `upgrade ${caskOption} ${packageName}`.trim();

      await execBrewWithProgress(
        cmd,
        (progress) => {
          step.message = progress.message;
          step.progress = progress;
          step.currentPhase = progress.phase;
          outputLog += progress.message + "\n";
          onProgress?.(steps, outputLog);
        },
        cancel,
        { staleTimeoutMs, packageName, verboseLogging },
      );

      step.status = "completed";
      step.endTime = Date.now();
      step.message = "Upgraded successfully";
      actionsLogger.log("Package upgraded", { identifier: packageName });
    } catch (error) {
      step.status = "failed";
      step.endTime = Date.now();
      step.error = error instanceof Error ? error : new Error(String(error));
      step.message = getErrorMessage(error);
      step.isRecoverable = isRecoverableError(error);

      actionsLogger.error("Package upgrade failed", {
        identifier: packageName,
        error: step.message,
        errorType: error instanceof Error ? error.name : "unknown",
        isRecoverable: step.isRecoverable,
        currentPhase: step.currentPhase,
      });

      // Check if this is a lock error - if so, we should stop
      if (error instanceof BrewLockError) {
        hasLockError = true;
        actionsLogger.warn("Lock error detected, skipping remaining packages");
      }

      // Check if this is a stale process error
      if (error instanceof StaleProcessError) {
        actionsLogger.warn("Stale process detected", {
          packageName,
          lastPhase: (error as StaleProcessError).lastPhase,
          staleDurationMs: (error as StaleProcessError).staleDurationMs,
        });
      }

      // If continueOnError is false, stop here
      if (!continueOnError) {
        // Mark remaining as skipped
        for (let j = i + 1; j < packageSteps.length; j++) {
          packageSteps[j].status = "skipped";
          packageSteps[j].message = "Skipped due to previous error";
        }
        onProgress?.(steps, outputLog);
        break;
      }
    }

    onProgress?.(steps, outputLog);
  }

  const failedSteps = steps.filter((s) => s.status === "failed");
  const recoverableFailures = failedSteps.filter((s) => s.isRecoverable);
  const result: UpgradeResult = {
    success: failedSteps.length === 0,
    steps,
    error: failedSteps.length > 0 ? new Error(`${failedSteps.length} package(s) failed to upgrade`) : undefined,
  };

  actionsLogger.log("Batch upgrade completed", {
    success: result.success,
    completed: steps.filter((s) => s.status === "completed").length,
    failed: failedSteps.length,
    recoverableFailures: recoverableFailures.length,
    skipped: steps.filter((s) => s.status === "skipped").length,
  });

  return result;
}

/**
 * Upgrade a single package with progress tracking.
 */
export async function brewUpgradeSingleWithProgress(
  upgradable: Cask | Nameable,
  onProgress?: ProgressCallback,
  cancel?: AbortSignal,
): Promise<void> {
  const identifier = brewIdentifier(upgradable);
  actionsLogger.log("Upgrading package with progress", {
    identifier,
    type: isCask(upgradable) ? "cask" : "formula",
  });
  await execBrewWithProgress(`upgrade ${brewCaskOption(upgradable)} ${identifier}`, onProgress, cancel);
  actionsLogger.log("Package upgraded successfully", { identifier });
}
