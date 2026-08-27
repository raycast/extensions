import {
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { AeroSpaceRecoveryActions } from "./components/AeroSpaceRecoveryActions";
import {
  failureToastOptions,
  focusWindow,
  listWindows,
  pullWindowToFocusedWorkspace,
  setWindowTiling,
  WindowSnapshot,
} from "./utils/aerospace";

type SwitchAppsLaunchContext = { searchText?: string };

async function finishWindowAction(): Promise<void> {
  await popToRoot({ clearSearchBar: true });
  await closeMainWindow({ clearRootSearch: true });
}

async function runWindowAction(title: string, operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
    await finishWindowAction();
  } catch (error) {
    await showFailureToast(error, { title });
  }
}

function WindowActions({ window, onRefresh }: { window: WindowSnapshot; onRefresh: () => Promise<unknown> }) {
  return (
    <ActionPanel>
      <Action
        title="Focus Window"
        onAction={() => runWindowAction("Could Not Focus Window", () => focusWindow(window.id))}
      />
      <Action
        title="Pull to Current Workspace"
        icon={Icon.ArrowDown}
        shortcut={{ modifiers: ["shift"], key: "enter" }}
        onAction={() => runWindowAction("Could Not Move Window", () => pullWindowToFocusedWorkspace(window.id))}
      />
      <Action
        title="Set to Tiling"
        icon={Icon.AppWindowGrid3x3}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={async () => {
          try {
            await setWindowTiling(window.id);
            await showToast({ style: Toast.Style.Success, title: "Window Set to Tiling" });
            await finishWindowAction();
          } catch (error) {
            await showFailureToast(error, { title: "Could Not Set Tiling Layout" });
          }
        }}
      />
      <Action
        title="Refresh Windows"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={async () => {
          await onRefresh();
        }}
      />
    </ActionPanel>
  );
}

export default function Command(
  props: LaunchProps<{ arguments: Arguments.SwitchApps; launchContext?: SwitchAppsLaunchContext }>,
) {
  const { defaultWorkspace } = getPreferenceValues<Preferences.SwitchApps>();
  const workspace = props.arguments.workspace ?? defaultWorkspace;
  const [searchText, setSearchText] = useState(props.launchContext?.searchText ?? "");

  const {
    data: windows = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(listWindows, [workspace], {
    failureToastOptions: failureToastOptions("Failed to Load Windows"),
  });

  const grouped = new Map<string, { monitor: string; windows: WindowSnapshot[]; focused: boolean }>();
  for (const window of windows) {
    const existing = grouped.get(window.workspace);
    if (existing) {
      existing.windows.push(window);
    } else {
      grouped.set(window.workspace, {
        monitor: window.monitorName,
        windows: [window],
        focused: window.workspaceIsFocused,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search by app, title, or workspace"
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {!isLoading && windows.length === 0 && (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.AppWindowGrid3x3}
          title={error ? "Failed to Load Windows" : "No Windows Found"}
          description={
            error
              ? error.message
              : workspace === "focused"
                ? "The focused workspace has no windows."
                : "AeroSpace reported no open windows."
          }
          actions={error ? <AeroSpaceRecoveryActions error={error} onRetry={revalidate} /> : undefined}
        />
      )}
      {[...grouped.entries()].map(([workspaceName, group]) => (
        <List.Section key={workspaceName} title={`Workspace ${workspaceName}`} subtitle={group.monitor}>
          {group.windows.map((window) => (
            <List.Item
              key={window.id}
              title={window.appName}
              subtitle={window.title}
              icon={window.appBundlePath ? { fileIcon: window.appBundlePath } : Icon.AppWindow}
              keywords={[window.title, window.workspace, window.monitorName, window.appBundleId].filter(Boolean)}
              accessories={group.focused ? [{ tag: "focused" }] : undefined}
              actions={<WindowActions window={window} onRefresh={revalidate} />}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
