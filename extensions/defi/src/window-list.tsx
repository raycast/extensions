import { Action, ActionPanel, Color, environment, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, useCachedState, useFrecencySorting } from "@raycast/utils";
import { useState } from "react";
import { runAndClose } from "./defi";
import { useDesktop } from "./desktop";
import { ErrorView } from "./error-view";
import { workspaceLabel, type DefiWindow, type DefiWorkspace } from "./parse";
import { StripDetail } from "./strip-detail";
import { stripColumns } from "./strip";
import { workspaceAccessories, workspaceIcon } from "./workspace-icon";

const current = "current";

// Reads Defi before acting, reporting a failure where the user still sees it.
async function readOrReport<T>(read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read();
  } catch (error) {
    await showFailureToast(error, { title: "Cannot Reach Defi" });
    return undefined;
  }
}

// Where to move a window: cached workspaces at once, then a fresh read; a target that has gone
// in between fails with Defi's own message.
function MoveTargets({
  from,
  subject,
  onMove,
}: {
  from?: string;
  subject: string;
  onMove: (workspace: DefiWorkspace) => void;
}) {
  const { workspaces, isLoading, error, revalidate, displayCount, appIcon, appName } = useDesktop();
  const targets = error ? [] : (workspaces ?? []).filter((workspace) => workspace.id !== from);
  const displays = [...new Set(targets.map((workspace) => workspace.display))];
  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Move “${subject}”`}
      searchBarPlaceholder="Search workspaces by name, number, or app"
    >
      {error ? <ErrorView error={error} onRetry={revalidate} /> : null}
      {displays.map((display) => (
        <List.Section key={display} title={displayCount > 1 ? `Display ${display}` : undefined}>
          {targets
            .filter((workspace) => workspace.display === display)
            .map((workspace) => (
              <List.Item
                key={workspace.id}
                icon={workspaceIcon(workspace, workspace.active)}
                title={workspaceLabel(workspace)}
                keywords={[String(workspace.position), ...workspace.applications.map(appName)]}
                accessories={workspaceAccessories(workspace, appIcon, appName)}
                actions={
                  <ActionPanel>
                    <Action title="Move Window Here" icon={Icon.ArrowRight} onAction={() => onMove(workspace)} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

// The window switcher; with workspaceID it lists that workspace only, as Search Workspaces opens it.
export function WindowList({ initialSearch = "", workspaceID }: { initialSearch?: string; workspaceID?: string }) {
  const desktop = useDesktop();
  const { windows, workspaces, displayCount, appIcon, current: here } = desktop;
  const [searchText, setSearchText] = useState(initialSearch);
  const [showDetail, setShowDetail] = useCachedState("windows-strip", false);
  // Every launch starts on all workspaces, so a narrowed list never surprises.
  const [chosenScope, setScope] = useState("");
  const withWindows = workspaces?.filter((workspace) => workspace.windowCount > 0) ?? [];
  const scope = workspaceID ?? chosenScope;
  // shortcut: ranks windows by picks made here, not by Defi's focus history, and keeps the ranks of
  // closed windows; use Defi's order once list-windows exposes it (feat/recent-windows-switcher keeps one).
  const { data: ranked, visitItem } = useFrecencySorting(windows, { key: (window) => String(window.id) });
  const scopeID = scope === current ? here?.id : scope;
  const scopeName = workspaces?.find((workspace) => workspace.id === scopeID);
  // Cached rows would look live while Defi is unreachable, so an error hides them.
  const inScope = desktop.error ? [] : ranked.filter((window) => !scopeID || window.workspace?.id === scopeID);
  // The focused window goes last: Enter on it would change nothing.
  const sorted = [...inScope.filter((window) => !window.focused), ...inScope.filter((window) => window.focused)];
  const dark = environment.appearance === "dark";

  const position = (window: DefiWindow) => {
    if (!window.workspace || !window.column) return "Floating";
    const columns = stripColumns(windows ?? [], window.workspace.id);
    const stack = columns[window.column - 1]?.length ?? 1;
    const place = `Column ${window.column} of ${columns.length}`;
    return stack > 1 ? `${place}, row ${window.row} of ${stack}` : place;
  };

  // shortcut: acting on a window first focuses it, which shows its workspace; a CLI command
  // that takes a window ID would avoid that switch.
  const act = async (window: DefiWindow, then: string[][] = [], hud?: string) => {
    await visitItem(window);
    await runAndClose([["focus-window-id", String(window.id)], ...then], hud);
  };

  const scopeMenu = workspaceID ? undefined : (
    <List.Dropdown tooltip="Show Windows On" value={scope} onChange={setScope}>
      <List.Dropdown.Item title="All Workspaces" value="" icon={Icon.AppWindowGrid3x3} />
      {here ? <List.Dropdown.Item title="Current Workspace" value={current} icon={Icon.Eye} /> : null}
      <List.Dropdown.Section>
        {withWindows.map((workspace) => (
          <List.Dropdown.Item
            key={workspace.id}
            title={
              displayCount > 1
                ? `${workspaceLabel(workspace)} on Display ${workspace.display}`
                : workspaceLabel(workspace)
            }
            value={workspace.id}
            icon={workspaceIcon(workspace)}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const emptyView = () => {
    if (desktop.error) return <ErrorView error={desktop.error} onRetry={desktop.revalidate} />;
    if (desktop.isLoading) return null;
    if (scopeID && !searchText) {
      const label = scopeName ? workspaceLabel(scopeName) : "This Workspace";
      return (
        <List.EmptyView
          icon={Icon.Window}
          title={`No Windows on ${label}`}
          actions={
            workspaceID ? undefined : (
              <ActionPanel>
                <Action title="Show All Workspaces" icon={Icon.AppWindowGrid3x3} onAction={() => setScope("")} />
              </ActionPanel>
            )
          }
        />
      );
    }
    return (
      <List.EmptyView
        icon={Icon.Window}
        title={windows?.length ? "No Matching Windows" : "No Windows Yet"}
        description={
          !windows?.length
            ? "Open an app window and Defi will tile it."
            : scopeID
              ? "Try an app or a window title."
              : "Try an app or a workspace name."
        }
      />
    );
  };

  return (
    <List
      isLoading={desktop.isLoading}
      isShowingDetail={showDetail && sorted.length > 0}
      navigationTitle={workspaceID && scopeName ? `Windows on ${workspaceLabel(scopeName)}` : undefined}
      searchBarPlaceholder="Search windows by title, app, or workspace"
      searchBarAccessory={scopeMenu}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering
    >
      {emptyView()}
      {sorted.map((window) => {
        const workspace = window.workspace;
        const label = workspace ? workspaceLabel(workspace) : undefined;
        const fullWorkspace = workspaces?.find((candidate) => candidate.id === workspace?.id);
        return (
          <List.Item
            key={window.id}
            icon={appIcon(window.appID) ?? Icon.Window}
            title={window.title || window.appName}
            subtitle={window.title ? window.appName : undefined}
            keywords={[
              window.appName,
              ...(label ? [label] : []),
              ...(window.floating ? ["floating"] : []),
              ...(displayCount > 1 ? [`display ${window.display}`] : []),
            ]}
            // Rows next to the side pane stay bare; the pane carries the same facts.
            accessories={
              showDetail
                ? undefined
                : [
                    ...(window.focused ? [{ tag: { value: "Focused", color: Color.Blue } }] : []),
                    ...(window.floating ? [{ tag: "Floating" }] : []),
                    // A list scoped to one workspace would repeat its name on every row.
                    ...(fullWorkspace && label && !scopeID
                      ? [
                          {
                            icon: workspaceIcon(fullWorkspace),
                            text: label,
                            tooltip: displayCount > 1 ? `${label} on Display ${window.display}` : label,
                          },
                        ]
                      : []),
                  ]
            }
            detail={
              <StripDetail
                windows={windows ?? []}
                workspaceID={workspace?.id ?? ""}
                highlightID={window.id}
                dark={dark}
                appIcon={appIcon}
                empty=""
              >
                {window.title ? <List.Item.Detail.Metadata.Label title="Title" text={window.title} /> : null}
                <List.Item.Detail.Metadata.Label title="App" text={window.appName} icon={appIcon(window.appID)} />
                {label ? <List.Item.Detail.Metadata.Label title="Workspace" text={label} /> : null}
                {displayCount > 1 ? (
                  <List.Item.Detail.Metadata.Label title="Display" text={String(window.display)} />
                ) : null}
                <List.Item.Detail.Metadata.Label title="Position" text={position(window)} />
                {window.focused ? (
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item text="Focused" color={Color.Blue} />
                  </List.Item.Detail.Metadata.TagList>
                ) : null}
              </StripDetail>
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Window">
                  <Action title="Focus Window" icon={Icon.Window} onAction={() => act(window)} />
                  {/* A pushed list, not a submenu: some launchers flatten submenus, which would give ⌘↵ to its first entry. */}
                  <Action.Push
                    title="Move to Workspace…"
                    icon={Icon.ArrowRight}
                    target={
                      <MoveTargets
                        from={workspace?.id}
                        subject={window.title || window.appName}
                        onMove={(target) =>
                          act(
                            window,
                            [["move-window-to-workspace-name", target.id]],
                            `Moved ${window.appName} to ${workspaceLabel(target)}`,
                          )
                        }
                      />
                    }
                  />
                  {here && workspace && here.id !== workspace.id ? (
                    <Action
                      title={`Bring to ${workspaceLabel(here)}`}
                      icon={Icon.ArrowDownCircle}
                      shortcut={{ modifiers: ["shift"], key: "return" }}
                      onAction={async () => {
                        // The cached current workspace may be stale while the list reloads.
                        const state = await readOrReport(desktop.fresh);
                        if (!state) return;
                        const latest = state.workspaces.find((w) => w.active && w.focusedDisplay);
                        const target = latest && latest.id !== workspace.id ? latest : undefined;
                        await act(
                          window,
                          target ? [["move-window-to-workspace-name", target.id]] : [],
                          target ? `Brought ${window.appName} to ${workspaceLabel(target)}` : undefined,
                        );
                      }}
                    />
                  ) : null}
                  <Action
                    title={window.floating ? "Tile Window" : "Float Window"}
                    icon={window.floating ? Icon.AppWindowGrid2x2 : Icon.Layers}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    onAction={() =>
                      act(window, [["toggle-floating"]], `${window.floating ? "Tiled" : "Floated"} ${window.appName}`)
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Window Title"
                    content={window.title || window.appName}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard
                    title="Copy Window ID"
                    content={String(window.id)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title={showDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.AppWindowSidebarRight}
                    shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                    onAction={() => setShowDetail(!showDetail)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={desktop.revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
