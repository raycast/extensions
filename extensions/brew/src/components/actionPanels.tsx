import React from "react";
import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import {
  brewAdoptCommand,
  brewInstallCommand,
  brewInstallPath,
  brewIsInstalled,
  brewIsOutdated,
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

const ToggleSidebarAction = (props: { onToggleSidebar: () => void }) => (
  <Action
    title="Toggle Sidebar"
    icon={Icon.AppWindowSidebarRight}
    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    onAction={props.onToggleSidebar}
  />
);

/**
 * Reorder search results by install count. Only rendered where an ordering
 * exists to change — the search view — hence the optional handler.
 */
const SortByPopularityAction = (props: { sortByPopularity: boolean; onToggleSort: () => void }) => (
  <Action
    title={props.sortByPopularity ? "Sort by Relevance" : "Sort by Popularity"}
    icon={props.sortByPopularity ? Icon.Text : Icon.LineChart}
    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    onAction={props.onToggleSort}
  />
);

const ToggleDescriptionAction = (props: { showDescription: boolean; onToggleDescription: () => void }) => (
  <Action
    title={props.showDescription ? "Hide Description" : "Show Description"}
    icon={Icon.Paragraph}
    shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}
    onAction={props.onToggleDescription}
  />
);

/**
 * How the list is displayed, as opposed to what happens to the package.
 *
 * Grouped together and placed at the bottom next to Debug: these are settings,
 * and mixing them into the install/upgrade section buries the action you
 * actually came for.
 */
const ViewSection = (props: {
  onToggleSidebar?: () => void;
  /** Whether the detail sidebar is currently on screen. */
  metadataPanelVisible?: boolean;
  showDescription?: boolean;
  onToggleDescription?: () => void;
  sortByPopularity?: boolean;
  onToggleSort?: () => void;
  /**
   * Panel-specific display toggles, e.g. Hide Dependencies on installed formulae.
   * Typed off ActionPanel.Section: @raycast/api bundles its own @types/react
   * copy, and a bare React.ReactNode is not assignable across the two.
   */
  children?: React.ComponentProps<typeof ActionPanel.Section>["children"];
}) => {
  // The description only exists inside the detail sidebar, so with the sidebar
  // hidden the toggle has nothing to act on. "Toggle Sidebar", not "Toggle
  // Details" — the latter read as a variant of the "Show Details" push action.
  const canToggleDescription = props.onToggleDescription != undefined && props.metadataPanelVisible === true;

  if (!props.onToggleSidebar && !canToggleDescription && !props.onToggleSort && !props.children) {
    return null;
  }
  return (
    <ActionPanel.Section title="View">
      {props.onToggleSidebar && <ToggleSidebarAction onToggleSidebar={props.onToggleSidebar} />}
      {canToggleDescription && props.onToggleDescription && (
        <ToggleDescriptionAction
          showDescription={props.showDescription ?? true}
          onToggleDescription={props.onToggleDescription}
        />
      )}
      {props.children}
      {props.onToggleSort && (
        <SortByPopularityAction sortByPopularity={props.sortByPopularity ?? false} onToggleSort={props.onToggleSort} />
      )}
    </ActionPanel.Section>
  );
};

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
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
  /**
   * Offer the pushed Details view. Defaults to true.
   *
   * It is always rendered, but never ahead of the action someone actually came
   * for: Install on an uninstalled package, Upgrade on an outdated one. It only
   * takes the primary slot on an installed, up-to-date package, where the
   * alternative was Show in Finder. Previously it was suppressed entirely
   * whenever the detail sidebar was open, which is what made Show in Finder the
   * default action there.
   *
   * Only the Details view itself passes false, so it cannot push a copy of itself.
   */
  showDetailsAction?: boolean;
  onToggleSidebar?: () => void;
  sortByPopularity?: boolean;
  onToggleSort?: () => void;
  showDescription?: boolean;
  onToggleDescription?: () => void;
  metadataPanelVisible?: boolean;
  /**
   * Offer the Hide Dependencies filter. Installed-list only: nothing in the
   * search results is filtered by `excludeDependencies`, so there the action
   * would toggle a setting with no visible effect.
   */
  showDependenciesFilter?: boolean;
}) {
  const { cask } = props;
  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();

  function installedActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {brewIsOutdated(cask) && <Actions.FormulaUpgradeAction formula={cask} onAction={props.onAction} />}
          {(props.showDetailsAction ?? true) && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<CaskInfo cask={cask} isInstalled={props.isInstalled} onAction={props.onAction} />}
            />
          )}
          <Action.ShowInFinder path={brewInstallPath(cask)} />
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

        <ViewSection
          onToggleSidebar={props.onToggleSidebar}
          metadataPanelVisible={props.metadataPanelVisible}
          showDescription={props.showDescription}
          onToggleDescription={props.onToggleDescription}
          sortByPopularity={props.sortByPopularity}
          onToggleSort={props.onToggleSort}
        />
        <DebugSection obj={cask} />
      </ActionPanel>
    );
  }

  function uninstalledActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Actions.FormulaInstallAction formula={cask} onAction={props.onAction} />
          {(props.showDetailsAction ?? true) && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<CaskInfo cask={cask} isInstalled={props.isInstalled} onAction={props.onAction} />}
            />
          )}
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
        <ViewSection
          onToggleSidebar={props.onToggleSidebar}
          metadataPanelVisible={props.metadataPanelVisible}
          showDescription={props.showDescription}
          onToggleDescription={props.onToggleDescription}
          sortByPopularity={props.sortByPopularity}
          onToggleSort={props.onToggleSort}
        />
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
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
  /**
   * Offer the pushed Details view. Defaults to true.
   *
   * It is always rendered, but never ahead of the action someone actually came
   * for: Install on an uninstalled package, Upgrade on an outdated one. It only
   * takes the primary slot on an installed, up-to-date package, where the
   * alternative was Show in Finder. Previously it was suppressed entirely
   * whenever the detail sidebar was open, which is what made Show in Finder the
   * default action there.
   *
   * Only the Details view itself passes false, so it cannot push a copy of itself.
   */
  showDetailsAction?: boolean;
  onToggleSidebar?: () => void;
  sortByPopularity?: boolean;
  onToggleSort?: () => void;
  showDescription?: boolean;
  onToggleDescription?: () => void;
  metadataPanelVisible?: boolean;
  /**
   * Offer the Hide Dependencies filter. Installed-list only: nothing in the
   * search results is filtered by `excludeDependencies`, so there the action
   * would toggle a setting with no visible effect.
   */
  showDependenciesFilter?: boolean;
}) {
  const { formula } = props;
  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();

  function installedActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {brewIsOutdated(formula) && <Actions.FormulaUpgradeAction formula={formula} onAction={props.onAction} />}
          {(props.showDetailsAction ?? true) && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<FormulaInfo formula={formula} isInstalled={props.isInstalled} onAction={props.onAction} />}
            />
          )}
          <Action.ShowInFinder path={brewInstallPath(formula)} />
          <Actions.FormulaPinAction formula={formula} onAction={props.onAction} />
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

        <ViewSection
          onToggleSidebar={props.onToggleSidebar}
          metadataPanelVisible={props.metadataPanelVisible}
          showDescription={props.showDescription}
          onToggleDescription={props.onToggleDescription}
          sortByPopularity={props.sortByPopularity}
          onToggleSort={props.onToggleSort}
        >
          {props.showDependenciesFilter ? <Actions.FormulaShowAllInstalled onAction={props.onAction} /> : null}
        </ViewSection>
        <DebugSection obj={formula} />
      </ActionPanel>
    );
  }

  function uninstalledActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Actions.FormulaInstallAction formula={formula} onAction={props.onAction} />
          {(props.showDetailsAction ?? true) && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<FormulaInfo formula={formula} isInstalled={props.isInstalled} onAction={props.onAction} />}
            />
          )}
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

        <ViewSection
          onToggleSidebar={props.onToggleSidebar}
          metadataPanelVisible={props.metadataPanelVisible}
          showDescription={props.showDescription}
          onToggleDescription={props.onToggleDescription}
          sortByPopularity={props.sortByPopularity}
          onToggleSort={props.onToggleSort}
        />
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

interface OutdatedActionProps {
  outdated: OutdatedCask | OutdatedFormula;
  /** Called when the upgrade starts or finishes, e.g. to show its status in a list */
  onUpgrade?: (status: UpgradePackageStatus) => void;
  onAction: (result: boolean) => void;
}

function isPinable(o: OutdatedCask | OutdatedFormula): o is OutdatedFormula {
  return (o as OutdatedFormula).pinned != undefined;
}

/**
 * Per-package upgrade action, reporting status to the caller when it shows
 * the upgrade status itself — an upgraded package then remains visible in the
 * list, with its status — and refreshing the list otherwise.
 */
export function OutdatedUpgradeAction(props: OutdatedActionProps) {
  function onUpgradeAction(result: boolean) {
    if (props.onUpgrade) {
      props.onUpgrade(result ? "upgraded" : "failed");
    } else {
      props.onAction(result);
    }
  }

  return (
    <Actions.FormulaUpgradeAction
      formula={props.outdated}
      onStart={() => props.onUpgrade?.("upgrading")}
      onSkip={() => props.onUpgrade?.("skipped")}
      onAction={onUpgradeAction}
    />
  );
}

/**
 * Per-package sections shared by the outdated surfaces: single upgrade, pin,
 * refresh, copy/terminal commands and uninstall. A fragment so Show Upgrades
 * can append them beneath its selection actions.
 */
export function OutdatedActionSections(
  props: OutdatedActionProps & {
    /**
     * Omit the per-package upgrade action from the sections. For rows that
     * hoist that action to the panel's first slot (so a run action can take
     * the second slot, where Raycast binds ⌘↩) without listing it twice.
     */
    omitUpgrade?: boolean;
    /**
     * Omit the pin action. For rows that hoist a selection-aware pin action
     * of their own — two Pin entries with different selection behaviour would
     * otherwise share the panel.
     */
    omitPin?: boolean;
  },
) {
  const { outdated } = props;
  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();

  return (
    <>
      <ActionPanel.Section>
        {!props.omitUpgrade && (
          <OutdatedUpgradeAction outdated={outdated} onUpgrade={props.onUpgrade} onAction={props.onAction} />
        )}
        {!props.omitPin && isPinable(outdated) && (
          <Actions.FormulaPinAction formula={outdated} onAction={props.onAction} />
        )}
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
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
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
    </>
  );
}

export function OutdatedActionPanel(
  props: OutdatedActionProps & {
    /** Overrides the default "Upgrade All", e.g. to report progress per package */
    onUpgradeAll?: () => void;
  },
) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <OutdatedUpgradeAction outdated={props.outdated} onUpgrade={props.onUpgrade} onAction={props.onAction} />
        <Actions.FormulaUpgradeAllAction onUpgradeAll={props.onUpgradeAll} onAction={props.onAction} />
      </ActionPanel.Section>
      <OutdatedActionSections
        outdated={props.outdated}
        onUpgrade={props.onUpgrade}
        onAction={props.onAction}
        omitUpgrade
      />
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
