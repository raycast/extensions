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
import FormulaInfo from "./info";
import { brewIsInstalled, brewInstall, brewUninstall, brewInstallPath } from "../brew";

export default function FormulaActionPanel(props: {formula: Formula, showDetails: bool, onInstall: () => void}): Component {
  if (brewIsInstalled(props.formula)) {
    return installedActionPanel(props.formula, props.showDetails, props.onInstall);
  } else {
    return uninstalledActionPanel(props.formula, props.showDetails, props.onInstall);
  }
}

function installedActionPanel(formula: Formula, showDetails: bool, onInstall: () => void): Component {
  return (<ActionPanel>
    <ActionPanel.Section>
      {showDetails && <PushAction title="Show Details" target={<FormulaInfo formula={formula} onInstall={onInstall} />} />}
      <ShowInFinderAction path={brewInstallPath(formula)} />
      <OpenInBrowserAction url={formula.homepage} />
      <CopyToClipboardAction title="Copy URL" content={formula.homepage} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <FormulaUninstallAction formula={formula} onInstall={onInstall} />
    </ActionPanel.Section>
  </ActionPanel>);
}

function uninstalledActionPanel(formula: Formula, showDetails: bool, onInstall: () => void): Component {
  return (<ActionPanel>
    <ActionPanel.Section>
      {showDetails && <PushAction title="Show Details" target={<FormulaInfo formula={formula} onInstall={onInstall} />} />}
      <FormulaInstallAction formula={formula} onInstall={onInstall} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <OpenInBrowserAction url={formula.homepage} />
      <CopyToClipboardAction title="Copy URL" content={formula.homepage} />
    </ActionPanel.Section>
  </ActionPanel>);
}

export function FormulaInstallAction(props: {formula: Formula, onInstall: () => void}): Component {
  async function install(): Promise<bool> {
    const formula = props.formula;
    showToast(ToastStyle.Animated, `Installing ${formula.full_name}`);
    try {
      await brewInstall(formula);
      formula.installed = [{version: formula.versions.stable}];
      showToast(ToastStyle.Success, `Installed ${formula.full_name}`);
      return true;
    } catch (error) {
      console.error(error);
      showToast(ToastStyle.Failure, "Install failed");
      return false;
    }
  }

  // TD: Support installing other versions?

  return (<ActionPanelItem title={"Install"}
    icon={Icon.Plus}
    shortcut={{ modifiers:["cmd"], key: "i" }}
    onAction={async () => {
      props.onInstall(await install());
    }}
    />);
}

export function FormulaUninstallAction(props: {formula: Formula, onInstall: () => void}): Component {
  async function uninstall(): Promise<bool> {
    const formula = props.formula
    showToast(ToastStyle.Animated, `Uninstalling ${formula.full_name}`);
    try {
      await brewUninstall(formula);
      formula.installed = [];
      showToast(ToastStyle.Success, `Uninstalled ${formula.full_name}`);
      return true;
    } catch (err) {
      console.error(err);
      showToast(ToastStyle.Failure, "Uninstall failed");
      return false;
    }
  }

  return (<ActionPanelItem title="Uninstall"
    icon={Icon.Trash}
    shortcut={{ modifiers:["ctrl"], key: "x" }}
    onAction={async () => {
      const result = await uninstall();
      props.onInstall(result);
    }}
    />);
}
