import { Action, ActionPanel, Clipboard, Icon, Keyboard, List, showHUD } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { useMemo, useState } from "react";
import { PaneDetail } from "./components/pane-detail";
import { SendMessageForm } from "./components/send-message-form";
import { loadWorkspace, openInTab, readOtty, runOtty, sectionsFor, showFailure } from "./lib/otty";
import {
  isOttyUnavailable,
  LoadFailureView,
  runAndClose,
  statusIcon,
  ToggleSidebarAction,
  useInterval,
  usePersistentState,
  useRefreshFailureToast,
  useSpinnerFrame,
} from "./lib/ui";
import {
  activeRowId,
  buildPaneLinkArgs,
  pushRecent,
  sidebarToggles,
  withRecent,
  type Row,
  type ViewMode,
} from "./lib/workspace";

const REFRESH_MS = 3000;

const MODES: Record<ViewMode, { noun: string; icon: Icon }> = {
  tabs: { noun: "Tab", icon: Icon.AppWindowList },
  panes: { noun: "Pane", icon: Icon.AppWindowGrid2x2 },
  windows: { noun: "Window", icon: Icon.AppWindow },
};

export default function Command() {
  const [mode, setMode] = useState<ViewMode>("tabs");
  const [showDetail, setShowDetail] = usePersistentState<boolean>("show-detail-search-tabs", true);
  const [showPreview, setShowPreview] = usePersistentState<boolean>("show-preview-search-tabs", true);
  const [showDetails, setShowDetails] = usePersistentState<boolean>("show-details-search-tabs", true);
  const sidebar = sidebarToggles({
    preview: showPreview,
    details: showDetails,
  });
  const { data, isLoading, error, revalidate } = useCachedPromise(loadWorkspace, [], {
    keepPreviousData: true,
    onError: () => {},
  });
  // Agent states change constantly; keep the list live while it is open.
  // Skip a tick while the last refresh is still running, so a slow Otty can't
  // keep superseding its own requests.
  useInterval(() => {
    if (!isLoading) revalidate();
  }, REFRESH_MS);

  // Tabs, panes, and windows switched to from Raycast, newest first. Ids are
  // unique across kinds (t_, p_, w_), so one list serves all three views.
  const { value: recentIds = [], setValue: setRecentIds } = useLocalStorage<string[]>("recent-targets", []);
  const sections = useMemo(() => (data ? withRecent(sectionsFor(mode, data), recentIds) : []), [data, mode, recentIds]);
  // Only the selected row's sidebar captures its pane.
  const [selectedId, setSelectedId] = useState<string | null>();
  const activeId = activeRowId(sections, selectedId);
  const working = sections.some((section) => section.rows.some((row) => row.agentState === "processing"));
  const frame = useSpinnerFrame(working);

  const isUnavailable = isOttyUnavailable(error);

  useRefreshFailureToast(error, Boolean(data) && !isUnavailable, "Could not refresh Otty");

  const { noun } = MODES[mode];
  const dropdown = (
    <List.Dropdown
      id="search-tabs-view"
      tooltip="Show"
      storeValue
      onChange={(value) => setMode(value in MODES ? (value as ViewMode) : "tabs")}
    >
      {(Object.keys(MODES) as ViewMode[]).map((value) => (
        <List.Dropdown.Item key={value} title={`${MODES[value].noun}s`} value={value} icon={MODES[value].icon} />
      ))}
    </List.Dropdown>
  );

  if (isUnavailable || (error && !data)) {
    return (
      <List searchBarAccessory={dropdown}>
        <LoadFailureView title="Could Not Read Otty" error={error} onRetry={revalidate} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading && !data}
      isShowingDetail={sections.length > 0 && showDetail}
      searchBarPlaceholder={`Search ${noun.toLowerCase()}s`}
      searchBarAccessory={dropdown}
      onSelectionChange={setSelectedId}
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={`No Matching ${noun}s`}
        description="Try a title, folder, or agent name."
      />
      {sections.map((section) => (
        <List.Section key={section.id} title={section.title} subtitle={section.subtitle}>
          {section.rows.map((row) => (
            <List.Item
              key={row.id}
              id={row.id}
              icon={statusIcon(row.agent, row.agentState, mode === "windows" ? Icon.AppWindow : Icon.Terminal, frame)}
              title={row.title}
              // With the sidebar open, only the title fits; Details shows the folder.
              subtitle={showDetail ? undefined : row.subtitle}
              keywords={row.keywords}
              accessories={row.label && !showDetail ? [{ text: row.label, tooltip: row.labelTooltip }] : undefined}
              detail={
                showDetail ? (
                  <PaneDetail
                    row={row}
                    selected={row.id === activeId}
                    showPreview={sidebar.preview}
                    showDetails={sidebar.details}
                  />
                ) : undefined
              }
              actions={
                <RowActions
                  row={row}
                  noun={noun}
                  canMessage={mode !== "windows"}
                  showDetail={showDetail}
                  onToggleDetail={() => setShowDetail((value) => !value)}
                  sidebar={sidebar}
                  onTogglePreview={() => setShowPreview(!sidebar.preview)}
                  onToggleDetails={() => setShowDetails(!sidebar.details)}
                  onChange={revalidate}
                  onVisit={(id) => setRecentIds(pushRecent(recentIds, id))}
                />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function RowActions({
  row,
  noun,
  canMessage,
  showDetail,
  onToggleDetail,
  sidebar,
  onTogglePreview,
  onToggleDetails,
  onChange,
  onVisit,
}: {
  row: Row;
  noun: string;
  canMessage: boolean;
  showDetail: boolean;
  onToggleDetail: () => void;
  sidebar: ReturnType<typeof sidebarToggles>;
  onTogglePreview: () => void;
  onToggleDetails: () => void;
  onChange: () => void;
  onVisit: (id: string) => Promise<void>;
}) {
  const { cwd, paneId } = row;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={`Switch to ${noun}`}
          icon={Icon.ArrowRight}
          onAction={async () => {
            // Record before switching: closing Raycast can cut off a later write.
            await onVisit(row.id);
            if (!(await runAndClose(`Could not switch to ${row.title}`, () => runOtty(row.focusArgs)))) {
              onChange();
            }
          }}
        />
        {canMessage && paneId ? (
          <Action.Push
            title="Send Message"
            icon={Icon.Message}
            target={<SendMessageForm paneId={paneId} title={row.title} />}
          />
        ) : null}
      </ActionPanel.Section>
      {cwd ? (
        <ActionPanel.Section title="Folder">
          <Action
            title="New Tab Here"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={() => runAndClose("Could not open a new tab", () => openInTab(cwd))}
          />
          <Action.ShowInFinder path={cwd} />
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section title="Copy">
        {cwd ? (
          <Action.CopyToClipboard title="Copy Path" content={cwd} shortcut={Keyboard.Shortcut.Common.CopyPath} />
        ) : null}
        {canMessage && paneId ? (
          <Action
            title="Copy Pane Link"
            icon={Icon.Link}
            shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
            onAction={() => copyPaneLink(paneId)}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="View">
        <ToggleSidebarAction showDetail={showDetail} onToggle={onToggleDetail} />
        {showDetail ? (
          <>
            {sidebar.canTogglePreview ? (
              <Action
                title={sidebar.preview ? "Hide Preview" : "Show Preview"}
                icon={Icon.Text}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "y" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "y" },
                }}
                onAction={onTogglePreview}
              />
            ) : null}
            {sidebar.canToggleDetails ? (
              <Action
                title={sidebar.details ? "Hide Details" : "Show Details"}
                icon={Icon.Info}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "i" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "i" },
                }}
                onAction={onToggleDetails}
              />
            ) : null}
          </>
        ) : null}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onChange}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function copyPaneLink(paneId: string) {
  try {
    const link = await readOtty(buildPaneLinkArgs(paneId));
    await Clipboard.copy(link.trim());
    await showHUD("Copied Pane Link");
  } catch (error) {
    await showFailure("Could not copy pane link", error);
  }
}
