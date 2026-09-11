/**
 * Homebrew action utilities.
 *
 * Provides functions for installing, uninstalling, and upgrading packages.
 */

import { Cask, Formula, Nameable, PinKind, Pinnable } from "../types";
import { actionsLogger } from "../logger";
import { preferences } from "../preferences";
import { execBrew } from "./commands";
import { execBrewWithProgress, ProgressCallback } from "./progress";
import { brewIdentifier, brewCaskOption, isCask } from "./helpers";
import { ExecError, ExecResult } from "../types";

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
    installable.installed = [{ version: installable.versions.stable, installed_on_request: true }];
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
    installable.installed = [{ version: installable.versions.stable, installed_on_request: true }];
  }
  actionsLogger.log("Package installed successfully", { identifier });
}

/**
 * Uninstall a package.
 */
export async function brewUninstall(installable: Cask | Nameable, cancel?: AbortSignal, force = false): Promise<void> {
  const identifier = brewIdentifier(installable);
  actionsLogger.log("Uninstalling package", {
    identifier,
    type: isCask(installable) ? "cask" : "formula",
    zap: preferences.zapCask,
    force,
  });
  // `--force` is what lets a pinned package be removed; it also drops the pin
  // (cask/uninstall.rb unpins first, uninstall.rb rm_pins after). Only ever set
  // from an explicit user confirmation.
  const forceOption = force ? " --force" : "";
  await execBrew(
    `rm ${brewCaskOption(installable, true)}${forceOption} ${identifier}`,
    cancel ? { signal: cancel } : undefined,
  );
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
): Promise<ExecResult> {
  const identifier = brewIdentifier(upgradable);
  actionsLogger.log("Upgrading package with progress", {
    identifier,
    type: isCask(upgradable) ? "cask" : "formula",
  });
  // Returned, not discarded: brew exits 0 after declining to upgrade, and only
  // its warning says so. See upgradeSkipReason.
  const result = await execBrewWithProgress(`upgrade ${brewCaskOption(upgradable)} ${identifier}`, onProgress, cancel);
  actionsLogger.log("Package upgrade finished", { identifier });
  return result;
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
 * `brew pin`/`unpin` resolve a bare name against both formulae and casks
 * (`cmd/pin.rb`: `named_args [:installed_formula, :installed_cask]`), so a token
 * installed as both is ambiguous. Always state which one we mean.
 *
 * The kind is passed in rather than sniffed. `isCask()` keys off `token`, which
 * brew omits from outdated casks; `normalizeOutdatedResults` synthesises one,
 * but an explicit kind does not depend on that having happened.
 */
export async function brewPin(item: Pinnable, kind: PinKind): Promise<boolean> {
  const identifier = brewIdentifier(item);
  actionsLogger.log("Pinning package", { identifier, type: kind });
  const output = await execBrew(`pin --${kind} ${identifier}`);
  item.pinned = true;
  actionsLogger.log("Package pinned successfully", { identifier });
  // A cask with `auto_updates true` is pinned, but Homebrew warns that the app
  // may still update itself (cmd/pin.rb). Read brew's own warning rather than
  // the payload's `auto_updates`: the outdated shapes do not carry that field,
  // so checking it would silently drop the warning in Show Upgrades.
  return /may update itself outside Homebrew/i.test(output.stderr ?? "");
}

/**
 * Unpin a package to allow upgrades.
 */
export async function brewUnpin(item: Pinnable, kind: PinKind): Promise<void> {
  const identifier = brewIdentifier(item);
  actionsLogger.log("Unpinning package", { identifier, type: kind });
  await execBrew(`unpin --${kind} ${identifier}`);
  item.pinned = false;
  actionsLogger.log("Package unpinned successfully", { identifier });
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
