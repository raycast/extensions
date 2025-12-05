import React from "react";
import { Action, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import {
  brewName,
  brewInstallWithProgress,
  brewUninstall,
  brewPinFormula,
  brewUnpinFormula,
  brewUpgradeSingleWithProgress,
  brewUpgradeAll,
  preferences,
  showActionToast,
  showFailureToast,
  Cask,
  Formula,
  OutdatedFormula,
  Nameable,
  BrewProgress,
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

export function FormulaUpgradeAction(props: { formula: Cask | Nameable; onAction: (result: boolean) => void }) {
  return (
    <Action
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

export function FormulaUpgradeAllAction(props: { onAction: (result: boolean) => void }) {
  return (
    <Action
      title="Upgrade All"
      icon={Icon.Hammer}
      onAction={async () => {
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
      icon={Icon.Pin}
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

/// Utilties

async function install(formula: Cask | Formula): Promise<boolean> {
  const name = brewName(formula);
  const handle = showActionToast({ title: `Installing ${name}`, message: "", cancelable: true });
  try {
    // Use progress-enabled install to show download progress
    await brewInstallWithProgress(
      formula,
      (progress: BrewProgress) => {
        handle.updateMessage(progress.message);
      },
      handle.abort,
    );
    // Use HUD for success - persists even if Raycast is closed
    await handle.showSuccessHUD(`Installed ${name}`);
    return true;
  } catch (err) {
    const error = err as Error;
    // Show HUD for failure if user might have closed Raycast
    await handle.showFailureHUD(`Failed to install ${name}`);
    // Also show detailed toast if Raycast is still open
    showFailureToast("Install failed", error);
    return false;
  }
}

async function uninstall(formula: Cask | Nameable): Promise<boolean> {
  const name = brewName(formula);
  const handle = showActionToast({ title: `Uninstalling ${name}`, message: "", cancelable: true });
  try {
    await brewUninstall(formula, handle.abort);
    await handle.showSuccessHUD(`Uninstalled ${name}`);
    return true;
  } catch (err) {
    const error = err as Error;
    await handle.showFailureHUD(`Failed to uninstall ${name}`);
    showFailureToast("Uninstall failed", error);
    return false;
  }
}

async function upgrade(formula: Cask | Nameable): Promise<boolean> {
  const name = brewName(formula);
  const handle = showActionToast({ title: `Upgrading ${name}`, message: "", cancelable: true });
  try {
    // Use progress-enabled upgrade to show download progress
    await brewUpgradeSingleWithProgress(
      formula,
      (progress: BrewProgress) => {
        handle.updateMessage(progress.message);
      },
      handle.abort,
    );
    await handle.showSuccessHUD(`Upgraded ${name}`);
    return true;
  } catch (err) {
    const error = err as Error;
    await handle.showFailureHUD(`Failed to upgrade ${name}`);
    showFailureToast("Upgrade failed", error);
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
    await brewUpgradeAll(preferences.greedyUpgrades, handle.abort);
    await handle.showSuccessHUD("All packages upgraded");
    return true;
  } catch (err) {
    const error = err as Error;
    await handle.showFailureHUD("Failed to upgrade packages");
    showFailureToast("Upgrade failed", error);
    return false;
  }
}

async function pin(formula: Formula | OutdatedFormula): Promise<boolean> {
  showToast(Toast.Style.Animated, `Pinning ${brewName(formula)}`);
  try {
    await brewPinFormula(formula);
    formula.pinned = true;
    showToast(Toast.Style.Success, `Pinned ${brewName(formula)}`);
    return true;
  } catch (err) {
    showFailureToast("Pin formula failed", err as Error);
    return false;
  }
}

async function unpin(formula: Formula | OutdatedFormula): Promise<boolean> {
  showToast(Toast.Style.Animated, `Unpinning ${brewName(formula)}`);
  try {
    await brewUnpinFormula(formula);
    formula.pinned = false;
    showToast(Toast.Style.Success, `Unpinned ${brewName(formula)}`);
    return true;
  } catch (err) {
    showFailureToast("Unpin formula failed", err as Error);
    return false;
  }
}
