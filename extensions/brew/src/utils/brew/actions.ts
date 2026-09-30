/**
 * Homebrew action utilities.
 *
 * Provides functions for installing, uninstalling, and upgrading packages.
 */

import { Cask, Formula, Nameable, PinKind, Pinnable } from "../types";
import { actionsLogger } from "../logger";
import { preferences } from "../preferences";
import { execBrew, execBrewJson } from "./commands";
import { execBrewWithProgress, ProgressCallback } from "./progress";
import { brewIdentifier, brewCaskOption, isCask } from "./helpers";
import { parseBrewDoctor, type DoctorReport } from "./doctor";
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
  await execBrew(`install ${brewCaskOption(installable)} ${identifier}`, { signal: cancel });
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
 * The environment every `--dry-run` preview runs under.
 *
 * `HOMEBREW_NO_AUTO_UPDATE` keeps a preview from triggering the first
 * `brew update` of the day — a read-only action must not mutate the tap.
 *
 * `HOMEBREW_NO_ENV_HINTS` is not cosmetic here: without it brew prints a
 * two-line "Disable this behaviour by setting …" hint on STDOUT, INSIDE the
 * dependents block (`upgrade.rb:597-605`), and the plan reads those words as
 * fourteen packages it would upgrade.
 */
const DRY_RUN_ENV = { HOMEBREW_NO_AUTO_UPDATE: "1", HOMEBREW_NO_ENV_HINTS: "1" };

/**
 * Ask Homebrew what installing a package WOULD do, without doing it.
 *
 * `--no-ask` collapses brew 7's ask-mode double print to one copy.
 */
export async function brewInstallDryRun(installable: Cask | Formula, cancel?: AbortSignal): Promise<ExecResult> {
  const identifier = brewIdentifier(installable);
  actionsLogger.log("Previewing install", { identifier, type: isCask(installable) ? "cask" : "formula" });
  return execBrew(`install --dry-run --no-ask ${brewCaskOption(installable)} ${identifier}`, {
    signal: cancel,
    env: DRY_RUN_ENV,
  });
}

/**
 * Ask Homebrew what upgrading would do, without doing it.
 *
 * With no `target` this is the whole machine. SLOW, and it hits the network:
 * brew resolves every outdated bottle's manifest to learn its download size
 * (`upgrade.rb:139`, a `Downloading bottle manifests` fetch). Never run the
 * untargeted form on view load — only from an explicit user action, with a
 * toast up before it starts.
 *
 * With a `target` it is the single-package form, built the way
 * `brewInstallDryRun` builds its command so a cask gets `--cask` and a tapped
 * formula keeps its qualified name (`steipete/tap/birdclaw`, which brew then
 * echoes verbatim in the row).
 *
 * Runs under `DRY_RUN_ENV` above, for the reasons documented there.
 *
 * Both streams are worth keeping: the table is stdout, while the manifest
 * region and the `Warning: …` blocks are stderr (`download_queue.rb:120,458`).
 * `parseUpgradeDryRun` accepts either, or the two concatenated.
 *
 * **Exit 1 is not always a failure here** — but it is narrow. See
 * `isBenignDryRunFailure`. A lock error still throws, converted upstream in
 * `execBrew` before it reaches here.
 */
/**
 * `ofail "<name> not installed"` (`cmd/upgrade.rb:419`), the one exit-1 outcome
 * a preview may present as an empty plan. `full_specified_name` may be
 * tap-qualified (`steipete/tap/birdclaw`), hence `\S+`.
 */
const NOT_INSTALLED_LINE = /^Error: \S+ not installed$/;

/**
 * Whether an exit-1 preview is one of the benign outcomes, or a refusal.
 *
 * Exit 1 comes from `Homebrew.failed` (`brew.rb:243`), which only `ofail` sets
 * (`utils/output.rb:117-121`), so every tolerated exit 1 has to be an `Error:`
 * line we recognise — and exactly one is:
 *
 * - **Not installed** — `ofail "<name> not installed"` (`cmd/upgrade.rb:419`).
 *   There is nothing to upgrade, and an empty plan says so honestly. Reachable
 *   by opening a preview, uninstalling elsewhere, then refreshing.
 * - **Pinned** — `ofail "Not upgrading <n> pinned package(s):"`
 *   (`cmd/upgrade.rb:471-476`, taken whenever the pinned formula was NAMED).
 *   That is brew refusing, not brew finding nothing, and swallowing it renders
 *   the green "Nothing to upgrade" state over a refusal. It rethrows, along
 *   with every other unrecognised exit 1, so the preview shows its failure page
 *   with brew's own message.
 *
 * The already-up-to-date case is `opoo` (`cmd/upgrade.rb:421`) — a `Warning:`
 * and exit 0 — so it never reaches here on its own; when it rides along with a
 * not-installed target in the same run, the warning is simply not an `Error:`
 * line and does not affect the verdict.
 */
function isBenignDryRunFailure(stderr: string): boolean {
  const errors = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("Error: "));
  return errors.length > 0 && errors.every((line) => NOT_INSTALLED_LINE.test(line));
}

export async function brewUpgradeDryRun(target?: Cask | Nameable, cancel?: AbortSignal): Promise<ExecResult> {
  const suffix = target ? ` ${brewCaskOption(target)} ${brewIdentifier(target)}` : "";
  actionsLogger.log(target ? "Previewing upgrade" : "Previewing upgrade of all outdated packages", {
    identifier: target ? brewIdentifier(target) : undefined,
  });
  try {
    return await execBrew(`upgrade --dry-run --no-ask${suffix}`, {
      signal: cancel,
      env: DRY_RUN_ENV,
    });
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === 1 && isBenignDryRunFailure(execErr.stderr ?? "")) {
      return { stdout: execErr.stdout ?? "", stderr: execErr.stderr ?? "" };
    }
    throw err;
  }
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
  await execBrew(`rm ${brewCaskOption(installable, true)}${forceOption} ${identifier}`, { signal: cancel });
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
  await execBrew(`upgrade ${brewCaskOption(upgradable)} ${identifier}`, { signal: cancel });
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
  await execBrew(cmd, { signal: cancel });
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
  await execBrew(cmd, { signal: cancel });
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
 * Run `brew doctor --json` and parse the report.
 *
 * Any finding sets `Homebrew.failed` (cmd/doctor.rb:72-73) BEFORE the JSON is
 * printed (:90-91), so the normal "there are problems" case is exit 1 with the
 * whole report on stdout — a catch, not a success. Exit 1 with nothing on
 * stdout (a lock error, a missing brew) is a real failure and rethrows.
 */
export async function brewDoctor(cancel?: AbortSignal): Promise<DoctorReport> {
  actionsLogger.log("Running brew doctor");
  const output = await execBrewJson("doctor --json", { signal: cancel });
  return parseBrewDoctor(output.stdout);
}
