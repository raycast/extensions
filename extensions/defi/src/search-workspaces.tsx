import {
  Action,
  ActionPanel,
  Color,
  environment,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { runAndClose } from "./defi";
import { useDesktop } from "./desktop";
import { ErrorView } from "./error-view";
import { workspaceLabel, type DefiWorkspace } from "./parse";
import { StripDetail } from "./strip-detail";
import { WindowList } from "./window-list";
import { workspaceAccessories, workspaceIcon } from "./workspace-icon";

export default function Command(props: LaunchProps) {
  const desktop = useDesktop();
  const { windows, workspaces, focused, displayCount, appIcon, appName } = desktop;
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [showDetail, setShowDetail] = useCachedState("workspaces-detail", false);
  const dark = environment.appearance === "dark";
  // Cached rows would look live while Defi is unreachable, so an error hides them.
  const shown = desktop.error ? [] : (workspaces ?? []);
  const displays = [...new Set(shown.map((workspace) => workspace.display))];

  const actions = (workspace: DefiWorkspace, label: string) => {
    // The cached focus may be stale while the list reloads, so moves check a fresh read.
    const move = (command: string, describe: (app: string) => string) => async () => {
      let state;
      try {
        state = await desktop.fresh();
      } catch (error) {
        await showFailureToast(error, { title: "Cannot Reach Defi" });
        return;
      }
      const latest = state.windows.find((window) => window.focused);
      if (!latest || latest.workspace?.id === workspace.id) {
        // Already there is not a failure; no focused window is.
        await showToast(
          latest
            ? { style: Toast.Style.Success, title: `Already on ${label}` }
            : { style: Toast.Style.Failure, title: "No Focused Window" },
        );
        return;
      }
      await runAndClose([[command, workspace.id]], describe(latest.appName));
    };
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title={`Go to ${label}`}
            icon={Icon.ArrowRight}
            onAction={() => runAndClose([["--monitor", String(workspace.display), "workspace", workspace.id]])}
          />
          {/* The secondary action keeps ⌘↵ on every row, so it stays even where it has nothing to move. */}
          <Action
            title="Move Focused Window Here"
            icon={Icon.Window}
            onAction={move("move-window-to-workspace-name", (app) => `Moved ${app} to ${label}`)}
          />
          <Action
            title="Send Focused Window Here"
            icon={Icon.ArrowNe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onAction={move("send-window-to-workspace-name", (app) => `Sent ${app} to ${label}`)}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action
            title="Move Focused Column Here"
            icon={Icon.AppWindowSidebarLeft}
            shortcut={{ modifiers: ["opt"], key: "return" }}
            onAction={move("move-column-to-workspace-name", () => `Moved column to ${label}`)}
          />
          <Action
            title="Send Focused Column Here"
            icon={Icon.ArrowNe}
            shortcut={{ modifiers: ["opt", "shift"], key: "return" }}
            onAction={move("send-column-to-workspace-name", () => `Sent column to ${label}`)}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          {workspace.windowCount > 0 ? (
            <Action.Push
              title="Show Windows"
              icon={Icon.AppWindowList}
              shortcut={Keyboard.Shortcut.Common.Open}
              target={<WindowList workspaceID={workspace.id} />}
            />
          ) : null}
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
    );
  };

  return (
    <List
      isLoading={desktop.isLoading}
      isShowingDetail={showDetail && shown.length > 0}
      searchBarPlaceholder="Search workspaces by name, number, or app"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering
    >
      {desktop.error ? (
        <ErrorView error={desktop.error} onRetry={desktop.revalidate} />
      ) : desktop.isLoading ? null : (
        <List.EmptyView icon={Icon.AppWindowGrid3x3} title="No Matching Workspaces" description="Try an app name." />
      )}
      {displays.map((display) => {
        const onDisplay = shown.filter((workspace) => workspace.display === display);
        return (
          <List.Section
            key={display}
            title={displayCount > 1 ? `Display ${display}` : undefined}
            subtitle={displayCount > 1 && onDisplay[0]?.focusedDisplay ? "Focused" : undefined}
          >
            {onDisplay.map((workspace) => {
              const label = workspaceLabel(workspace);
              return (
                <List.Item
                  key={workspace.id}
                  icon={workspaceIcon(workspace, workspace.active)}
                  title={label}
                  subtitle={
                    workspace.windowCount === 0
                      ? "Empty"
                      : `${workspace.windowCount} window${workspace.windowCount === 1 ? "" : "s"}`
                  }
                  keywords={[String(workspace.position), ...workspace.applications.map(appName)]}
                  // Rows next to the side pane stay bare; the pane names every app.
                  accessories={showDetail ? undefined : workspaceAccessories(workspace, appIcon, appName)}
                  detail={
                    <StripDetail
                      windows={windows ?? []}
                      workspaceID={workspace.id}
                      highlightID={focused?.id}
                      dark={dark}
                      appIcon={appIcon}
                      empty={
                        workspace.windowCount
                          ? "Only floating windows."
                          : "No windows yet. Go here, or move the focused window here with ⌘↵."
                      }
                    >
                      <List.Item.Detail.Metadata.Label
                        title="Windows"
                        text={workspace.windowCount ? String(workspace.windowCount) : "None"}
                      />
                      {workspace.active ? (
                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item text="Active" color={Color.Blue} />
                        </List.Item.Detail.Metadata.TagList>
                      ) : null}
                      {displayCount > 1 ? (
                        <List.Item.Detail.Metadata.Label title="Display" text={String(display)} />
                      ) : null}
                    </StripDetail>
                  }
                  actions={actions(workspace, label)}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
