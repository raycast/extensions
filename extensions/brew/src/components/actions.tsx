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
  brewUpgradeSingleWithProgress,
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

export function FormulaInstallAction(props: { formula: Cask | Formula; onAction: (result: boolean) => void }) {
  // TD: Support installing other versions?
  return (
    <Action
      title={"Install"}
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
        // The title above is drawn from the payload, which is fine for display.
        // The DECISION reads Homebrew's own pin directory: a package pinned in
        // another command or outside Raycast is pinned whatever this snapshot
        // says, and brew errors rather than warns when we name it. ~20µs.
        const pins = await readPins("Upgrade");
        if (!pins) {
          return;
        }
        // Identity, not display name: `brewName` gives a cask its title.
        const reallyPinned = isPinnedPackage(pins, brewIdentifier(props.formula), cask);

        if (reallyPinned) {
          if (!unpinAndUpgrade) {
            props.onSkip?.();
            await showToast({
              style: Toast.Style.Success,
              title: "Skipping Pinned Upgrades",
              message: `${brewName(props.formula)} is pinned. Unpin it (⌘ .) to upgrade.`,
            });
            return;
          }
          // The pin is the only thing standing in the way, and the user just
          // asked for the upgrade — so lift it, then proceed.
          if (!(await unpin(props.formula as Pinnable, cask ? "cask" : "formula"))) {
            return;
          }
        }

        props.onStart?.();
        const result = await upgrade(props.formula);
        if (result === DECLINED) {
          // Brew declined rather than failed. Report it the way the batch run
          // does — and the way the pinned branch above does — instead of
          // painting the row red for something that is not an error.
          props.onSkip?.();
          return;
        }
        props.onAction(result);
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
      await showToast({ style: Toast.Style.Failure, title: `Did not upgrade ${name}`, message: declined });
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

function toggleExcludeDeps(exclude: boolean, setExclude: (val: boolean) => void) {
  setExclude(!exclude);

  return true;
}
