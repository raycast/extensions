/**
 * Homebrew helper utilities.
 *
 * Provides utility functions for working with brew packages.
 */

import { join as path_join } from "path";
import { Cask, Formula, Nameable } from "../types";
import { preferences } from "../preferences";
import { brewPath, brewExecutable } from "./paths";
import { isOutdatedVersion, stripRevision } from "./version";

/// Type Guards

/**
 * Check if an item is a Cask (vs Formula).
 */
export function isCask(maybeCask: Cask | Nameable): maybeCask is Cask {
  return (maybeCask as Cask).token !== undefined;
}

/**
 * When a package was installed or last upgraded.
 *
 * Homebrew reports this per installed version (`installed[].time`) for formulae
 * and as `installed_time` for casks, both in unix *seconds*. Undefined for a
 * package that isn't installed, and while the fast `brew list --versions` path
 * is still the source — it doesn't carry timestamps.
 */
export function brewInstalledDate(item: Cask | Formula): Date | undefined {
  const seconds = isCask(item) ? item.installed_time : item.installed?.first()?.time;
  return seconds == undefined ? undefined : new Date(seconds * 1000);
}

/**
 * The version currently installed, or undefined if the package is not installed.
 */
export function brewInstalledVersion(item: Cask | Formula): string | undefined {
  return isCask(item) ? item.installed : item.installed?.first()?.version;
}

/**
 * Is a newer version available?
 *
 * Trusting `outdated` alone is not enough for a FORMULA. That flag is captured
 * by `brew info --json=v2 --installed` and cached, so it reports the state at
 * capture time — a formula that went out of date since reads as current. The
 * version comparison catches that, because the search index carries a freshly
 * downloaded `versions.stable` alongside the cached installed version.
 *
 * **Casks are left to Homebrew's own flag, deliberately.** A cask version can
 * be `latest`, or carry vendor syntax like `1.2.3,45678`, and an
 * `auto_updates` cask is never upgraded through brew at all. Homebrew encodes
 * that policy in `cask.outdated`; a string comparison does not, and would offer
 * an Upgrade that either does nothing or is wrong.
 */
export function brewIsOutdated(item: Cask | Formula): boolean {
  if (item.outdated) {
    return true;
  }

  if (isCask(item)) {
    // Homebrew's own rule for casks, which is inequality rather than ordering:
    // cask versions are vendor strings and are not orderable. The exclusions
    // are the ones brew itself only reports under `--greedy`, because it cannot
    // upgrade them meaningfully: `latest` has no version to compare, and an
    // auto-updating cask updates itself outside brew.
    if (!item.installed || !item.version || item.version === "latest" || item.auto_updates) {
      return false;
    }
    return item.installed !== item.version;
  }

  const stable = item.versions?.stable;

  // A formula can have several kegs installed. If ANY of them is the current
  // version there is nothing to upgrade, whichever one happens to be first.
  const installedVersions = (item.installed ?? []).map((keg) => keg.version);
  if (installedVersions.some((version) => stripRevision(version) === stable)) {
    return false;
  }

  return installedVersions.some((version) => isOutdatedVersion(version, stable, { stripRevision: true }));
}

/// Identifiers

/**
 * Get the identifier for a package (token for casks, name for formulae).
 */
export function brewIdentifier(item: Cask | Nameable): string {
  return isCask(item) ? item.token : item.name;
}

/**
 * Get the display name for a package.
 */
export function brewName(item: Cask | Nameable): string {
  if (isCask(item)) {
    return item.name && item.name[0] ? item.name[0] : "Unknown";
  } else {
    return item.name;
  }
}

/// Options

/**
 * Get the --cask option for brew commands if the item is a cask.
 * Optionally includes --zap for uninstall operations.
 */
export function brewCaskOption(maybeCask: Cask | Nameable, zappable = false): string {
  return isCask(maybeCask) ? "--cask" + (zappable && preferences.zapCask ? " --zap" : "") : "";
}

/// Installation Status

/**
 * Check if a package is installed.
 */
export function brewIsInstalled(installable: Cask | Formula): boolean {
  if (isCask(installable)) {
    return caskIsInstalled(installable);
  } else {
    return formulaIsInstalled(installable);
  }
}

function caskIsInstalled(cask: Cask): boolean {
  if (cask.installed) {
    return cask.installed.length > 0;
  }
  return false;
}

function formulaIsInstalled(formula: Formula): boolean {
  return formula.installed.length > 0;
}

/// Installation Paths

/**
 * Get the installation path for a package.
 */
export function brewInstallPath(installable: Cask | Formula): string {
  if (isCask(installable)) {
    return caskInstallPath(installable);
  } else {
    return formulaInstallPath(installable);
  }
}

function caskInstallPath(cask: Cask): string {
  // Casks are not updated as reliably, so we don't include the cask installed version here.
  const basePath = brewPath(path_join("Caskroom", cask.token));
  if (cask.installed) {
    return path_join(basePath, cask.installed);
  } else {
    return basePath;
  }
}

function formulaInstallPath(formula: Formula): string {
  const basePath = brewPath(path_join("Cellar", formula.name));
  const firstInstalled = formula.installed[0];
  if (firstInstalled) {
    return path_join(basePath, firstInstalled.version);
  } else {
    return basePath;
  }
}

/// Version Formatting

/**
 * Format the version string for display.
 */
export function brewFormatVersion(installable: Cask | Formula): string {
  if (isCask(installable)) {
    return caskFormatVersion(installable);
  } else {
    return formulaFormatVersion(installable);
  }
}

function caskFormatVersion(cask: Cask): string {
  if (!cask.installed) {
    return "";
  }

  let version = cask.installed;
  if (cask.outdated) {
    version += " (O)";
  }
  return version;
}

function formulaFormatVersion(formula: Formula): string {
  const installed_version = formula.installed[0];
  if (!installed_version) {
    return "";
  }

  let version = installed_version.version;
  let status = "";
  if (installed_version.installed_as_dependency) {
    status += "D";
  }
  if (formula.pinned) {
    status += "P";
  }
  if (formula.outdated) {
    status += "O";
  }
  if (status) {
    version += ` (${status})`;
  }
  return version;
}

/// Sorting

/**
 * Compare function for sorting search results.
 * Prioritizes exact matches over partial matches.
 */
export function brewCompare(lhs: string, rhs: string, target: string): number {
  const lhs_matches = lhs.toLowerCase().includes(target);
  const rhs_matches = rhs.toLowerCase().includes(target);
  if (lhs_matches && !rhs_matches) {
    return -1;
  } else if (rhs_matches && !lhs_matches) {
    return 1;
  } else {
    return lhs.localeCompare(rhs);
  }
}

/// Command Strings

/**
 * Get the brew install command string for a package.
 */
export function brewInstallCommand(installable: Cask | Formula | Nameable): string {
  const identifier = brewIdentifier(installable);
  return `${brewExecutable()} install ${brewCaskOption(installable)} ${identifier}`.replace(/ +/g, " ");
}

/**
 * Get the brew adopt command string for a package.
 * Runs `brew install --adopt` to reclaim an existing externally-installed package.
 */
export function brewAdoptCommand(installable: Cask | Formula | Nameable): string {
  const identifier = brewIdentifier(installable);
  return `${brewExecutable()} install --adopt ${brewCaskOption(installable)} ${identifier}`.replace(/ +/g, " ");
}

/**
 * Get the brew uninstall command string for a package.
 */
export function brewUninstallCommand(installable: Cask | Formula | Nameable): string {
  const identifier = brewIdentifier(installable);
  return `${brewExecutable()} uninstall ${brewCaskOption(installable, true)} ${identifier}`.replace(/ +/g, " ");
}

/**
 * Get the brew upgrade command string for a package.
 */
export function brewUpgradeCommand(upgradable: Cask | Formula | Nameable): string {
  const identifier = brewIdentifier(upgradable);
  return `${brewExecutable()} upgrade ${brewCaskOption(upgradable)} ${identifier}`.replace(/ +/g, " ");
}
