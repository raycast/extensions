import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
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
import { useTerminalApp } from "./runInTerminal";

const DebugSection = (props: { obj: Cask | Formula }) => (
  <ActionPanel.Section>
    <Action.Push
      target={
        <Detail
          navigationTitle="Debug Info"
          markdown={"```json\n" + JSON.stringify(props.obj, null, 2) + "\n```"}
          actions={
            <ActionPanel>
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.CopyToClipboard title="Copy JSON" content={JSON.stringify(props.obj, null, 2)} />
            </ActionPanel>
          }
        />
      }
      title="Debug"
      icon={Icon.MagnifyingGlass}
    />
  </ActionPanel.Section>
);

export function CaskActionPanel(props: {
  cask: Cask;
  showDetails: boolean;
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const { cask } = props;
  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();

  function installedActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.showDetails && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<CaskInfo cask={cask} isInstalled={props.isInstalled} onAction={props.onAction} />}
            />
          )}
          {cask.outdated && <Actions.FormulaUpgradeAction formula={cask} onAction={props.onAction} />}
          <Action.ShowInFinder path={brewInstallPath(cask)} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser title="Open Cask" url={`https://formulae.brew.sh/cask/${cask.token}`} />
          <Action.CopyToClipboard title="Copy Cask URL" content={`https://formulae.brew.sh/cask/${cask.token}`} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser title="Open Homepage" url={cask.homepage} />
          <Action.CopyToClipboard title="Copy Homepage URL" content={cask.homepage} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Actions.FormulaUninstallAction formula={cask} onAction={props.onAction} />
          <Action.CopyToClipboard
            title="Copy Uninstall Command"
            content={brewUninstallCommand(cask)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title={`Run Uninstall in ${terminalName}`}
            icon={terminalIcon}
            style={Action.Style.Destructive}
            onAction={() => runCommandInTerminal(brewUninstallCommand(cask))}
          />
        </ActionPanel.Section>

        <ActionPanel.Section>
          <Action.CopyToClipboard
            title="Copy Cask Name"
            content={cask.token}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard title="Copy Tap Name" content={cask.tap} />
        </ActionPanel.Section>

        <DebugSection obj={cask} />
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
              target={<CaskInfo cask={cask} isInstalled={props.isInstalled} onAction={props.onAction} />}
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
            title={`Run Install in ${terminalName}`}
            icon={terminalIcon}
            onAction={() => runCommandInTerminal(brewInstallCommand(cask))}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser title="Open Cask" url={`https://formulae.brew.sh/cask/${cask.token}`} />
          <Action.CopyToClipboard title="Copy Cask URL" content={`https://formulae.brew.sh/cask/${cask.token}`} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser title="Open Homepage" url={cask.homepage} />
          <Action.CopyToClipboard title="Copy Homepage URL" content={cask.homepage} />
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
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const { formula } = props;
  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();

  function installedActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {props.showDetails && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<FormulaInfo formula={formula} isInstalled={props.isInstalled} onAction={props.onAction} />}
            />
          )}
          {formula.outdated && <Actions.FormulaUpgradeAction formula={formula} onAction={props.onAction} />}
          <Action.ShowInFinder path={brewInstallPath(formula)} />
          <Actions.FormulaPinAction formula={formula} onAction={props.onAction} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser title="Open Formula" url={`https://formulae.brew.sh/formula/${formula.name}`} />
          <Action.CopyToClipboard
            title="Copy Formula URL"
            content={`https://formulae.brew.sh/formula/${formula.name}`}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser title="Open Homepage" url={formula.homepage} />
          <Action.CopyToClipboard title="Copy Homepage URL" content={formula.homepage} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Actions.FormulaUninstallAction formula={formula} onAction={props.onAction} />
          <Action.CopyToClipboard
            title="Copy Uninstall Command"
            content={brewUninstallCommand(formula)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title={`Run Uninstall in ${terminalName}`}
            style={Action.Style.Destructive}
            icon={terminalIcon}
            onAction={() => runCommandInTerminal(brewUninstallCommand(formula))}
          />
        </ActionPanel.Section>

        <DebugSection obj={formula} />
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
              target={<FormulaInfo formula={formula} isInstalled={props.isInstalled} onAction={props.onAction} />}
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
            title={`Run Install in ${terminalName}`}
            icon={terminalIcon}
            onAction={() => runCommandInTerminal(brewInstallCommand(formula))}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser title="Open Formula" url={`https://formulae.brew.sh/formula/${formula.name}`} />
          <Action.CopyToClipboard
            title="Copy Formula URL"
            content={`https://formulae.brew.sh/formula/${formula.name}`}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser title="Open Homepage" url={formula.homepage} />
          <Action.CopyToClipboard title="Copy Homepage URL" content={formula.homepage} />
        </ActionPanel.Section>

        <DebugSection obj={formula} />
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
  const { outdated } = props;
  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();

  function isPinable(o: OutdatedCask | OutdatedFormula): o is OutdatedFormula {
    return (o as OutdatedFormula).pinned != undefined;
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
          title={`Run Upgrade in ${terminalName}`}
          icon={terminalIcon}
          onAction={() => runCommandInTerminal(brewUpgradeCommand(outdated))}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Actions.FormulaUninstallAction formula={outdated} onAction={props.onAction} />
        <Action.CopyToClipboard title="Copy Uninstall Command" content={brewUninstallCommand(outdated)} />
        <Action
          title={`Run Uninstall in ${terminalName}`}
          icon={terminalIcon}
          style={Action.Style.Destructive}
          onAction={() => runCommandInTerminal(brewUninstallCommand(outdated))}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
