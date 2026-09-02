import { Action, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { useBrewDependencies } from "../hooks/useBrewDependencies";
import {
  type BrewProgress,
  brewInstallWithProgress,
  brewName,
  isCask,
  brewPinFormula,
  brewUninstall,
  brewUnpinFormula,
  brewUpgradeAll,
  brewUpgradeSingleWithProgress,
  type Cask,
  ensureError,
  type Formula,
  type Nameable,
  type OutdatedFormula,
  preferences,
  showActionToast,
  showBrewFailureToast,
} from "../utils";

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

export function FormulaUninstallAction(props: { formula: Cask | Nameable; onAction: (result: boolean) => void }) {
  return (
    <Action
      title="Uninstall"
      icon={Icon.Trash}
      shortcut={Keyboard.Shortcut.Common.Remove}
      style={Action.Style.Destructive}
      onAction={async () => {
        const result = await uninstall(props.formula);
        props.onAction(result);
      }}
    />
  );
}

/**
 * Upgrade a single package.
 *
 * A PINNED formula is skipped rather than attempted. `brew upgrade` refuses it
 * outright — "Error: Not upgrading 1 pinned package" — so running it would
 * surface a failure toast for a package the user deliberately froze. Upgrade
 * All already skips pinned formulae and reports them as skipped; this makes the
 * single-package action say the same thing, in every view that offers it.
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
  onAction: (result: boolean) => void;
}) {
  return (
    <Action
      title="Upgrade"
      icon={Icon.ArrowUpCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      onAction={async () => {
        if (isPinned(props.formula)) {
          props.onSkip?.();
          await showToast({
            style: Toast.Style.Success,
            title: "Skipping Pinned Formulae Upgrades",
            message: `${brewName(props.formula)} is pinned. Unpin it (⌘ .) to upgrade.`,
          });
          return;
        }

        props.onStart?.();
        const result = await upgrade(props.formula);
        props.onAction(result);
      }}
    />
  );
}

/**
 * Pinning is formula-only. A cask is never treated as pinned even if the API
 * hands one a `pinned` field — there is no Unpin action in the cask panel, so
 * the toast would name a remedy the user cannot reach.
 */
function isPinned(item: Cask | Nameable): boolean {
  return !isCask(item) && (item as Formula).pinned === true;
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

export function FormulaPinAction(props: { formula: Formula | OutdatedFormula; onAction: (result: boolean) => void }) {
  const isPinned = props.formula.pinned;
  return (
    <Action
      title={isPinned ? "Unpin" : "Pin"}
      icon={isPinned ? Icon.TackDisabled : Icon.Tack}
      shortcut={Keyboard.Shortcut.Common.Pin}
      onAction={async () => {
        if (isPinned) {
          props.onAction(await unpin(props.formula));
        } else {
          props.onAction(await pin(props.formula));
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

async function uninstall(formula: Cask | Nameable): Promise<boolean> {
  const name = brewName(formula);
  const handle = showActionToast({
    title: `Uninstalling ${name}`,
    message: "",
    cancelable: true,
  });
  try {
    await brewUninstall(formula, handle.abort?.signal);
    await handle.showSuccessHUD(`Uninstalled ${name}`);
    return true;
  } catch (err) {
    const error = ensureError(err);
    await handle.showFailureHUD(`Failed to uninstall ${name}`);
    showBrewFailureToast("Uninstall failed", error);
    return false;
  }
}

async function upgrade(formula: Cask | Nameable): Promise<boolean> {
  const name = brewName(formula);
  const handle = showActionToast({
    title: `Upgrading ${name}`,
    message: "",
    cancelable: true,
  });
  try {
    // Use progress-enabled upgrade to show download progress
    await brewUpgradeSingleWithProgress(
      formula,
      (progress: BrewProgress) => {
        handle.updateMessage(progress.message);
      },
      handle.abort?.signal,
    );
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

export async function pin(formula: Formula | OutdatedFormula): Promise<boolean> {
  showToast(Toast.Style.Animated, `Pinning ${brewName(formula)}`);
  try {
    await brewPinFormula(formula);
    formula.pinned = true;
    showToast(Toast.Style.Success, `Pinned ${brewName(formula)}`);
    return true;
  } catch (err) {
    showBrewFailureToast("Pin formula failed", ensureError(err));
    return false;
  }
}

export async function unpin(formula: Formula | OutdatedFormula): Promise<boolean> {
  showToast(Toast.Style.Animated, `Unpinning ${brewName(formula)}`);
  try {
    await brewUnpinFormula(formula);
    formula.pinned = false;
    showToast(Toast.Style.Success, `Unpinned ${brewName(formula)}`);
    return true;
  } catch (err) {
    showBrewFailureToast("Unpin formula failed", ensureError(err));
    return false;
  }
}

function toggleExcludeDeps(exclude: boolean, setExclude: (val: boolean) => void) {
  setExclude(!exclude);

  return true;
}
