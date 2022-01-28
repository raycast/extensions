import {
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  OpenInBrowserAction,
  PushAction,
  ShowInFinderAction,
} from "@raycast/api";
import { brewIsInstalled, brewInstallPath } from "../brew";
import { Cask, Formula, OutdatedCask, OutdatedFormula } from "../brew";
import { FormulaInfo } from "./formulaInfo";
import { CaskInfo } from "./caskInfo";
import * as Actions from "./actions";

export function CaskActionPanel(props: {
  cask: Cask;
  showDetails: boolean;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const cask = props.cask;

  function installedActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.showDetails && (
            <PushAction
              title="Show Details"
              icon={Icon.Document}
              target={<CaskInfo cask={cask} onAction={props.onAction} />}
            />
          )}
          <ShowInFinderAction path={brewInstallPath(cask)} />
          <CopyToClipboardAction
            title="Copy Cask Name"
            content={cask.token}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <CopyToClipboardAction title="Copy Tap Name" content={cask.tap} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <OpenInBrowserAction url={cask.homepage} />
          <CopyToClipboardAction title="Copy URL" content={cask.homepage} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          {cask.outdated && <Actions.FormulaUpgradeAction formula={cask} onAction={props.onAction} />}
          <Actions.FormulaUninstallAction formula={cask} onAction={props.onAction} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function uninstalledActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.showDetails && (
            <PushAction
              title="Show Details"
              icon={Icon.Document}
              target={<CaskInfo cask={cask} onAction={props.onAction} />}
            />
          )}
          <Actions.FormulaInstallAction formula={cask} onAction={props.onAction} />
          <CopyToClipboardAction
            title="Copy Cask Name"
            content={cask.token}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <CopyToClipboardAction title="Copy Tap Name" content={cask.tap} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <OpenInBrowserAction url={cask.homepage} />
          <CopyToClipboardAction title="Copy URL" content={cask.homepage} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  if (brewIsInstalled(props.cask)) {
    return installedActionPanel();
  } else {
    return uninstalledActionPanel();
  }
}

export function FormulaActionPanel(props: {
  formula: Formula;
  showDetails: boolean;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const formula = props.formula;

  function installedActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.showDetails && (
            <PushAction
              title="Show Details"
              icon={Icon.Document}
              target={<FormulaInfo formula={formula} onAction={props.onAction} />}
            />
          )}
          <ShowInFinderAction path={brewInstallPath(formula)} />
          <CopyToClipboardAction
            title="Copy Formula Name"
            content={formula.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <OpenInBrowserAction url={formula.homepage} />
          <CopyToClipboardAction title="Copy URL" content={formula.homepage} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Actions.FormulaPinAction formula={formula} onAction={props.onAction} />
          {formula.outdated && <Actions.FormulaUpgradeAction formula={formula} onAction={props.onAction} />}
          <Actions.FormulaUninstallAction formula={formula} onAction={props.onAction} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function uninstalledActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.showDetails && (
            <PushAction
              title="Show Details"
              icon={Icon.Document}
              target={<FormulaInfo formula={formula} onAction={props.onAction} />}
            />
          )}
          <Actions.FormulaInstallAction formula={formula} onAction={props.onAction} />
          <CopyToClipboardAction
            title="Copy Formula Name"
            content={formula.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
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

export function OutdatedActionPanel(props: {
  outdated: OutdatedCask | OutdatedFormula;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const outdated = props.outdated;

  function isPinable(o: OutdatedCask | OutdatedFormula): o is OutdatedFormula {
    return (o as OutdatedFormula).pinned != undefined ? true : false;
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Actions.FormulaUpgradeAction formula={outdated} onAction={props.onAction} />
        <Actions.FormulaUpgradeAllAction onAction={props.onAction} />
        {isPinable(outdated) && <Actions.FormulaPinAction formula={outdated} onAction={props.onAction} />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Actions.FormulaUninstallAction formula={outdated} onAction={props.onAction} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
