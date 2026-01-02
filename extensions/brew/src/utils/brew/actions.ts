/**
 * Homebrew action utilities.
 *
 * Provides functions for installing, uninstalling, and upgrading packages.
 */

import { Cask, Formula, Nameable, OutdatedFormula } from "../types";
import { actionsLogger } from "../logger";
import { preferences } from "../preferences";
import { execBrew } from "./commands";
import { execBrewWithProgress, ProgressCallback } from "./progress";
import { brewIdentifier, brewCaskOption, isCask } from "./helpers";
import { ExecError } from "../types";

/**
 * Install a package.
 */
export async function brewInstall(installable: Cask | Formula, cancel?: AbortSignal): Promise<void> {
  const identifier = brewIdentifier(installable);
  const isCaskType = isCask(installable);
  actionsLogger.log("Installing package", {
    identifier,
    type: isCaskType ? "cask" : "formula",
  });
  await execBrew(`install ${brewCaskOption(installable)} ${identifier}`, cancel ? { signal: cancel } : undefined);
  if (isCaskType) {
    (installable as Cask).installed = (installable as Cask).version;
  } else {
    installable.installed = [
      { version: installable.versions.stable, installed_as_dependency: false, installed_on_request: true },
    ];
  }
  actionsLogger.log("Package installed successfully", { identifier });
}

/**
 * Install a package with real-time progress updates.
 */
export async function brewInstallWithProgress(
  installable: Cask | Formula,
  onProgress?: ProgressCallback,
  cancel?: AbortSignal,
): Promise<void> {
  const identifier = brewIdentifier(installable);
  const isCaskType = isCask(installable);
  actionsLogger.log("Installing package with progress", {
    identifier,
    type: isCaskType ? "cask" : "formula",
  });
  await execBrewWithProgress(`install ${brewCaskOption(installable)} ${identifier}`, onProgress, cancel);
  if (isCaskType) {
    (installable as Cask).installed = (installable as Cask).version;
  } else {
    installable.installed = [
      { version: installable.versions.stable, installed_as_dependency: false, installed_on_request: true },
    ];
  }
  actionsLogger.log("Package installed successfully", { identifier });
}

/**
 * Uninstall a package.
 */
export async function brewUninstall(installable: Cask | Nameable, cancel?: AbortSignal): Promise<void> {
  const identifier = brewIdentifier(installable);
  actionsLogger.log("Uninstalling package", {
    identifier,
    type: isCask(installable) ? "cask" : "formula",
    zap: preferences.zapCask,
  });
  await execBrew(`rm ${brewCaskOption(installable, true)} ${identifier}`, cancel ? { signal: cancel } : undefined);
  actionsLogger.log("Package uninstalled successfully", { identifier });
}

/**
 * Upgrade a package.
 */
export async function brewUpgrade(upgradable: Cask | Nameable, cancel?: AbortSignal): Promise<void> {
  const identifier = brewIdentifier(upgradable);
  actionsLogger.log("Upgrading package", {
    identifier,
    type: isCask(upgradable) ? "cask" : "formula",
  });
  await execBrew(`upgrade ${brewCaskOption(upgradable)} ${identifier}`, cancel ? { signal: cancel } : undefined);
  actionsLogger.log("Package upgraded successfully", { identifier });
}

/**
 * Upgrade a package with real-time progress updates.
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

/**
 * Upgrade all packages.
 */
export async function brewUpgradeAll(greedy: boolean, cancel?: AbortSignal): Promise<void> {
  actionsLogger.log("Upgrading all packages", { greedy });
  let cmd = `upgrade`;
  if (greedy) {
    cmd += " --greedy";
  }
  await execBrew(cmd, cancel ? { signal: cancel } : undefined);
  actionsLogger.log("All packages upgraded successfully");
}

/**
 * Run cleanup to remove old versions.
 */
export async function brewCleanup(withoutThreshold: boolean, cancel?: AbortSignal): Promise<void> {
  actionsLogger.log("Running cleanup", { pruneAll: withoutThreshold });
  let cmd = `cleanup`;
  if (withoutThreshold) {
    cmd += " --prune=all";
  }
  await execBrew(cmd, cancel ? { signal: cancel } : undefined);
  actionsLogger.log("Cleanup completed successfully");
}

/**
 * Pin a formula to prevent upgrades.
 */
export async function brewPinFormula(formula: Formula | OutdatedFormula): Promise<void> {
  actionsLogger.log("Pinning formula", { name: formula.name });
  await execBrew(`pin ${formula.name}`);
  formula.pinned = true;
  actionsLogger.log("Formula pinned successfully", { name: formula.name });
}

/**
 * Unpin a formula to allow upgrades.
 */
export async function brewUnpinFormula(formula: Formula | OutdatedFormula): Promise<void> {
  actionsLogger.log("Unpinning formula", { name: formula.name });
  await execBrew(`unpin ${formula.name}`);
  formula.pinned = false;
  actionsLogger.log("Formula unpinned successfully", { name: formula.name });
}

/**
 * Run brew doctor to check for issues.
 */
export async function brewDoctor(): Promise<string> {
  try {
    const output = await execBrew(`doctor`);
    return output.stdout;
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1) {
      return execErr.stderr;
    } else {
      return `${err}`;
    }
  }
}
