import {
  ActionPanel,
  ActionPanelItem,
  CopyToClipboardAction,
  Detail,
  Icon,
  OpenInBrowserAction,
  PushAction,
  ShowInFinderAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import FormulaInfo from "./formulaInfo";
import { brewIsInstalled, brewInstall, brewUninstall, brewInstallPath } from "../brew";

export default function FormulaActionPanel(props: {formula: Formula, installCallback: () => void}): Component {
  if (brewIsInstalled(props.formula)) {
    return installedActionPanel(props.formula, props.installCallback);
  } else {
    return uninstalledActionPanel(props.formula, props.installCallback);
  }
}

function installedActionPanel(formula: Formula, didUninstall: () => void): Component {
  async function uninstall(): Promise<bool> {
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

  return (<ActionPanel>
    <ActionPanel.Section>
      <PushAction title="Show Details" target={<FormulaInfo formula={formula} />} />
      <ShowInFinderAction path={brewInstallPath(formula)} />
      <OpenInBrowserAction url={formula.homepage} />
      <CopyToClipboardAction title="Copy URL" content={formula.homepage} />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <ActionPanelItem title="Uninstall"
                       icon={Icon.Trash}
                       shortcut={{ modifiers:["ctrl"], key: "x" }}
                       onAction={async () => {
                         const result = await uninstall();
                         didUninstall(result);
                       }} />
    </ActionPanel.Section>
  </ActionPanel>);
}

function uninstalledActionPanel(formula: Formula, didInstall: () => void): Component {
  async function install(): Promise<bool> {
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

  return (<ActionPanel>
    <ActionPanel.Section>
      <PushAction title="Show Details" target={<FormulaInfo formula={formula} />} />
      <ActionPanelItem title={"Install"}
                       icon={Icon.Plus}
                       shortcut={{ modifiers:["cmd"], key: "i" }}
                       onAction={async () => {
                         const result =  await install();
                         didInstall(result);
                         // installed.set(formula.name, formula);
                         // setInstalled(new Map(installed));
                       }}
      />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <OpenInBrowserAction url={formula.homepage} />
      <CopyToClipboardAction title="Copy URL" content={formula.homepage} />
    </ActionPanel.Section>
  </ActionPanel>);
}
