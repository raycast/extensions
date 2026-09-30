import React from "react";
import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import {
  brewAdoptCommand,
  brewInstallCommand,
  brewInstallPath,
  brewIsInstalled,
  brewIsOutdated,
  brewHost,
  brewUninstallCommand,
  brewUpgradeCommand,
  caskHasSymlinkArtifacts,
  HOMEBREW_7,
  type Cask,
  type Formula,
  type OutdatedCask,
  type OutdatedFormula,
  type UpgradePackageStatus,
} from "../utils";
import { uninstallableReason } from "../utils/brew/installability";
import { hasNextPage } from "../utils/paging";
import { useTerminalApp } from "../utils/terminal";
import { useBrewMajorVersion } from "../hooks/useBrewMajorVersion";
import type { PagingProps } from "./list";
import * as Actions from "./actions";
import { CaskInfo } from "./caskInfo";
import { FormulaInfo } from "./formulaInfo";
import { InstallPreview, UpgradePreview } from "./installPreview";

/**
 * Outdated only — the caller gates on it: an up-to-date package has no plan to
 * show, and the dry run would come back with brew's "already installed" line.
 *
 * ⌘⌥I, not the ⌘⇧I that Preview Install uses: Show Upgrades already binds ⌘⇧I
 * to the whole-machine Preview Upgrades, and one action cannot mean two scopes
 * — so the single-package preview takes one binding that is free in both panels.
 */
const PreviewUpgradeAction = (props: { item: Cask | Formula; onAction: (result: boolean) => void }) => (
  <Action.Push
    title="Preview Upgrade"
    icon={Icon.Eye}
    shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
    target={<UpgradePreview target={props.item} onAction={props.onAction} />}
  />
);

const PreviewInstallAction = (props: { item: Cask | Formula; onAction: (result: boolean) => void }) => (
  <Action.Push
    title="Preview Install"
    icon={Icon.Eye}
    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
    target={<InstallPreview item={props.item} onAction={props.onAction} />}
  />
);

export const ToggleSidebarAction = (props: { onToggleSidebar: () => void }) => (
  <Action
    title="Toggle Sidebar"
    icon={Icon.AppWindowSidebarRight}
    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
    onAction={props.onToggleSidebar}
  />
);

export const RefreshAction = (props: { onRefresh: () => void }) => (
  <Action
    title="Refresh"
    icon={Icon.ArrowClockwise}
    shortcut={Keyboard.Shortcut.Common.Refresh}
    onAction={props.onRefresh}
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
    // ⌘⇧P is free: Keyboard.Shortcut.Common.Pin is ⌘. on macOS (verified
    // against the Raycast 2.4.1 runtime), so the Pin action here does not collide.
    // The API docs say ⌘⇧P and are wrong — see raycast/extensions#30879.
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
/**
 * Move the result window. Rendered in every row's panel, not only on the footer
 * row, so paging does not require scrolling to the bottom first.
 *
 * Next/Previous are ⌘↓/⌘↑; First/Last are ⌘⇧↑/⌘⇧↓, written out rather
 * than taken from `Common.MoveUp`/`MoveDown`. Those two constants mean "move
 * the selected item", not "jump to a page", and the Raycast runtime resolves
 * them to ⌘⌥↑/⌘⌥↓ — NOT the ⌘⇧ arrows that `@raycast/eslint-plugin` 2.2.0
 * reports for them. Validate bindings against the runtime, never the linter.
 * The dedicated page/home/end keys would read better — they mean exactly this
 * and nothing else — but a laptop keyboard has none of them, so those bindings
 * were unreachable for most users.
 *
 * The footer row also makes Next Page its PRIMARY action, so ⏎ pages forward
 * without needing any of these.
 */
export const PagingSection = (props: { paging: PagingProps }) => {
  const { paging } = props;
  const hasNext = hasNextPage(paging.page, paging.totalPages);
  const hasPrevious = paging.page > 0;

  if (!hasNext && !hasPrevious) {
    return null;
  }
  return (
    <ActionPanel.Section title={`Page ${paging.page + 1} of ${paging.totalPages}`}>
      {hasNext && (
        <Action
          title="Next Page"
          icon={Icon.ArrowRightCircle}
          shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
          onAction={() => paging.goToPage(paging.page + 1)}
        />
      )}
      {hasPrevious && (
        <Action
          title="Previous Page"
          icon={Icon.ArrowLeftCircle}
          shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
          onAction={() => paging.goToPage(paging.page - 1)}
        />
      )}
      {hasPrevious && (
        <Action
          title="First Page"
          icon={Icon.ChevronUp}
          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          onAction={() => paging.goToPage(0)}
        />
      )}
      {hasNext && (
        <Action
          title="Last Page"
          icon={Icon.ChevronDown}
          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
          onAction={() => paging.goToPage(paging.totalPages - 1)}
        />
      )}
    </ActionPanel.Section>
  );
};

const ViewSection = (props: {
  onToggleSidebar?: () => void;
  /** Whether the detail sidebar is currently on screen. */
  metadataPanelVisible?: boolean;
  /** Page navigation, when the matches span more than one page. */
  paging?: PagingProps;
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

  if (!props.onToggleSidebar && !canToggleDescription && !props.onToggleSort && !props.children && !props.paging) {
    return null;
  }
  return (
    <>
      {props.paging && <PagingSection paging={props.paging} />}
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
          <SortByPopularityAction
            sortByPopularity={props.sortByPopularity ?? false}
            onToggleSort={props.onToggleSort}
          />
        )}
      </ActionPanel.Section>
    </>
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
  /** Page navigation, rendered in every row so paging works from anywhere. */
  paging?: PagingProps;
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
  const { major } = useBrewMajorVersion();
  // brew takes no cask lock on link/unlink, so nothing but this stops two
  // overlapping runs. `Action` has no disabled prop: drop the section instead.
  const [linkInFlight, setLinkInFlight] = React.useState(false);

  function installedActionPanel() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {brewIsOutdated(cask) && <Actions.FormulaUpgradeAction formula={cask} onAction={props.onAction} />}
          {brewIsOutdated(cask) && <PreviewUpgradeAction item={cask} onAction={props.onAction} />}
          {(props.showDetailsAction ?? true) && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<CaskInfo cask={cask} isInstalled={props.isInstalled} onAction={props.onAction} />}
            />
          )}
          <Action.ShowInFinder path={brewInstallPath(cask)} />
          <Actions.PinAction item={cask} kind="cask" onAction={props.onAction} />
          {/* Offered unconditionally. Gating it on !brewIsOutdated hid it in the
              exact case it exists for: a STALE flag. A cached outdated:true that
              the user has since resolved elsewhere would leave Upgrade as the
              only way to correct the row. */}
          <Actions.CheckForUpdatesAction item={cask} onAction={props.onAction} />
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
        {major !== undefined && major >= HOMEBREW_7 && caskHasSymlinkArtifacts(cask) !== false && !linkInFlight && (
          <ActionPanel.Section title="Symlinks">
            <Actions.CaskLinkAction cask={cask} action="link" onBusy={setLinkInFlight} onAction={props.onAction} />
            <Actions.CaskLinkAction cask={cask} action="unlink" onBusy={setLinkInFlight} onAction={props.onAction} />
          </ActionPanel.Section>
        )}
        <ActionPanel.Section>
          <Actions.FormulaUninstallAction formula={cask} onAction={props.onAction} />
          {/* A pinned package cannot be uninstalled without --force, which the
              command builder does not add — so no command is offered to paste. */}
          {!cask.pinned && (
            <>
              <Action.CopyToClipboard
                title="Copy Uninstall Command"
                content={brewUninstallCommand(cask)}
                // ⌘⇧⌥C, matching the same action in the outdated panel. It cannot
                // stay on ⌘⌥C: that is Common.CopyName, which Copy Cask URL holds
                // in this same panel.
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
              />
              <Action
                title={`Run Uninstall in ${terminalName}`}
                icon={terminalIcon}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                onAction={() => runCommandInTerminal(brewUninstallCommand(cask))}
              />
            </>
          )}
        </ActionPanel.Section>

        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Cask ID" content={cask.token} shortcut={Keyboard.Shortcut.Common.Copy} />
          {cask.tap && <Action.CopyToClipboard title="Copy Tap Name" content={cask.tap} />}
        </ActionPanel.Section>

        <ViewSection
          paging={props.paging}
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
    // brew would refuse this one (disabled, wrong OS, macOS version, arch), and
    // `--adopt` runs the same `check_requirements`. `Action` has no disabled
    // prop, so omitting the actions is the only honest form; the Copy actions
    // stay for anyone deliberately running it themselves (e.g. `arch -x86_64`).
    const blocked = uninstallableReason(cask, brewHost) !== undefined;
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {!blocked && <Actions.FormulaInstallAction formula={cask} onAction={props.onAction} />}
          {(props.showDetailsAction ?? true) && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<CaskInfo cask={cask} isInstalled={props.isInstalled} onAction={props.onAction} />}
            />
          )}
          {!blocked && <PreviewInstallAction item={cask} onAction={props.onAction} />}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Cask ID" content={cask.token} shortcut={Keyboard.Shortcut.Common.Copy} />
          {cask.tap && <Action.CopyToClipboard title="Copy Tap Name" content={cask.tap} />}
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={brewInstallCommand(cask)}
            // ⌘⌥I joins the install family (⌘I Install, ⌘⇧I Preview Install).
            // ⌘⌥C is Common.CopyName here (Copy Cask URL) and ⌘⇧⌥C is Copy Adopt
            // Command; Preview Upgrade's ⌘⌥I is installed-only, so this panel is free.
            shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
          />
          {!blocked && (
            <Action
              title={`Run Install in ${terminalName}`}
              icon={terminalIcon}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() => runCommandInTerminal(brewInstallCommand(cask))}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Adopt Command"
            content={brewAdoptCommand(cask)}
            shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
          />
          {!blocked && (
            <Action
              title={`Run Adopt in ${terminalName}`}
              icon={terminalIcon}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onAction={() => runCommandInTerminal(brewAdoptCommand(cask))}
            />
          )}
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
          paging={props.paging}
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
  /** Page navigation, rendered in every row so paging works from anywhere. */
  paging?: PagingProps;
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
          {brewIsOutdated(formula) && <PreviewUpgradeAction item={formula} onAction={props.onAction} />}
          {(props.showDetailsAction ?? true) && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<FormulaInfo formula={formula} isInstalled={props.isInstalled} onAction={props.onAction} />}
            />
          )}
          <Action.ShowInFinder path={brewInstallPath(formula)} />
          <Actions.PinAction item={formula} kind="formula" onAction={props.onAction} />
          {/* Offered unconditionally. Gating it on !brewIsOutdated hid it in the
              exact case it exists for: a STALE flag. A cached outdated:true that
              the user has since resolved elsewhere would leave Upgrade as the
              only way to correct the row. */}
          <Actions.CheckForUpdatesAction item={formula} onAction={props.onAction} />
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
          {/* A pinned package cannot be uninstalled without --force, which the
              command builder does not add — so no command is offered to paste. */}
          {!formula.pinned && (
            <>
              <Action.CopyToClipboard
                title="Copy Uninstall Command"
                content={brewUninstallCommand(formula)}
                // ⌘⇧⌥C, matching the same action in the outdated panel. It cannot
                // stay on ⌘⌥C: that is Common.CopyName, which Copy Formula URL holds
                // in this same panel.
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
              />
              <Action
                title={`Run Uninstall in ${terminalName}`}
                style={Action.Style.Destructive}
                icon={terminalIcon}
                shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                onAction={() => runCommandInTerminal(brewUninstallCommand(formula))}
              />
            </>
          )}
        </ActionPanel.Section>

        <ViewSection
          paging={props.paging}
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
    // brew would refuse this one (disabled, wrong OS, macOS version, arch), and
    // `--adopt` runs the same `check_requirements`. `Action` has no disabled
    // prop, so omitting the actions is the only honest form; the Copy actions
    // stay for anyone deliberately running it themselves (e.g. `arch -x86_64`).
    const blocked = uninstallableReason(formula, brewHost) !== undefined;
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {!blocked && <Actions.FormulaInstallAction formula={formula} onAction={props.onAction} />}
          {(props.showDetailsAction ?? true) && (
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<FormulaInfo formula={formula} isInstalled={props.isInstalled} onAction={props.onAction} />}
            />
          )}
          {!blocked && <PreviewInstallAction item={formula} onAction={props.onAction} />}
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
            // ⌘⌥I joins the install family (⌘I Install, ⌘⇧I Preview Install).
            // ⌘⌥C is Common.CopyName here (Copy Formula URL) and ⌘⇧⌥C is Copy Adopt
            // Command; Preview Upgrade's ⌘⌥I is installed-only, so this panel is free.
            shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
          />
          {!blocked && (
            <Action
              title={`Run Install in ${terminalName}`}
              icon={terminalIcon}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() => runCommandInTerminal(brewInstallCommand(formula))}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Adopt Command"
            content={brewAdoptCommand(formula)}
            shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
          />
          {!blocked && (
            <Action
              title={`Run Adopt in ${terminalName}`}
              icon={terminalIcon}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onAction={() => runCommandInTerminal(brewAdoptCommand(formula))}
            />
          )}
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
          paging={props.paging}
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
  /**
   * Which kind this is, stated rather than sniffed. Both kinds report `pinned`,
   * so a value guard cannot separate them, and `isCask()` depends on the
   * synthetic `token` from `normalizeOutdatedResults` having been applied.
   */
  isCask: boolean;
  /**
   * Effective pin state. The payload's own `pinned` can be a stale snapshot
   * from an in-flight fetch, and the review view tracks the live value in its
   * pin overrides — so every guard here reads this, not the payload.
   */
  pinned?: boolean;
  /** Called when the upgrade starts or finishes, e.g. to show its status in a list */
  onUpgrade?: (status: UpgradePackageStatus) => void;
  onAction: (result: boolean) => void;
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
      pinned={props.pinned ?? props.outdated.pinned === true}
      onStart={() => props.onUpgrade?.("upgrading")}
      onSkip={() => props.onUpgrade?.("skipped")}
      onAction={onUpgradeAction}
    />
  );
}

/**
 * Per-package sections shared by the outdated surfaces: pin, copy/terminal
 * commands, refresh and uninstall. A fragment so Show Upgrades can append them
 * beneath its own upgrade actions.
 *
 * The upgrade actions themselves are NOT here: every caller hoists them into
 * the panel's first section, so that the run action lands in the second slot,
 * where Raycast binds ⌘↩.
 */
export function OutdatedActionSections(
  props: OutdatedActionProps & {
    /**
     * Omit the pin action. For rows that hoist a selection-aware pin action
     * of their own — two Pin entries with different selection behaviour would
     * otherwise share the panel.
     */
    omitPin?: boolean;
    /**
     * Omit the upgrade COMMAND actions (copy / run in terminal). For a pinned
     * package: brew refuses an explicitly named pinned package outright
     * (cmd/upgrade.rb, cask/upgrade.rb), so handing the user
     * `brew upgrade --cask docker` to paste is handing them a command that
     * cannot succeed until they unpin.
     */
    omitUpgradeCommand?: boolean;
    /**
     * Actions that belong beside Pin — Show Upgrades' selection actions, which
     * act on the same row and so share its section rather than opening one of
     * their own. Typed off ActionPanel.Section: see ViewSection.
     */
    children?: React.ComponentProps<typeof ActionPanel.Section>["children"];
  },
) {
  const { outdated } = props;
  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();
  const pinned = props.pinned ?? outdated.pinned === true;

  return (
    <>
      {(props.children != undefined || !props.omitPin) && (
        <ActionPanel.Section>
          {props.children}
          {!props.omitPin && (
            <Actions.PinAction item={outdated} kind={props.isCask ? "cask" : "formula"} onAction={props.onAction} />
          )}
        </ActionPanel.Section>
      )}
      {!(props.omitUpgradeCommand ?? pinned) && (
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
      )}
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => props.onAction(true)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Actions.FormulaUninstallAction formula={outdated} pinned={pinned} onAction={props.onAction} />
        {/* brew refuses to uninstall a pinned package without --force, and the
            command builder does not add it — so a pinned row is offered no
            uninstall command it could paste. The action above handles it, with
            an explicit unpin confirmation. */}
        {!pinned && (
          <>
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
          </>
        )}
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
        <OutdatedUpgradeAction
          outdated={props.outdated}
          isCask={props.isCask}
          pinned={props.pinned}
          onUpgrade={props.onUpgrade}
          onAction={props.onAction}
        />
        <Actions.FormulaUpgradeAllAction onUpgradeAll={props.onUpgradeAll} onAction={props.onAction} />
      </ActionPanel.Section>
      <OutdatedActionSections
        outdated={props.outdated}
        isCask={props.isCask}
        onAction={props.onAction}
        pinned={props.pinned}
      />
    </ActionPanel>
  );
}

/**
 * Actions available while an upgrade is running.
 *
 * Other brew actions are omitted, since Homebrew does not support concurrent processes.
 */
export function UpgradingActionPanel(props: {
  outdated: OutdatedCask | OutdatedFormula;
  /** Effective pin state; the payload's own value may be a stale snapshot. */
  pinned?: boolean;
  onCancel: () => void;
}) {
  // A pinned row is skipped by the run, and brew refuses a named pinned
  // package — so it gets no upgrade command to copy.
  const pinned = props.pinned ?? props.outdated.pinned === true;
  return (
    <ActionPanel>
      <Action
        title="Cancel Upgrade"
        icon={Icon.XMarkCircle}
        style={Action.Style.Destructive}
        onAction={props.onCancel}
      />
      {!pinned && (
        <Action.CopyToClipboard
          title="Copy Upgrade Command"
          content={brewUpgradeCommand(props.outdated)}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      )}
    </ActionPanel>
  );
}
