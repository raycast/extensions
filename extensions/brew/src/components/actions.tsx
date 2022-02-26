import { ActionPanelItem, Icon, showToast, ToastStyle } from "@raycast/api";
import {
  brewName,
  brewInstall,
  brewUninstall,
  brewPinFormula,
  brewUnpinFormula,
  brewUpgrade,
  brewUpgradeAll,
} from "../brew";
import { showActionToast, showFailureToast } from "../utils";
import { Cask, Formula, OutdatedFormula, Nameable } from "../brew";

export function FormulaInstallAction(props: {
  formula: Cask | Formula;
  onAction: (result: boolean) => void;
}): JSX.Element {
  // TD: Support installing other versions?
  return (
    <ActionPanelItem
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
  onAction: (result: boolean) => void;
}): JSX.Element {
  return (
    <ActionPanelItem
      title="Uninstall"
      icon={Icon.Trash}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        const result = await uninstall(props.formula);
        props.onAction(result);
      }}
    />
  );
}

export function FormulaUpgradeAction(props: {
  formula: Cask | Nameable;
  onAction: (result: boolean) => void;
}): JSX.Element {
  return (
    <ActionPanelItem
      title="Upgrade"
      icon={Icon.Hammer}
      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      onAction={async () => {
        const result = await upgrade(props.formula);
        props.onAction(result);
      }}
    />
  );
}

export function FormulaUpgradeAllAction(props: { onAction: (result: boolean) => void }): JSX.Element {
  return (
    <ActionPanelItem
      title="Upgrade All"
      icon={Icon.Hammer}
      onAction={async () => {
        const result = await upgradeAll();
        props.onAction(result);
      }}
    />
  );
}

export function FormulaPinAction(props: {
  formula: Formula | OutdatedFormula;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const isPinned = props.formula.pinned;
  return (
    <ActionPanelItem
      title={isPinned ? "Unpin" : "Pin"}
      icon={Icon.Pin}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
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

/// Utilties

async function install(formula: Cask | Formula): Promise<boolean> {
  const abort = showActionToast({ title: `Installing ${brewName(formula)}`, cancelable: true });
  try {
    await brewInstall(formula, abort);
    showToast(ToastStyle.Success, `Installed ${brewName(formula)}`);
    return true;
  } catch (err) {
    showFailureToast("Install failed", err as Error);
    return false;
  }
}

async function uninstall(formula: Cask | Nameable): Promise<boolean> {
  const abort = showActionToast({ title: `Uninstalling ${brewName(formula)}`, cancelable: true });
  try {
    await brewUninstall(formula, abort);
    showToast(ToastStyle.Success, `Uninstalled ${brewName(formula)}`);
    return true;
  } catch (err) {
    showFailureToast("Uninstall failed", err as Error);
    return false;
  }
}

async function upgrade(formula: Cask | Nameable): Promise<boolean> {
  const abort = showActionToast({ title: `Upgrading ${brewName(formula)}`, cancelable: true });
  try {
    await brewUpgrade(formula, abort);
    showToast(ToastStyle.Success, `Upgraded ${brewName(formula)}`);
    return true;
  } catch (err) {
    showFailureToast("Upgrade formula failed", err as Error);
    return false;
  }
}

async function upgradeAll(): Promise<boolean> {
  const abort = showActionToast({ title: "Upgrading all formula", cancelable: true });
  try {
    await brewUpgradeAll(abort);
    showToast(ToastStyle.Success, "Upgrade formula succeeded");
    return true;
  } catch (err) {
    showFailureToast("Upgrade formula failed", err as Error);
    return false;
  }
}

async function pin(formula: Formula | OutdatedFormula): Promise<boolean> {
  showToast(ToastStyle.Animated, `Pinning ${brewName(formula)}`);
  try {
    await brewPinFormula(formula);
    formula.pinned = true;
    showToast(ToastStyle.Success, `Pinned ${brewName(formula)}`);
    return true;
  } catch (err) {
    showFailureToast("Pin formula failed", err as Error);
    return false;
  }
}

async function unpin(formula: Formula | OutdatedFormula): Promise<boolean> {
  showToast(ToastStyle.Animated, `Unpinning ${brewName(formula)}`);
  try {
    await brewUnpinFormula(formula);
    formula.pinned = false;
    showToast(ToastStyle.Success, `Unpinned ${brewName(formula)}`);
    return true;
  } catch (err) {
    showFailureToast("Unpin formula failed", err as Error);
    return false;
  }
}
