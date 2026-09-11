import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useLocalStorage, usePromise } from "@raycast/utils";
import { useState } from "react";
import { AeroSpaceRecoveryActions } from "./components/AeroSpaceRecoveryActions";
import {
  buildWorkspaceCatalog,
  failureToastOptions,
  focusWindow,
  listMonitors,
  listWindows,
  listWorkspaces,
  moveWindowToMonitor,
  moveWindowToWorkspace,
  pullWindowToFocusedWorkspace,
  setWindowLayout,
  toggleWindowFullscreen,
  WindowScope,
  WindowSnapshot,
} from "./utils/aerospace";
import { extractWorkspaceKeys, getConfigPath, loadConfig } from "./utils/config";
import { createWindowRule } from "./utils/rules";
import { resolveWindowScope, WINDOW_SCOPE_STORAGE_KEY } from "./utils/windowScope";

type SwitchAppsLaunchContext = { searchText?: string; workspace?: WindowScope };

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

async function loadWorkspaceDestinations() {
  const [workspaces, config] = await Promise.all([listWorkspaces(), loadConfig().catch(() => ({}))]);
  return buildWorkspaceCatalog(workspaces, [], extractWorkspaceKeys(config));
}

function WorkspaceDestination({ window }: { window: WindowSnapshot }) {
  const { data: workspaces = [], isLoading } = usePromise(loadWorkspaceDestinations);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a workspace">
      {workspaces
        .filter((workspace) => workspace.name !== window.workspace)
        .map((workspace) => (
          <List.Item
            key={workspace.name}
            icon={workspace.isVisible ? Icon.Desktop : Icon.Circle}
            title={`Workspace ${workspace.name}`}
            subtitle={workspace.monitorName}
            accessories={workspace.isFocused ? [{ tag: "focused" }] : workspace.isVisible ? [{ tag: "visible" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Move Window Here"
                  onAction={() =>
                    runWindowAction("Could Not Move Window", () => moveWindowToWorkspace(window.id, workspace.name))
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function MonitorDestination({ window }: { window: WindowSnapshot }) {
  const { data: monitors = [], isLoading } = usePromise(listMonitors);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a monitor">
      {monitors
        .filter((monitor) => monitor.name !== window.monitorName)
        .map((monitor) => (
          <List.Item
            key={monitor.name}
            icon={Icon.Monitor}
            title={monitor.name}
            accessories={monitor.isMain ? [{ tag: "main" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Move Window Here"
                  onAction={() =>
                    runWindowAction("Could Not Move Window", () => moveWindowToMonitor(window.id, monitor.name))
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function WindowRulePreview({ window }: { window: WindowSnapshot }) {
  const rule = createWindowRule(window);
  const { data: configPath } = usePromise(getConfigPath);
  const markdown = [
    `# Rule for ${window.appName}`,
    "",
    `This copy-only helper keeps future **${window.appName}** windows on workspace **${window.workspace}** with the current ${window.layout === "floating" ? "floating" : "tiling"} behavior. Review the snippet before adding it to your config.`,
    "",
    "```toml",
    rule,
    "```",
  ].join("\n");

  return (
    <Detail
      navigationTitle={`Rule for ${window.appName}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Rule" content={rule} />
          {configPath && <Action.OpenWith title="Open Config with…" path={configPath} />}
        </ActionPanel>
      }
    />
  );
}

function WindowActions({ window, onRefresh }: { window: WindowSnapshot; onRefresh: () => Promise<unknown> }) {
  const targetLayout = window.layout === "floating" ? "tiling" : "floating";
  return (
    <ActionPanel>
      <Action
        title="Focus Window"
        onAction={() => runWindowAction("Could Not Focus Window", () => focusWindow(window.id))}
      />
      <ActionPanel.Section title="Move">
        <Action.Push title="Move to Workspace…" icon={Icon.Desktop} target={<WorkspaceDestination window={window} />} />
        <Action.Push title="Move to Monitor…" icon={Icon.Monitor} target={<MonitorDestination window={window} />} />
        <Action
          title="Pull to Current Workspace"
          icon={Icon.ArrowDown}
          shortcut={{ modifiers: ["shift"], key: "enter" }}
          onAction={() => runWindowAction("Could Not Move Window", () => pullWindowToFocusedWorkspace(window.id))}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Layout">
        <Action
          title={`Set to ${targetLayout === "floating" ? "Floating" : "Tiling"}`}
          icon={Icon.AppWindowGrid3x3}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() =>
            runWindowAction("Could Not Change Window Layout", () => setWindowLayout(window.id, targetLayout))
          }
        />
        <Action
          title={window.isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          icon={Icon.Maximize}
          onAction={() => runWindowAction("Could Not Change Fullscreen", () => toggleWindowFullscreen(window.id))}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Configuration">
        <Action.Push title="Copy Rule for This App…" icon={Icon.Code} target={<WindowRulePreview window={window} />} />
      </ActionPanel.Section>
      <Action
        title="Refresh Windows"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={async () => {
          await onRefresh();
          await showToast({ style: Toast.Style.Success, title: "Windows Refreshed" });
        }}
      />
    </ActionPanel>
  );
}

export default function Command(props: LaunchProps<{ launchContext?: SwitchAppsLaunchContext }>) {
  const { defaultWorkspace } = getPreferenceValues<Preferences.SwitchApps>();
  const launchScope = props.launchContext?.workspace;
  const { value: rememberedScope, setValue: rememberScope } = useLocalStorage<WindowScope>(WINDOW_SCOPE_STORAGE_KEY);
  const [sessionScope, setSessionScope] = useState<WindowScope>();
  const scope = resolveWindowScope(sessionScope, launchScope, rememberedScope, defaultWorkspace);
  const [searchText, setSearchText] = useState(props.launchContext?.searchText ?? "");

  const {
    data: windows = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(listWindows, [scope], {
    failureToastOptions: failureToastOptions("Failed to Load Windows"),
  });

  const grouped = new Map<string, { monitor: string; windows: WindowSnapshot[]; focused: boolean; visible: boolean }>();
  for (const window of windows) {
    const existing = grouped.get(window.workspace);
    if (existing) {
      existing.windows.push(window);
    } else {
      grouped.set(window.workspace, {
        monitor: window.monitorName,
        windows: [window],
        focused: window.workspaceIsFocused,
        visible: window.workspaceIsVisible,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search by window, app, or workspace"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Window Scope"
          value={scope}
          onChange={(value) => {
            const nextScope = value as WindowScope;
            setSessionScope(nextScope);
            void rememberScope(nextScope);
          }}
        >
          <List.Dropdown.Item title="Focused" value="focused" />
          <List.Dropdown.Item title="Visible" value="visible" />
          <List.Dropdown.Item title="All" value="all" />
        </List.Dropdown>
      }
    >
      {!isLoading && windows.length === 0 && (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.AppWindowGrid3x3}
          title={error ? "Failed to Load Windows" : "No Windows Found"}
          description={
            error
              ? error.message
              : scope === "focused"
                ? "The focused workspace has no windows. Try Visible or All."
                : scope === "visible"
                  ? "The visible workspaces have no windows. Try All."
                  : "AeroSpace reported no open windows."
          }
          actions={error ? <AeroSpaceRecoveryActions error={error} onRetry={revalidate} /> : undefined}
        />
      )}
      {[...grouped.entries()].map(([workspaceName, group]) => {
        const status = group.focused ? "Focused" : group.visible ? "Visible" : undefined;
        return (
          <List.Section
            key={workspaceName}
            title={`Workspace ${workspaceName}${status ? ` — ${status}` : ""}`}
            subtitle={group.monitor}
          >
            {group.windows.map((window) => (
              <List.Item
                key={window.id}
                title={window.title || window.appName}
                subtitle={window.appName}
                icon={window.appBundlePath ? { fileIcon: window.appBundlePath } : Icon.AppWindow}
                keywords={[
                  window.appName,
                  window.title,
                  window.workspace,
                  window.monitorName,
                  window.appBundleId,
                ].filter(Boolean)}
                accessories={[
                  ...(window.layout === "floating" ? [{ tag: "floating" }] : []),
                  ...(window.isFullscreen ? [{ tag: "fullscreen" }] : []),
                ]}
                actions={<WindowActions window={window} onRefresh={revalidate} />}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
