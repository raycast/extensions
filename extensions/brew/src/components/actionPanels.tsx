import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import {
  brewAdoptCommand,
  brewInstallCommand,
  brewInstallPath,
  brewIsInstalled,
  brewUninstallCommand,
  brewUpgradeCommand,
  type Cask,
  type Formula,
  type OutdatedCask,
  type OutdatedFormula,
  type UpgradePackageStatus,
} from "../utils";
import { useTerminalApp } from "../utils/terminal";
import * as Actions from "./actions";
import { CaskInfo } from "./caskInfo";
import { FormulaInfo } from "./formulaInfo";

const ToggleDetailsAction = (props: { onToggleDetails: () => void }) => (
  <Action
    title="Toggle Details"
    icon={Icon.AppWindowSidebarRight}
    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    onAction={props.onToggleDetails}
  />
);

const DebugSection = (props: { obj: Cask | Formula }) => (
  <ActionPanel.Section>
    <Action.Push
      target={
        <Detail
          navigationTitle="Debug Info"
          markdown={"```json\n" + JSON.stringify(props.obj, null, 2) + "\n```"}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy JSON"
                content={JSON.stringify(props.obj, null, 2)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
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
  onToggleDetails?: () => void;
}) {
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
          {props.onToggleDetails && <ToggleDetailsAction onToggleDetails={props.onToggleDetails} />}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open Cask"
            url={`https://formulae.brew.sh/cask/${cask.token}`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Cask URL"
            content={`https://formulae.brew.sh/cask/${cask.token}`}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open Homepage"
            url={cask.homepage}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <Action.CopyToClipboard
            title="Copy Homepage URL"
            content={cask.homepage}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
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
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onAction={() => runCommandInTerminal(brewUninstallCommand(cask))}
          />
        </ActionPanel.Section>

        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Cask ID" content={cask.token} shortcut={Keyboard.Shortcut.Common.Copy} />
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
          {props.onToggleDetails && <ToggleDetailsAction onToggleDetails={props.onToggleDetails} />}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Cask ID" content={cask.token} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.CopyToClipboard title="Copy Tap Name" content={cask.tap} />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={brewInstallCommand(cask)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title={`Run Install in ${terminalName}`}
            icon={terminalIcon}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => runCommandInTerminal(brewInstallCommand(cask))}
          />
          <Action.CopyToClipboard
            title="Copy Adopt Command"
            content={brewAdoptCommand(cask)}
            shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
          />
          <Action
            title={`Run Adopt in ${terminalName}`}
            icon={terminalIcon}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onAction={() => runCommandInTerminal(brewAdoptCommand(cask))}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open Cask"
            url={`https://formulae.brew.sh/cask/${cask.token}`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Cask URL"
            content={`https://formulae.brew.sh/cask/${cask.token}`}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open Homepage"
            url={cask.homepage}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <Action.CopyToClipboard
            title="Copy Homepage URL"
            content={cask.homepage}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
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
  onToggleDetails?: () => void;
}) {
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
          <Actions.FormulaShowAllInstalled onAction={props.onAction} />
          {props.onToggleDetails && <ToggleDetailsAction onToggleDetails={props.onToggleDetails} />}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open Formula"
            url={`https://formulae.brew.sh/formula/${formula.name}`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Formula URL"
            content={`https://formulae.brew.sh/formula/${formula.name}`}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open Homepage"
            url={formula.homepage}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <Action.CopyToClipboard
            title="Copy Homepage URL"
            content={formula.homepage}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
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
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
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
          {props.onToggleDetails && <ToggleDetailsAction onToggleDetails={props.onToggleDetails} />}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.CopyToClipboard
            title="Copy Formula Name"
            content={formula.name}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />

          <Action.CopyToClipboard
            title="Copy Install Command"
            content={brewInstallCommand(formula)}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          <Action
            title={`Run Install in ${terminalName}`}
            icon={terminalIcon}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => runCommandInTerminal(brewInstallCommand(formula))}
          />
          <Action.CopyToClipboard
            title="Copy Adopt Command"
            content={brewAdoptCommand(formula)}
            shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
          />
          <Action
            title={`Run Adopt in ${terminalName}`}
            icon={terminalIcon}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onAction={() => runCommandInTerminal(brewAdoptCommand(formula))}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open Formula"
            url={`https://formulae.brew.sh/formula/${formula.name}`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Formula URL"
            content={`https://formulae.brew.sh/formula/${formula.name}`}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open Homepage"
            url={formula.homepage}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <Action.CopyToClipboard
            title="Copy Homepage URL"
            content={formula.homepage}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
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
  /** Called when the upgrade starts or finishes, e.g. to show its status in a list */
  onUpgrade?: (status: UpgradePackageStatus) => void;
  /** Overrides the default "Upgrade All", e.g. to report progress per package */
  onUpgradeAll?: () => void;
  onAction: (result: boolean) => void;
}) {
  const { outdated } = props;
  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();

  function isPinable(o: OutdatedCask | OutdatedFormula): o is OutdatedFormula {
    return (o as OutdatedFormula).pinned != undefined;
  }

  // When the caller shows the upgrade status itself, leave the list as-is:
  // an upgraded package remains visible, with its status
  function onUpgradeAction(result: boolean) {
    if (props.onUpgrade) {
      props.onUpgrade(result ? "upgraded" : "failed");
    } else {
      props.onAction(result);
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Actions.FormulaUpgradeAction
          formula={outdated}
          onStart={() => props.onUpgrade?.("upgrading")}
          onAction={onUpgradeAction}
        />
        <Actions.FormulaUpgradeAllAction onUpgradeAll={props.onUpgradeAll} onAction={props.onAction} />
        {isPinable(outdated) && <Actions.FormulaPinAction formula={outdated} onAction={props.onAction} />}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => props.onAction(true)}
        />
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
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={() => runCommandInTerminal(brewUpgradeCommand(outdated))}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Actions.FormulaUninstallAction formula={outdated} onAction={props.onAction} />
        <Action.CopyToClipboard
          title="Copy Uninstall Command"
          content={brewUninstallCommand(outdated)}
          shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
        />
        <Action
          title={`Run Uninstall in ${terminalName}`}
          icon={terminalIcon}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          onAction={() => runCommandInTerminal(brewUninstallCommand(outdated))}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/**
 * Actions available while an upgrade is running.
 *
 * Other brew actions are omitted, since Homebrew does not support concurrent processes.
 */
export function UpgradingActionPanel(props: { outdated: OutdatedCask | OutdatedFormula; onCancel: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Cancel Upgrade"
        icon={Icon.XMarkCircle}
        style={Action.Style.Destructive}
        onAction={props.onCancel}
      />
      <Action.CopyToClipboard
        title="Copy Upgrade Command"
        content={brewUpgradeCommand(props.outdated)}
        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
      />
    </ActionPanel>
  );
}
