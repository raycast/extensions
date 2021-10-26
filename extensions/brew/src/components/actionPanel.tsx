import {
  ActionPanel,
  ActionPanelItem,
  CopyToClipboardAction,
  Icon,
  OpenInBrowserAction,
  PushAction,
  ShowInFinderAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import {
  brewIsInstalled,
  brewInstall,
  brewUninstall,
  brewInstallPath,
  brewPinFormula,
  brewUnpinFormula,
  brewUpgrade,
  brewUpgradeAll,
} from "../brew";
import { Formula, FormulaBase, OutdatedFormula } from "../brew";
import { FormulaInfo } from "./info";

export function FormulaActionPanel(props: {formula: Formula, showDetails: boolean, onAction: (result: boolean) => void}) {
  const formula = props.formula;

  function installedActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.showDetails && <PushAction title="Show Details" icon={Icon.Document} target={<FormulaInfo formula={formula} onAction={props.onAction} />} />}
          <ShowInFinderAction path={brewInstallPath(formula)} />
          <OpenInBrowserAction url={formula.homepage} />
          <CopyToClipboardAction title="Copy URL" content={formula.homepage} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <FormulaPinAction formula={formula} onAction={props.onAction} />
          {formula.outdated && <FormulaUpgradeAction formula={formula} onAction={props.onAction} /> }
          <FormulaUninstallAction formula={formula} onAction={props.onAction} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function uninstalledActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.showDetails && <PushAction title="Show Details" icon={Icon.Document} target={<FormulaInfo formula={formula} onAction={props.onAction} />} />}
          <FormulaInstallAction formula={formula} onAction={props.onAction} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <OpenInBrowserAction url={formula.homepage} />
          <CopyToClipboardAction title="Copy URL" content={formula.homepage} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  if (brewIsInstalled(props.formula)) {
    return installedActionPanel();
  } else {
    return uninstalledActionPanel();
  }
}

export function FormulaInstallAction(props: {formula: Formula, onAction: (result: boolean) => void}) {
  async function install(): Promise<boolean> {
    const formula = props.formula;
    showToast(ToastStyle.Animated, `Installing ${formula.name}`);
    try {
      await brewInstall(formula);
      formula.installed = [{version: formula.versions.stable, installed_as_dependency: false, installed_on_request: true}];
      showToast(ToastStyle.Success, `Installed ${formula.name}`);
      return true;
    } catch (error) {
      console.error(error);
      showToast(ToastStyle.Failure, "Install failed");
      return false;
    }
  }

  // TD: Support installing other versions?

  return (
    <ActionPanelItem title={"Install"}
                     icon={Icon.Plus}
                     shortcut={{ modifiers:["cmd"], key: "i" }}
                     onAction={async () => {
                       props.onAction(await install());
                     }}
    />
  );
}

export function FormulaUninstallAction(props: {formula: Formula, onAction: (result: boolean) => void}) {
  async function uninstall(): Promise<boolean> {
    const formula = props.formula
    showToast(ToastStyle.Animated, `Uninstalling ${formula.name}`);
    try {
      await brewUninstall(formula);
      showToast(ToastStyle.Success, `Uninstalled ${formula.name}`);
      return true;
    } catch (err) {
      console.error(err);
      showToast(ToastStyle.Failure, "Uninstall failed");
      return false;
    }
  }

  return (
    <ActionPanelItem title="Uninstall"
                     icon={Icon.Trash}
                     shortcut={{ modifiers:["ctrl"], key: "x" }}
                     onAction={async () => {
                       const result = await uninstall();
                       props.onAction(result);
                     }}
    />
  );
}


export function FormulaUpgradeAction(props: {formula: FormulaBase, onAction: (result: boolean) => void}) {
  const formula = props.formula;

  async function upgrade(): Promise<boolean> {
    showToast(ToastStyle.Animated, `Upgrading ${formula.name}`);
    try {
      await brewUpgrade(formula);
      showToast(ToastStyle.Success, `Upgraded ${formula.name}`);
      return true;
    } catch (err) {
      console.log(err);
      showToast(ToastStyle.Failure, 'Upgrade formula failed');
      return false;
    }
  }

  return (
    <ActionPanelItem title="Upgrade"
                     icon={Icon.Hammer}
                     shortcut={{modifiers:["cmd", "shift"], key: "u"}}
                     onAction={async () => {
                       const result = await upgrade();
                       props.onAction(result);
                     }}
    />
  );
}

export function FormulaPinAction(props: {formula: FormulaBase, onAction: (result: boolean) => void}): JSX.Element {
  const formula = props.formula
  const isPinned = formula.pinned;

  async function pin(): Promise<boolean> {
    showToast(ToastStyle.Animated, `Pinning ${formula.name}`);
    try {
      await brewPinFormula(formula);
      formula.pinned = true;
      showToast(ToastStyle.Success, `Pinned ${formula.name}`);
      return true;
    } catch (err) {
      console.error(err);
      showToast(ToastStyle.Failure, "Pin formula failed");
      return false;
    }
  }

  async function unpin(): Promise<boolean> {
    showToast(ToastStyle.Animated, `Unpinning ${formula.name}`);
    try {
      await brewUnpinFormula(formula);
      formula.pinned = false;
      showToast(ToastStyle.Success, `Unpinned ${formula.name}`);
      return true;
    } catch (err) {
      console.error(err);
      showToast(ToastStyle.Failure, "Unpin formula failed");
      return false;
    }
  }

  return (<ActionPanelItem title={isPinned ? "Unpin" : "Pin"}
                           icon={Icon.Pin}
                           shortcut={{ modifiers:["cmd", "shift"], key: "p" }}
                           onAction={async () => {
                             if (isPinned) {
                               props.onAction(await unpin());
                             } else {
                               props.onAction(await pin());
                             }
                           }}
  />);
}

export function OutdatedActionPanel(props: {outdated: OutdatedFormula, onAction: (result: boolean) => void}): JSX.Element {
  const outdated = props.outdated;

  async function updateAll(): Promise<boolean> {
    showToast(ToastStyle.Animated, `Upgrading all formula`)
    try {
      await brewUpgradeAll();
      showToast(ToastStyle.Success, `Upgrade formula succeeded`)
      return true;
    } catch (err) {
      console.log(err);
      showToast(ToastStyle.Failure, 'Upgrade formula failed');
      return false;
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <FormulaUpgradeAction formula={outdated} onAction={props.onAction} />
        <ActionPanelItem title="Upgrade All" icon={Icon.Hammer} onAction={async () => {
          const result = await updateAll();
          props.onAction(result);
        }}
        />
        <FormulaPinAction formula={outdated} onAction={props.onAction} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
