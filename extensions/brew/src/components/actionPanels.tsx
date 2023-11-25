import { Action, ActionPanel, Icon } from "@raycast/api";
import {
  brewIsInstalled,
  brewInstallPath,
  brewInstallCommand,
  brewUninstallCommand,
  brewUpgradeCommand,
} from "../brew";
import { Cask, Formula, OutdatedCask, OutdatedFormula } from "../brew";
import { FormulaInfo } from "./formulaInfo";
import { CaskInfo } from "./caskInfo";
import * as Actions from "./actions";
import { runCommandInTerminal } from "./runInTerminal";

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
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<CaskInfo cask={cask} onAction={props.onAction} />}
            />
          )}
          <Action.ShowInFinder path={brewInstallPath(cask)} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser url={cask.homepage} />
          <Action.CopyToClipboard title="Copy URL" content={cask.homepage} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Actions.FormulaUninstallAction formula={cask} onAction={props.onAction} />
          <Action.CopyToClipboard
            title="Copy Uninstall Command"
            content={brewUninstallCommand(cask)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title="Run Uninstall In Terminal"
            icon={Icon.Terminal}
            onAction={() => {
              runCommandInTerminal(brewUninstallCommand(cask));
            }}
          />
        </ActionPanel.Section>

        <ActionPanel.Section>
          {cask.outdated && <Actions.FormulaUpgradeAction formula={cask} onAction={props.onAction} />}
          <Action.CopyToClipboard
            title="Copy Cask Name"
            content={cask.token}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard title="Copy Tap Name" content={cask.tap} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function uninstalledActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.showDetails && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<CaskInfo cask={cask} onAction={props.onAction} />}
            />
          )}
          <Actions.FormulaInstallAction formula={cask} onAction={props.onAction} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Tap Name" content={cask.tap} />

          <Action.CopyToClipboard
            title="Copy Cask Name"
            content={cask.token}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={brewInstallCommand(cask)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title="Run Install In Terminal"
            icon={Icon.Terminal}
            onAction={() => {
              runCommandInTerminal(brewInstallCommand(cask));
            }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser url={cask.homepage} />
          <Action.CopyToClipboard title="Copy URL" content={cask.homepage} />
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
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<FormulaInfo formula={formula} onAction={props.onAction} />}
            />
          )}
          <Action.ShowInFinder path={brewInstallPath(formula)} />
          <Actions.FormulaPinAction formula={formula} onAction={props.onAction} />
        </ActionPanel.Section>

        <ActionPanel.Section>
          <Action.OpenInBrowser url={formula.homepage} />
          <Action.CopyToClipboard title="Copy URL" content={formula.homepage} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Actions.FormulaUninstallAction formula={formula} onAction={props.onAction} />
          <Action.CopyToClipboard
            title="Copy Uninstall Command"
            content={brewUninstallCommand(formula)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title="Run Uninstall In Terminal"
            icon={Icon.Terminal}
            onAction={() => {
              runCommandInTerminal(brewUninstallCommand(formula));
            }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          {formula.outdated && <Actions.FormulaUpgradeAction formula={formula} onAction={props.onAction} />}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function uninstalledActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.showDetails && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<FormulaInfo formula={formula} onAction={props.onAction} />}
            />
          )}
          <Actions.FormulaInstallAction formula={formula} onAction={props.onAction} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.CopyToClipboard
            title="Copy Formula Name"
            content={formula.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />

          <Action.CopyToClipboard
            title="Copy Install Command"
            content={brewInstallCommand(formula)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title="Run Install In Terminal"
            icon={Icon.Terminal}
            onAction={() => {
              runCommandInTerminal(brewInstallCommand(formula));
            }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser url={formula.homepage} />
          <Action.CopyToClipboard title="Copy URL" content={formula.homepage} />
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
        <Action.CopyToClipboard
          title="Copy Upgrade Command"
          content={brewUpgradeCommand(outdated)}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
        <Action
          title="Run Upgrade In Terminal"
          icon={Icon.Terminal}
          onAction={() => {
            runCommandInTerminal(brewUpgradeCommand(outdated));
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Actions.FormulaUninstallAction formula={outdated} onAction={props.onAction} />
        <Action.CopyToClipboard title="Copy Uninstall Command" content={brewUninstallCommand(outdated)} />
        <Action
          title="Run Uninstall In Terminal"
          icon={Icon.Terminal}
          onAction={() => {
            runCommandInTerminal(brewUninstallCommand(outdated));
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
