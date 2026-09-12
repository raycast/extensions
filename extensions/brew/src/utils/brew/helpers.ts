/**
 * Homebrew helper utilities.
 *
 * Provides utility functions for working with brew packages.
 */

import { readdir } from "fs/promises";
import { join as path_join } from "path";
import { Cask, Formula, Nameable, OutdatedResults } from "../types";
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
 * package that isn't installed, and for a search result not yet joined with
 * local installed state.
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
    // A Cask's `name` is an array of display names, but an OutdatedCask's is a
    // plain string — and both are casks as far as `isCask` is concerned. Indexing
    // blindly would return the first CHARACTER of an outdated cask's name.
    const name = item.name as string | string[];
    if (typeof name === "string") {
      return name || "Unknown";
    }
    return name?.[0] ?? "Unknown";
  } else {
    return item.name;
  }
}

/**
 * `brew outdated --json=v2` reports casks by `name` with no `token`, but
 * `isCask()` — and so `brewCaskOption`, `brewIdentifier` and every argv built
 * from them — keys off `token`. An un-normalized outdated cask is therefore
 * indistinguishable from a formula and gets formula-shaped brew commands.
 *
 * Every path that parses that payload, and every path that reads a cached one,
 * must pass it through here first. Idempotent, and safe on data cached before
 * the field existed.
 */
export function normalizeOutdatedResults(results: OutdatedResults): OutdatedResults {
  for (const cask of results.casks ?? []) {
    if (!cask.token) {
      cask.token = cask.name;
    }
  }
  return results;
}

/**
 * The pin state Homebrew itself holds, read from disk.
 *
 * A pin is a symlink under `var/homebrew/pinned` (formulae) or
 * `var/homebrew/pinned_casks` (casks), created by `brew pin` and removed by
 * `brew unpin`, so a package pinned in another command or outside Raycast
 * appears here immediately. This is a directory snapshot, not brew's own
 * predicate — it checks the symlink (formula_pin.rb) and, for a cask, that its
 * target still exists (cask.rb).
 *
 * Cached payloads carry a `pinned` flag that is only as fresh as the last
 * fetch, which is fine for rendering but not for deciding whether to run a
 * command Homebrew will refuse. Reading both directories measures ~20µs, about
 * 30,000x cheaper than `brew list --pinned` (~650ms), so the authoritative
 * check is affordable immediately before an operation — and once per batch,
 * not once per package.
 *
 * Absent directories mean nothing is pinned: `unpin` removes the directory
 * when it empties.
 */
/**
 * The key a pin is stored under, which is NOT always the identifier brew wants
 * on the command line.
 *
 * Homebrew pins a formula at `HOMEBREW_PINNED_KEGS/<formula.name>` — the short
 * name (formula_pin.rb) — while `brew outdated --json=v2` reports a tapped
 * formula by its qualified `full_name`. Looking a pin up by the qualified name
 * therefore misses every tapped formula.
 *
 * Cask tokens are already unqualified in the outdated payload, so the last
 * segment is correct for both kinds. Use this for pin lookups only — argv keeps
 * the full identifier.
 */
export function pinLookupKey(identifier: string): string {
  return identifier.split("/").pop() || identifier;
}

/**
 * Whether Homebrew has this package pinned, given a set read from disk.
 *
 * Keys by the short name (see pinLookupKey) and picks the right directory —
 * the two rules every caller needs, in one place.
 */
export function isPinnedPackage(
  pins: { formulae: Set<string>; casks: Set<string> },
  identifier: string,
  isCask: boolean,
): boolean {
  const key = pinLookupKey(identifier);
  return isCask ? pins.casks.has(key) : pins.formulae.has(key);
}

export async function brewPinnedIdentifiers(): Promise<{ formulae: Set<string>; casks: Set<string> }> {
  const read = async (dir: string): Promise<Set<string>> => {
    try {
      return new Set(await readdir(brewPath(path_join("var/homebrew", dir))));
    } catch (err) {
      // An absent directory means nothing of that kind is pinned: `unpin`
      // removes it when it empties. Anything else — a permission problem, a
      // broken prefix — is NOT evidence of that, and treating it as such would
      // hand a pinned package to a command brew refuses. Fail loudly instead.
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
        return new Set();
      }
      throw err;
    }
  };
  const [formulae, casks] = await Promise.all([read("pinned"), read("pinned_casks")]);
  return { formulae, casks };
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
  let status = "";
  if (cask.pinned) {
    status += "P";
  }
  if (cask.outdated) {
    status += "O";
  }
  if (status) {
    version += ` (${status})`;
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
  if (!installed_version.installed_on_request) {
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
