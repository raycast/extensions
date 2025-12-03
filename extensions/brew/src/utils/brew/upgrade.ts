/**
 * Homebrew upgrade utilities with progress tracking.
 *
 * Provides functions for upgrading packages with detailed progress updates.
 */

import { Cask, Nameable, OutdatedCask, OutdatedFormula } from "../types";
import { actionsLogger } from "../logger";
import { execBrewWithProgress, ProgressCallback, BrewProgress } from "./progress";
import { brewIdentifier, brewCaskOption, isCask } from "./helpers";
import { formatCount } from "../text";

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
 * Upgrade all outdated packages with progress tracking.
 *
 * @param greedy - Include auto-updating casks
 * @param onProgress - Callback for progress updates
 * @param cancel - AbortController for cancellation
 * @returns Result of the upgrade operation
 */
export async function brewUpgradeWithProgress(
  greedy: boolean,
  onProgress?: UpgradeProgressCallback,
  cancel?: AbortController,
): Promise<UpgradeResult> {
  const steps: UpgradeStep[] = [];
  let outputLog = "";

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
        onProgress?.(steps, outputLog);
      },
      cancel,
    );
    updateStep.status = "completed";
    updateStep.endTime = Date.now();
    onProgress?.(steps, outputLog);
  } catch (error) {
    updateStep.status = "failed";
    updateStep.endTime = Date.now();
    updateStep.message = error instanceof Error ? error.message : String(error);
    return { success: false, steps, error: error instanceof Error ? error : new Error(String(error)) };
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
    const result = await execBrewWithProgress(cmd, undefined, cancel);
    outdated = JSON.parse(result.stdout);
    checkStep.status = "completed";
    checkStep.endTime = Date.now();
    checkStep.message = `Found ${formatCount(outdated.formulae.length, "formula", "formulae")} and ${formatCount(outdated.casks.length, "cask")}`;
    onProgress?.(steps, outputLog);
  } catch (error) {
    checkStep.status = "failed";
    checkStep.endTime = Date.now();
    checkStep.message = error instanceof Error ? error.message : String(error);
    return { success: false, steps, error: error instanceof Error ? error : new Error(String(error)) };
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
  });

  // Upgrade each package
  for (let i = 0; i < packageSteps.length; i++) {
    // Check for cancellation
    if (cancel?.signal.aborted) {
      // Mark remaining as skipped
      for (let j = i; j < packageSteps.length; j++) {
        packageSteps[j].status = "skipped";
      }
      onProgress?.(steps, outputLog);
      break;
    }

    const step = packageSteps[i];
    step.status = "running";
    step.startTime = Date.now();
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
          outputLog += progress.message + "\n";
          onProgress?.(steps, outputLog);
        },
        cancel,
      );

      step.status = "completed";
      step.endTime = Date.now();
      step.message = "Upgraded successfully";
      actionsLogger.log("Package upgraded", { identifier: packageName });
    } catch (error) {
      step.status = "failed";
      step.endTime = Date.now();
      step.message = error instanceof Error ? error.message : String(error);
      actionsLogger.error("Package upgrade failed", {
        identifier: packageName,
        error: step.message,
      });
    }

    onProgress?.(steps, outputLog);
  }

  const failedSteps = steps.filter((s) => s.status === "failed");
  const result: UpgradeResult = {
    success: failedSteps.length === 0,
    steps,
    error: failedSteps.length > 0 ? new Error(`${failedSteps.length} package(s) failed to upgrade`) : undefined,
  };

  actionsLogger.log("Batch upgrade completed", {
    success: result.success,
    completed: steps.filter((s) => s.status === "completed").length,
    failed: failedSteps.length,
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
  cancel?: AbortController,
): Promise<void> {
  const identifier = brewIdentifier(upgradable);
  actionsLogger.log("Upgrading package with progress", {
    identifier,
    type: isCask(upgradable) ? "cask" : "formula",
  });
  await execBrewWithProgress(`upgrade ${brewCaskOption(upgradable)} ${identifier}`, onProgress, cancel);
  actionsLogger.log("Package upgraded successfully", { identifier });
}
