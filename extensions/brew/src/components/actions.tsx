import { Action, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { useBrewDependencies } from "../hooks/useBrewDependencies";
import {
  type BrewProgress,
  brewInstallWithProgress,
  brewName,
  brewIdentifier,
  brewPinnedIdentifiers,
  isPinnedPackage,
  isCask,
  brewPin,
  brewUninstall,
  brewUnpin,
  brewUpgradeAll,
  brewCheckForUpdate,
  brewInstalledVersion,
  brewAvailableVersion,
  brewIsOutdated,
  brewUpgradeSingleWithProgress,
  brewCaskLinkPreview,
  type CaskLinkVerb,
  confirmAndRun,
  formatCount,
  type Cask,
  ensureError,
  isPinnedRefusal,
  upgradeSkipReason,
  type Formula,
  type Nameable,
  type PinKind,
  type Pinnable,
  preferences,
  showActionToast,
  showBrewFailureToast,
  copyLogsAction,
} from "../utils";

/**
 * Read Homebrew's pin state, reporting a read failure rather than throwing past
 * the caller's error handling.
 *
 * `brewPinnedIdentifiers` deliberately throws on anything but a missing
 * directory: an unreadable pin directory is not evidence that nothing is
 * pinned. But these reads happen BEFORE the try/catch that owns an action's
 * failure toast, so an escaping error rejected the action callback with no HUD
 * and no diagnostic. Fail closed and say so — running the command anyway could
 * hand a pinned package to a brew that refuses it.
 */
async function readPins(operation: string): Promise<{ formulae: Set<string>; casks: Set<string> } | undefined> {
  try {
    return await brewPinnedIdentifiers();
  } catch (err) {
    showBrewFailureToast(`${operation} failed`, ensureError(err));
    return undefined;
  }
}

export function FormulaInstallAction(props: {
  formula: Cask | Formula;
  /**
   * Overrides the bare "Install". A panel whose selection is NOT what gets
   * installed — the install preview, where the cursor sits on a dependency row
   * — passes "Install <name>" so the scope is not left to the cursor.
   */
  title?: string;
  onAction: (result: boolean) => void;
}) {
  // TD: Support installing other versions?
  return (
    <Action
      title={props.title ?? "Install"}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      onAction={async () => {
        props.onAction(await install(props.formula));
      }}
    />
  );
}

export function FormulaUninstallAction(props: {
  formula: Cask | Nameable;
  /**
   * Effective pin state, when the caller tracks it live. The payload's own
   * `pinned` can be a stale snapshot from an in-flight fetch, so a view that
   * knows better says so rather than letting a guard read the stale value.
   */
  pinned?: boolean;
  onAction: (result: boolean) => void;
}) {
  return (
    <Action
      title="Uninstall"
      icon={Icon.Trash}
      shortcut={Keyboard.Shortcut.Common.Remove}
      style={Action.Style.Destructive}
      onAction={async () => {
        const result = await uninstall(props.formula, false, props.pinned, props.onAction);
        props.onAction(result);
      }}
    />
  );
}

/**
 * Upgrade a single package.
 *
 * `brew upgrade` refuses a PINNED package outright — "Error: Not upgrading 1
 * pinned package" — so the action never simply attempts one.
 *
 * Where the caller tracks per-package status (the upgrade run), it stays a
 * skip: a row that reports "skipped" should not quietly unpin itself. Elsewhere
 * (Search, Show Installed) the only sensible reading of pressing Upgrade on a
 * pinned row is "do the thing" — so the action says "Unpin and Upgrade" and
 * does both, rather than refusing and naming a shortcut to press instead.
 */
export function FormulaUpgradeAction(props: {
  formula: Cask | Nameable;
  /** Called when the upgrade starts, e.g. to show progress */
  onStart?: () => void;
  /**
   * Called instead of running the upgrade when the formula is pinned, so a view
   * that tracks per-package status can mark the row as skipped. Views that show
   * no status (Search, Show Installed) leave it undefined and rely on the toast.
   */
  onSkip?: () => void;
  /** Effective pin state, when the caller tracks it live. See FormulaUninstallAction. */
  pinned?: boolean;
  onAction: (result: boolean) => void;
}) {
  const pinned = props.pinned ?? isPinned(props.formula);
  const cask = isCask(props.formula);
  const unpinAndUpgrade = pinned && !props.onSkip;
  // Name the package: this action sits beside "Upgrade All" in the same panel,
  // so "Upgrade" alone leaves the scope of what is about to run ambiguous.
  const name = brewName(props.formula);

  return (
    <Action
      title={unpinAndUpgrade ? `Unpin ${cask ? "Cask" : "Formula"} and Upgrade ${name}` : `Upgrade ${name}`}
      icon={unpinAndUpgrade ? Icon.TackDisabled : Icon.ArrowUpCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      onAction={async () => {
        const result = await upgradeChecked(props.formula, {
          allowUnpin: unpinAndUpgrade,
          onStart: props.onStart,
        });
        if (result.outcome === "skipped") {
          if (props.onSkip) {
            // Brew or a pin declined rather than failed. A view that tracks
            // per-package status owns the row's verdict, and its `onAction`
            // reads `false` as "failed" — so the refresh must NOT be sent here
            // or a skip would paint the row red.
            props.onSkip();
            return;
          }
          // Nothing upgraded, but the pin on disk moved or never matched the
          // row. The remaining callers ignore the boolean and just revalidate.
          if (result.refresh) props.onAction(false);
          return;
        }
        if (result.outcome === "aborted") {
          return;
        }
        props.onAction(result.ok);
      }}
    />
  );
}

/** Formulae and casks are both pinnable (casks since Homebrew 5.1.12). */
function isPinned(item: Cask | Nameable): boolean {
  return (item as Formula | Cask).pinned === true;
}

export function FormulaUpgradeAllAction(props: {
  /** Overrides the default upgrade, e.g. to report progress per package */
  onUpgradeAll?: () => void;
  onAction: (result: boolean) => void;
}) {
  return (
    <Action
      title="Upgrade All"
      icon={Icon.ArrowUpCircle}
      shortcut={{ modifiers: ["cmd", "opt"], key: "u" }}
      onAction={async () => {
        if (props.onUpgradeAll) {
          props.onUpgradeAll();
          return;
        }
        const result = await upgradeAll();
        props.onAction(result);
      }}
    />
  );
}

/**
 * Re-check this one package against a freshly updated Homebrew.
 *
 * The list's `outdated` flag is only ever as fresh as the last `brew update`,
 * so an installed package can sit at "up to date" while a release waits in a
 * tap nobody has pulled. Show Installed and Search both offer this; the answer
 * lands in the toast AND in the row, because `onAction` revalidates.
 */
export function CheckForUpdatesAction(props: { item: Cask | Formula; onAction: (result: boolean) => void }) {
  const name = brewName(props.item);

  return (
    <Action
      title="Check for Updates"
      icon={Icon.RotateClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={async () => {
        // Before the await, not after: `brew update` can run for tens of
        // seconds, and an unannounced one reads as a dead keypress.
        const handle = showActionToast({
          title: `Checking ${name} for Updates`,
          message: "Updating Homebrew…",
          cancelable: true,
        });
        try {
          const fresh = await brewCheckForUpdate(props.item, handle.abort?.signal);
          if (!fresh) {
            // Not "no longer exists": the fetchers swallow read failures and
            // malformed JSON into the same undefined, so deletion is a guess.
            const diagnostic = `Could not read ${name} from Homebrew\n\nHomebrew updated, but the package details could not be read (empty or malformed \`brew info --json=v2 ${name}\`).`;
            await showToast({
              style: Toast.Style.Failure,
              title: `Could not read ${name} from Homebrew`,
              message: "Homebrew updated, but the package details could not be read.",
              primaryAction: copyLogsAction(diagnostic, { hideToast: true }),
            });
            props.onAction(false);
            return;
          }
          // Settle by REPLACING the animated toast rather than mutating it, so
          // its Cancel action cannot outlive the operation (see utils/toast.ts).
          // Deliberately not showSuccessHUD: that honours Close After Action and
          // would shut the window on a read-only check, hiding the refreshed row.
          if (brewIsOutdated(fresh)) {
            // Finding the update is only half the errand. Without the action
            // here the answer is a dead end: the row does not gain an Upgrade
            // until the revalidation lands, and the user has to hunt for it.
            await showToast({
              style: Toast.Style.Success,
              title: `Update available for ${name}`,
              message: `${brewInstalledVersion(fresh) ?? "installed"} → ${brewAvailableVersion(fresh) ?? "newer"}`,
              primaryAction: {
                title: "Upgrade",
                onAction: async (toast) => {
                  await toast.hide();
                  // `fresh`, not props.item: the record just read from brew is
                  // the one whose pin state and version this decision was made
                  // on. DECLINED means brew refused (pinned, disabled) and has
                  // already said so in its own toast — not a failure to report.
                  const result = await upgradeChecked(fresh, { allowUnpin: true });
                  if (result.outcome === "upgraded") {
                    props.onAction(result.ok);
                  }
                },
              },
            });
          } else {
            await showToast({ style: Toast.Style.Success, title: `${name} is up to date` });
          }
          props.onAction(true);
        } catch (err) {
          // No handle.hide() first: hide/update act on whichever toast is
          // VISIBLE, not on ours (see utils/toast.ts), so hiding could dismiss
          // another operation's toast. showBrewFailureToast replaces instead.
          // On cancellation it deliberately shows nothing, and the Cancel
          // action has already hidden the animated toast itself.
          await showBrewFailureToast("Check for updates failed", ensureError(err));
          props.onAction(false);
        }
      }}
    />
  );
}

export function PinAction(props: { item: Pinnable; kind: PinKind; onAction: (result: boolean) => void }) {
  const pinned = props.item.pinned;
  const noun = props.kind === "cask" ? "Cask" : "Formula";
  return (
    <Action
      title={`${pinned ? "Unpin" : "Pin"} ${noun}`}
      icon={pinned ? Icon.TackDisabled : Icon.Tack}
      shortcut={Keyboard.Shortcut.Common.Pin}
      onAction={async () => {
        if (pinned) {
          props.onAction(await unpin(props.item, props.kind));
        } else {
          props.onAction(await pin(props.item, props.kind));
        }
      }}
    />
  );
}

/**
 * Link or unlink an installed cask's symlinks, previewed with `--dry-run`.
 *
 * Homebrew exposes no link STATE (no field in `brew info --json=v2`, none in
 * the install receipt), so both verbs are always offered and the dry-run is
 * the state check: an empty plan means there is nothing to do, and says so
 * without a confirmation sheet.
 *
 * `onBusy` lets the panel drop both actions while one is in flight — brew
 * takes no cask lock on these paths, so two overlapping runs would race.
 */
export function CaskLinkAction(props: {
  cask: Cask;
  action: CaskLinkVerb;
  onBusy: (busy: boolean) => void;
  onAction: (result: boolean) => void;
}) {
  const verb = props.action === "link" ? "Link" : "Unlink";
  return (
    <Action
      title={`${verb} Cask`}
      icon={props.action === "link" ? Icon.Link : Icon.XMarkCircle}
      shortcut={props.action === "link" ? { modifiers: ["cmd"], key: "l" } : { modifiers: ["cmd", "shift"], key: "l" }}
      onAction={async () => {
        props.onBusy(true);
        let ran = false;
        try {
          ran = await linkCask(props.cask, props.action);
        } finally {
          // Before onAction: that may pop the Details view, and the busy flag
          // has to be clear by the time the panel behind it re-renders.
          props.onBusy(false);
        }
        // Only a command that actually ran is worth reporting: the
        // "already linked" no-op must not pop the Details view.
        if (ran) props.onAction(true);
      }}
    />
  );
}

export function FormulaShowAllInstalled(props: { onAction: (result: boolean) => void }) {
  const [excludeDependencies, setExcludeDependencies] = useBrewDependencies();

  return (
    <Action
      title={excludeDependencies ? "Show Dependencies" : "Hide Dependencies"}
      icon={excludeDependencies ? Icon.Eye : Icon.EyeDisabled}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() => {
        const result = toggleExcludeDeps(excludeDependencies, setExcludeDependencies);
        props.onAction(result);
      }}
    />
  );
}

/// Utilties

async function install(formula: Cask | Formula): Promise<boolean> {
  const name = brewName(formula);
  const handle = showActionToast({
    title: `Installing ${name}`,
    message: "",
    cancelable: true,
  });
  try {
    // Use progress-enabled install to show download progress
    await brewInstallWithProgress(
      formula,
      (progress: BrewProgress) => {
        handle.updateMessage(progress.message);
      },
      handle.abort?.signal,
    );
    // Use HUD for success - persists even if Raycast is closed
    await handle.showSuccessHUD(`Installed ${name}`);
    return true;
  } catch (err) {
    const error = ensureError(err);
    // Show HUD for failure if user might have closed Raycast
    await handle.showFailureHUD(`Failed to install ${name}`);
    // Also show detailed toast if Raycast is still open
    showBrewFailureToast("Install failed", error);
    return false;
  }
}

/**
 * Homebrew refuses to uninstall a pinned package of either kind. Say so, and
 * offer the one thing that gets past it — which unpins, so it needs an explicit
 * confirmation rather than a silent `--force`.
 */
async function offerForcedUninstall(
  formula: Cask | Nameable,
  name: string,
  cask: boolean,
  effectivePinned: boolean | undefined,
  onComplete?: (result: boolean) => void,
): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: `Can't uninstall pinned ${cask ? "cask" : "formula"} ${name}`,
    message: "It is pinned. Unpin it first, or force the uninstall.",
    primaryAction: {
      title: `Unpin ${cask ? "Cask" : "Formula"} and Force Uninstall`,
      onAction: async (toast) => {
        await toast.hide();
        // Tell the caller the row changed: without this the view revalidates
        // only after the refused attempt, leaving the removed package on screen.
        onComplete?.(await uninstall(formula, true, effectivePinned));
      },
    },
  });
}

async function uninstall(
  formula: Cask | Nameable,
  force = false,
  effectivePinned?: boolean,
  onComplete?: (result: boolean) => void,
): Promise<boolean> {
  const name = brewName(formula);
  const cask = isCask(formula);
  // Ask Homebrew, not the cached payload — see FormulaUpgradeAction. The caller's
  // effective value still wins when it has one (a live pin change in the review).
  // Only ask about pins when the caller has not already decided.
  let pinned = effectivePinned;
  if (pinned === undefined) {
    const pins = await readPins("Uninstall");
    if (!pins) {
      return false;
    }
    pinned = isPinnedPackage(pins, brewIdentifier(formula), cask);
  }

  // Homebrew refuses to uninstall a pinned package — casks in
  // cask/uninstall.rb (`unpin_for_removal?`) and formulae in uninstall.rb
  // ("is pinned. You must unpin it to uninstall."). Rather than let that
  // surface as a raw brew error, say what happened and offer the remedy, which
  // unpins as part of the removal and so needs explicit confirmation.
  if (!force && pinned) {
    await offerForcedUninstall(formula, name, cask, effectivePinned, onComplete);
    return false;
  }

  const handle = showActionToast({
    title: `Uninstalling ${name}`,
    message: "",
    cancelable: true,
  });
  try {
    await brewUninstall(formula, handle.abort?.signal, force);
    await handle.showSuccessHUD(`Uninstalled ${name}`);
    return true;
  } catch (err) {
    const error = ensureError(err);
    // Only reached when brew actually FAILS. An ordinary pinned uninstall uses
    // `onoe` and exits 0, so it never lands here — see TODO.md.
    if (!force && isPinnedRefusal(error)) {
      await handle.hide();
      await offerForcedUninstall(formula, name, cask, effectivePinned, onComplete);
      return false;
    }
    await handle.showFailureHUD(`Failed to uninstall ${name}`);
    showBrewFailureToast("Uninstall failed", error);
    return false;
  }
}

/** Homebrew ran, exited 0, and chose not to upgrade — neither success nor failure. */
const DECLINED = "declined" as const;

async function upgrade(formula: Cask | Nameable): Promise<boolean | typeof DECLINED> {
  const name = brewName(formula);
  const handle = showActionToast({
    title: `Upgrading ${name}`,
    message: "",
    cancelable: true,
  });
  try {
    // Use progress-enabled upgrade to show download progress
    const result = await brewUpgradeSingleWithProgress(
      formula,
      (progress: BrewProgress) => {
        handle.updateMessage(progress.message);
      },
      handle.abort?.signal,
    );

    // Exit 0 is not proof of an upgrade — brew warns and skips a disabled,
    // unavailable or already-current package.
    const declined = upgradeSkipReason(`${result.stderr ?? ""}\n${result.stdout ?? ""}`, brewIdentifier(formula));
    if (declined) {
      await handle.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: `Did not upgrade ${name}`,
        message: declined,
        primaryAction: copyLogsAction(`Did not upgrade ${name}\n\n${declined}`, { hideToast: true }),
      });
      return DECLINED;
    }

    await handle.showSuccessHUD(`Upgraded ${name}`);
    return true;
  } catch (err) {
    const error = ensureError(err);
    await handle.showFailureHUD(`Failed to upgrade ${name}`);
    showBrewFailureToast("Upgrade failed", error);
    return false;
  }
}

/**
 * What happened to a single-package upgrade attempt.
 *
 * `skipped` and `aborted` are deliberately distinct. `skipped` means the
 * package was reachable and something declined it — a pin, or brew warning that
 * it is disabled or already current — which a status-tracking view should mark
 * as skipped. `aborted` means we could not get far enough to decide (the pin
 * directory would not read, an unpin failed); that is already reported, and the
 * caller must not restate it as a per-package verdict.
 */
type UpgradeOutcome =
  | { outcome: "upgraded"; ok: boolean }
  /**
   * `refresh` means the caller's payload no longer matches disk, so it must
   * revalidate even though nothing was upgraded: either a pin was lifted before
   * brew declined, or the row was rendered from a snapshot that disagrees with
   * the pin directory. Without it the row keeps showing the stale pin and the
   * action keeps declining with a label that does not match what would happen.
   */
  | { outcome: "skipped"; refresh?: boolean }
  | { outcome: "aborted" };

/**
 * Upgrade one package, having first asked Homebrew — not the payload — whether
 * it is pinned.
 *
 * `brew upgrade` refuses a pinned package outright ("Error: Not upgrading 1
 * pinned package"), so the attempt is never made blind. The payload's own
 * `pinned` is a snapshot that another command, or the CLI, may have invalidated;
 * the decision reads brew's pin directory instead. ~20µs.
 *
 * `allowUnpin` splits the two callers. A view that tracks per-package status
 * says false: a row reporting "skipped" must not quietly unpin itself. Search
 * and Show Installed say true, where the only sensible reading of pressing
 * Upgrade on a pinned row is "do the thing".
 */
async function upgradeChecked(
  item: Cask | Nameable,
  opts?: { allowUnpin?: boolean; onStart?: () => void },
): Promise<UpgradeOutcome> {
  const cask = isCask(item);

  const pins = await readPins("Upgrade");
  if (!pins) {
    return { outcome: "aborted" };
  }

  // Identity, not display name: `brewName` gives a cask its title.
  const pinnedOnDisk = isPinnedPackage(pins, brewIdentifier(item), cask);
  // The payload is a snapshot; another command or the CLI may have moved the
  // pin since the fetch. EITHER direction leaves the row lying about it.
  const stalePin = pinnedOnDisk !== isPinned(item);
  let unpinned = false;
  if (pinnedOnDisk) {
    if (!opts?.allowUnpin) {
      await showToast({
        style: Toast.Style.Success,
        title: "Skipping Pinned Upgrades",
        message: `${brewName(item)} is pinned. Unpin it (⌘ .) to upgrade.`,
      });
      return { outcome: "skipped", refresh: stalePin };
    }
    // The pin is the only thing in the way and the user just asked for the
    // upgrade — so lift it, then proceed.
    if (!(await unpin(item as Pinnable, cask ? "cask" : "formula"))) {
      return { outcome: "aborted" };
    }
    unpinned = true;
  }

  opts?.onStart?.();
  const result = await upgrade(item);
  // A decline still leaves the lifted pin behind: brew can exit 0 and refuse
  // (already current, disabled, unavailable), so this is not the failure path.
  return result === DECLINED
    ? { outcome: "skipped", refresh: unpinned || stalePin }
    : { outcome: "upgraded", ok: result };
}

async function upgradeAll(): Promise<boolean> {
  const handle = showActionToast({
    title: "Upgrading all packages",
    message: "This may take a while...",
    cancelable: true,
  });
  try {
    await brewUpgradeAll(preferences.greedyUpgrades, handle.abort?.signal);
    await handle.showSuccessHUD("All packages upgraded");
    return true;
  } catch (err) {
    const error = ensureError(err);
    await handle.showFailureHUD("Failed to upgrade packages");
    showBrewFailureToast("Upgrade failed", error);
    return false;
  }
}

export async function pin(item: Pinnable, kind: PinKind): Promise<boolean> {
  const name = brewName(item as Cask | Nameable);
  showToast(Toast.Style.Animated, `Pinning ${name}`);
  try {
    const mayAutoUpdate = await brewPin(item, kind);
    item.pinned = true;
    // A cask that updates itself ignores the pin: Homebrew pins it anyway and
    // warns (cmd/pin.rb). Say so rather than implying the version is frozen.
    if (mayAutoUpdate) {
      await showToast({
        style: Toast.Style.Success,
        title: `Pinned ${name}`,
        message: "Pinning may be overridden by auto-updates",
      });
    } else {
      showToast(Toast.Style.Success, `Pinned ${name}`);
    }
    return true;
  } catch (err) {
    showBrewFailureToast(`Pin ${kind} failed`, ensureError(err));
    return false;
  }
}

export async function unpin(item: Pinnable, kind: PinKind): Promise<boolean> {
  const name = brewName(item as Cask | Nameable);
  showToast(Toast.Style.Animated, `Unpinning ${name}`);
  try {
    await brewUnpin(item, kind);
    item.pinned = false;
    showToast(Toast.Style.Success, `Unpinned ${name}`);
    return true;
  } catch (err) {
    showBrewFailureToast(`Unpin ${kind} failed`, ensureError(err));
    return false;
  }
}

/** How many of a long symlink plan to show before summarising the rest. */
const LINK_PREVIEW_LIMIT = 12;

/**
 * Preview `brew {link,unlink} --cask` and, when it would change something,
 * confirm and run it. Returns true only when a command actually ran.
 */
async function linkCask(cask: Cask, action: CaskLinkVerb): Promise<boolean> {
  const verb = action === "link" ? "Link" : "Unlink";
  const name = brewName(cask);
  // Before the await: the dry-run takes about half a second, and an
  // unannounced keypress reads as a dead one.
  const handle = showActionToast({
    title: `Checking what ${verb} would change`,
    message: name,
    cancelable: true,
  });

  let preview: { paths: string[]; warnings: string[] };
  try {
    preview = await brewCaskLinkPreview(cask, action, handle.abort?.signal);
  } catch (err) {
    // No handle.hide() first: hide acts on whichever toast is VISIBLE, not on
    // ours, so this replaces rather than dismisses. On cancellation
    // showBrewFailureToast deliberately shows nothing.
    await showBrewFailureToast(`${verb} preview failed`, ensureError(err));
    return false;
  }

  if (preview.paths.length === 0) {
    // Nothing to link or unlink. The warning, when there is one, is the only
    // explanation brew gives ("already a Binary at … from formula code-cli").
    await showToast({
      style: Toast.Style.Success,
      title: `${name} is already ${action === "link" ? "linked" : "unlinked"}`,
      message: preview.warnings[0],
    });
    return false;
  }

  const shown = preview.paths.slice(0, LINK_PREVIEW_LIMIT);
  const remaining = preview.paths.length - shown.length;
  const message = [
    `${formatCount(preview.paths.length, "symlink")} will be ${action === "link" ? "created" : "removed"}:`,
    ...shown,
    remaining > 0 ? `…and ${remaining} more` : undefined,
    // A partial plan is the case that most needs explaining: brew skipped an
    // artifact and said why on stderr and nowhere else.
    preview.warnings[0],
  ]
    .filter(Boolean)
    .join("\n");

  // The animated toast has no follow-up on the dismiss path — confirmAndRun
  // returns false without showing anything — so hide it here rather than leave
  // a spinner claiming work is still happening. The modal in between means
  // there is no race with the toasts confirmAndRun shows after a confirm.
  handle.hide();
  // The display form, not brewExecutable(): confirmAndRun appends the commands
  // to the sheet verbatim and resolves `brew` off the configured install.
  return await confirmAndRun([`brew ${action} --cask ${brewIdentifier(cask)}`], {
    title: `${verb} ${name}?`,
    message,
  });
}

function toggleExcludeDeps(exclude: boolean, setExclude: (val: boolean) => void) {
  setExclude(!exclude);

  return true;
}
