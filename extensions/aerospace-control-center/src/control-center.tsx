import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Grid,
  Icon,
  Keyboard,
  LaunchType,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  getApplications,
  launchCommand,
  openExtensionPreferences,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  ALL_SUBCOMMANDS,
  MonitorInfo,
  ServiceState,
  WindowInfo,
  WorkspaceInfo,
  aerospace,
  diagnoseInstallation,
  errorMessage,
  getServiceSummary,
  listAvailableSubcommands,
  listMonitors,
  listWindows,
  listWorkspaces,
  quitAerospace,
  reloadAerospace,
  resolveConfigPath,
  splitArguments,
  startAerospace,
  toggleAerospace,
} from "./utils/aerospace";
import { readWindowRule, saveWindowRule } from "./utils/rules";
import { coloredIcon, compactGridIcon, CompactGridColor, CompactGridIcon, PALETTE } from "./utils/theme";
import { SETUP_COMPLETE_KEY, SetupGate, checkSetupReadiness } from "./setup";

async function run(title: string, task: () => Promise<{ stdout: string; stderr: string }>, onDone?: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const result = await task();
    toast.style = Toast.Style.Success;
    toast.title = "Done";
    toast.message = result.stdout || result.stderr || title;
    onDone?.();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Command Failed";
    toast.message = errorMessage(error);
  }
}

function CommandAction({
  title,
  args,
  icon = Icon.Play,
  destructive = false,
  onDone,
}: {
  title: string;
  args: string[];
  icon?: Icon;
  destructive?: boolean;
  onDone?: () => void;
}) {
  return (
    <Action
      title={title}
      icon={icon}
      style={destructive ? Action.Style.Destructive : Action.Style.Regular}
      onAction={async () => {
        if (
          destructive &&
          !(await confirmAlert({
            title,
            message: "This may close a window containing unsaved work.",
            primaryAction: { title, style: Alert.ActionStyle.Destructive },
          }))
        )
          return;
        await run(title, () => aerospace(args), onDone);
      }}
    />
  );
}

function OutputView({ title, args }: { title: string; args: string[] }) {
  const [markdown, setMarkdown] = useState("Loading…");
  useEffect(() => {
    aerospace(args)
      .then(({ stdout, stderr }) =>
        setMarkdown(`# ${title}\n\n\`\`\`text\n${stdout || stderr || "(No Output)"}\n\`\`\``),
      )
      .catch((error) => setMarkdown(`# ${title}\n\n${errorMessage(error)}`));
  }, []);
  return <Detail markdown={markdown} />;
}

function MoveToWorkspaceForm({ windowId }: { windowId?: number }) {
  const { pop } = useNavigation();
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  useEffect(() => {
    listWorkspaces()
      .then(setWorkspaces)
      .catch(() => setWorkspaces([]));
  }, []);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Move to Workspace"
            onSubmit={async (values: { workspace: string; follow: boolean }) => {
              const args = ["move-node-to-workspace"];
              if (windowId) args.push("--window-id", String(windowId));
              if (values.follow) args.push("--focus-follows-window");
              args.push(values.workspace);
              await run("Move Window", () => aerospace(args), pop);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="workspace" title="Destination Workspace">
        {workspaces.map((item) => (
          <Form.Dropdown.Item
            key={item.workspace}
            value={item.workspace}
            title={`${item.workspace} — ${item["monitor-name"]}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="follow" label="Follow window after moving" defaultValue />
    </Form>
  );
}

function PersistentRuleForm({ window }: { window: WindowInfo }) {
  const { pop } = useNavigation();
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [floating, setFloating] = useState(false);
  const [workspace, setWorkspace] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listWorkspaces(), readWindowRule(window["app-bundle-id"])])
      .then(([items, state]) => {
        setWorkspaces(items);
        setFloating(state.floating);
        setWorkspace(state.workspace);
      })
      .catch((error) => showToast({ style: Toast.Style.Failure, title: errorMessage(error) }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Persistent Rule"
            onSubmit={async (values: { floating: boolean; workspace: string }) => {
              await run(
                `Save Rule for ${window["app-name"]}`,
                () =>
                  saveWindowRule({
                    bundleId: window["app-bundle-id"],
                    appName: window["app-name"],
                    floating: values.floating,
                    workspace: values.workspace,
                  }),
                pop,
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Application"
        text={`${window["app-name"]} · ${window["app-bundle-id"]}\nThe rule is written to your AeroSpace configuration and applies to future windows from this application. A backup is created before the first change.`}
      />
      <Form.Checkbox id="floating" label="Open new windows as floating" value={floating} onChange={setFloating} />
      <Form.Dropdown id="workspace" title="Default Workspace" value={workspace} onChange={setWorkspace}>
        <Form.Dropdown.Item value="" title="Do Not Assign a Workspace" />
        {workspaces.map((item) => (
          <Form.Dropdown.Item
            key={item.workspace}
            value={item.workspace}
            title={`${item.workspace} — ${item["monitor-name"]}`}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export function WindowsView() {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [appPaths, setAppPaths] = useState<Record<string, string>>({});
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();
  const refresh = () => {
    setLoading(true);
    setLoadError("");
    Promise.all([listWindows(), getApplications()])
      .then(([windowItems, applications]) => {
        setWindows(windowItems);
        setAppPaths(
          Object.fromEntries(
            applications
              .filter((application) => application.bundleId)
              .map((application) => [application.bundleId!, application.path]),
          ),
        );
      })
      .catch((error) => setLoadError(errorMessage(error)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    refresh();
  }, []);

  const workspaceNames = [...new Set(windows.map((window) => window.workspace).filter(Boolean))] as string[];
  const visibleWindows =
    workspaceFilter === "all" ? windows : windows.filter((window) => window.workspace === workspaceFilter);

  return (
    <List
      navigationTitle="AeroSpace Windows"
      isLoading={loading}
      isShowingDetail
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search title, application, or bundle ID…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Workspace" value={workspaceFilter} onChange={setWorkspaceFilter} storeValue>
          <List.Dropdown.Item title="All Workspaces" value="all" />
          {workspaceNames.map((workspace) => (
            <List.Dropdown.Item key={workspace} title={`Workspace ${workspace}`} value={workspace} />
          ))}
        </List.Dropdown>
      }
    >
      {!loading && visibleWindows.length === 0 ? (
        <List.EmptyView
          icon={loadError ? Icon.Pause : Icon.AppWindow}
          title={loadError ? "AeroSpace Is Unavailable" : "No Matching Windows"}
          description={
            loadError
              ? "AeroSpace may be paused or stopped. Start it to browse windows."
              : "Try another workspace filter or search term."
          }
          actions={
            <ActionPanel>
              {loadError ? (
                <Action
                  title="Start AeroSpace"
                  icon={Icon.Play}
                  onAction={() => run("Start AeroSpace", startAerospace, refresh)}
                />
              ) : null}
              <Action
                title="Refresh Windows"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {visibleWindows.map((window) => (
        <List.Item
          key={window["window-id"]}
          id={String(window["window-id"])}
          icon={appPaths[window["app-bundle-id"]] ? { fileIcon: appPaths[window["app-bundle-id"]] } : Icon.AppWindow}
          title={window["app-name"]}
          subtitle={window["window-title"]}
          keywords={[
            window["window-title"],
            window["app-bundle-id"],
            window.workspace || "",
            String(window["window-id"]),
            window["monitor-name"],
            window["window-layout"],
          ]}
          detail={
            <List.Item.Detail
              markdown={`## ${window["app-name"]}\n\n> ${window["window-title"] || "Untitled Window"}\n\n### At a Glance\n\n| | |\n| :-- | :-- |\n| ▦ **Workspace** | ${markdownCell(window.workspace)} |\n| ▰ **Display** | ${markdownCell(window["monitor-name"])} |\n| ◇ **Layout** | ${markdownCell(layoutLabel(window["window-layout"]))} |\n\n### Quick Actions\n\n| | |\n| :-- | :-- |\n| **↵** | Focus this window |\n| **⌘ K** | Move, resize, change layout, or close |`}
            />
          }
          actions={
            <ActionPanel>
              <CommandAction
                title="Focus Window"
                args={["focus", "--window-id", String(window["window-id"])]}
                onDone={popToRoot}
              />
              <Action
                title="Move to Workspace…"
                icon={Icon.ArrowRight}
                onAction={() => push(<MoveToWorkspaceForm windowId={window["window-id"]} />)}
              />
              <Action
                title="Manage Persistent Application Rule…"
                icon={Icon.Gear}
                onAction={() => push(<PersistentRuleForm window={window} />)}
              />
              <ActionPanel.Section title="Layout">
                {window["window-layout"] === "floating" ? (
                  <CommandAction
                    title="Set Tiling"
                    args={["layout", "tiling", "--window-id", String(window["window-id"])]}
                    onDone={refresh}
                  />
                ) : (
                  <CommandAction
                    title="Set Floating"
                    args={["layout", "floating", "--window-id", String(window["window-id"])]}
                    onDone={refresh}
                  />
                )}
                <CommandAction
                  title="Toggle AeroSpace Fullscreen"
                  args={["fullscreen", "--window-id", String(window["window-id"])]}
                />
                <CommandAction
                  title="Toggle macOS Fullscreen"
                  args={["macos-native-fullscreen", "--window-id", String(window["window-id"])]}
                />
                <CommandAction
                  title="Minimize"
                  args={["macos-native-minimize", "--window-id", String(window["window-id"])]}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CommandAction
                  title="Close Window"
                  args={["close", "--window-id", String(window["window-id"])]}
                  icon={Icon.XMarkCircle}
                  destructive
                  onDone={refresh}
                />
                <Action.CopyToClipboard title="Copy Window ID" content={String(window["window-id"])} />
                <Action.CopyToClipboard title="Copy Bundle ID" content={window["app-bundle-id"]} />
                <Action
                  title="Refresh Windows"
                  icon={Icon.RotateClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refresh}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type WorkspaceSummary = WorkspaceInfo & {
  windows: WindowInfo[];
  appNames: string[];
};

function workspaceActions(item: WorkspaceInfo, refresh?: () => void) {
  return (
    <ActionPanel>
      <CommandAction title="Switch to Workspace" args={["workspace", item.workspace]} onDone={popToRoot} />
      <CommandAction title="Move Focused Window Here" args={["move-node-to-workspace", item.workspace]} />
      <CommandAction title="Summon Workspace to Focused Monitor" args={["summon-workspace", item.workspace]} />
      <ActionPanel.Section>
        <CommandAction title="Balance Window Sizes" args={["balance-sizes", "--workspace", item.workspace]} />
        <CommandAction
          title="Flatten Workspace Tree"
          args={["flatten-workspace-tree", "--workspace", item.workspace]}
        />
        {refresh ? (
          <Action
            title="Refresh Workspaces"
            icon={Icon.RotateClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function shorten(value: string, maximum = 54): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maximum ? `${normalized.slice(0, maximum - 1)}…` : normalized;
}

function markdownCell(value: string): string {
  return shorten(value || "Untitled").replace(/\|/g, "\\|");
}

function layoutLabel(layout: string): string {
  return layout
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function workspaceMarkdown(item: WorkspaceSummary): string {
  if (item.windows.length === 0) {
    return `## Workspace ${item.workspace}\n\n> ${item["monitor-name"]}\n\n### Ready for Windows\n\nThis visible workspace is currently empty.\n\n| | |\n| :-- | :-- |\n| **↵** | Switch to this workspace |\n| **⌘ K** | Move a window here or manage its layout |`;
  }

  const rows = item.windows
    .map(
      (window) =>
        `| ${markdownCell(window["app-name"])} | ${markdownCell(window["window-title"])} | ${markdownCell(layoutLabel(window["window-layout"]))} |`,
    )
    .join("\n");
  return `## Workspace ${item.workspace}\n\n> ${item["monitor-name"]} · ${item.windows.length} window${item.windows.length === 1 ? "" : "s"} · ${item.appNames.length} app${item.appNames.length === 1 ? "" : "s"}\n\n### Windows\n\n| Application | Window | Layout |\n| :-- | :-- | :-- |\n${rows}\n\n### Quick Actions\n\n| | |\n| :-- | :-- |\n| **↵** | Switch to this workspace |\n| **⌘ K** | Move, summon, balance, or flatten |`;
}

function appSummary(names: string[]): string {
  const visible = names.slice(0, 3).join(" · ");
  return names.length > 3 ? `${visible} …` : visible;
}

function emptyWorkspacesMarkdown(items: WorkspaceInfo[]): string {
  const byMonitor = new Map<string, string[]>();
  for (const item of items) {
    const monitor = `${item["monitor-name"]} · ID ${item["monitor-id"]}`;
    byMonitor.set(monitor, [...(byMonitor.get(monitor) || []), item.workspace]);
  }
  const rows = [...byMonitor.entries()]
    .map(([monitor, workspaces]) => `| ${markdownCell(monitor)} | ${workspaces.join(" · ")} |`)
    .join("\n");
  return `## Empty Workspaces\n\n| Monitor | Workspaces |\n| :-- | :-- |\n${rows}`;
}

function EmptyWorkspacesView({ items }: { items: WorkspaceInfo[] }) {
  return (
    <List navigationTitle="Empty Workspaces" searchBarPlaceholder="Search empty workspaces or monitors…">
      <List.Section title="Available" subtitle={`${items.length} workspaces`}>
        {items.map((item) => (
          <List.Item
            key={`${item["monitor-id"]}-${item.workspace}`}
            icon={coloredIcon(Icon.Circle, PALETTE.secondary)}
            title={`Workspace ${item.workspace}`}
            subtitle={item["monitor-name"]}
            keywords={[item.workspace, item["monitor-name"], String(item["monitor-id"])]}
            accessories={[{ text: `Monitor ${item["monitor-id"]}` }]}
            actions={workspaceActions(item)}
          />
        ))}
      </List.Section>
    </List>
  );
}

export function WorkspacesView() {
  const [items, setItems] = useState<WorkspaceSummary[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();
  const refresh = () => {
    setLoading(true);
    setLoadError("");
    Promise.all([listWorkspaces(), listWindows()])
      .then(([workspaces, windows]) => {
        setItems(
          workspaces.map((workspace) => {
            const workspaceWindows = windows.filter((window) => window.workspace === workspace.workspace);
            const appNames = [...new Set(workspaceWindows.map((window) => window["app-name"]))];
            return { ...workspace, windows: workspaceWindows, appNames };
          }),
        );
      })
      .catch((error) => setLoadError(errorMessage(error)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    refresh();
  }, []);

  const populated = items.filter(
    (item) => item.windows.length > 0 || item["workspace-is-focused"] || item["workspace-is-visible"],
  );
  const empty = items.filter(
    (item) => item.windows.length === 0 && !item["workspace-is-focused"] && !item["workspace-is-visible"],
  );

  return (
    <List
      navigationTitle="AeroSpace Workspaces"
      isLoading={loading}
      isShowingDetail
      searchBarPlaceholder="Search workspaces or monitors…"
    >
      {!loading && items.length === 0 ? (
        <List.EmptyView
          icon={loadError ? Icon.Pause : Icon.Window}
          title={loadError ? "AeroSpace Is Unavailable" : "No Workspaces"}
          description={
            loadError ? "Start AeroSpace to browse and switch workspaces." : "AeroSpace did not return any workspaces."
          }
          actions={
            <ActionPanel>
              {loadError ? (
                <Action
                  title="Start AeroSpace"
                  icon={Icon.Play}
                  onAction={() => run("Start AeroSpace", startAerospace, refresh)}
                />
              ) : null}
              <Action
                title="Refresh Workspaces"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section title="In Use" subtitle={`${populated.length} workspaces`}>
        {populated.map((item) => (
          <List.Item
            key={`${item["monitor-id"]}-${item.workspace}`}
            icon={coloredIcon(
              item["workspace-is-focused"] ? Icon.Dot : Icon.Window,
              item["workspace-is-focused"] ? PALETTE.green : PALETTE.indigo,
            )}
            title={`Workspace ${item.workspace}`}
            subtitle={`${item["monitor-name"]} · ${
              item.appNames.length > 0 ? appSummary(item.appNames) : "Visible · Empty"
            }`}
            keywords={[
              item.workspace,
              item["monitor-name"],
              String(item["monitor-id"]),
              ...item.appNames,
              ...item.windows.map((window) => window["window-title"]),
            ]}
            accessories={[
              ...(item["workspace-is-focused"]
                ? [
                    {
                      text: "Focused",
                      icon: coloredIcon(Icon.Dot, PALETTE.green),
                    },
                  ]
                : item["workspace-is-visible"]
                  ? [
                      {
                        text: "Visible",
                        icon: coloredIcon(Icon.Eye, PALETTE.blue),
                      },
                    ]
                  : []),
              { text: `${item.windows.length} window${item.windows.length === 1 ? "" : "s"}` },
              { text: `${item.appNames.length} app${item.appNames.length === 1 ? "" : "s"}` },
            ]}
            detail={
              <List.Item.Detail
                markdown={workspaceMarkdown(item)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Workspace" text={item.workspace} icon={Icon.Window} />
                    <List.Item.Detail.Metadata.Label
                      title="Monitor"
                      text={`${item["monitor-name"]} · ID ${item["monitor-id"]}`}
                      icon={Icon.Desktop}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Windows" text={String(item.windows.length)} />
                    <List.Item.Detail.Metadata.Label title="Applications" text={String(item.appNames.length)} />
                    <List.Item.Detail.Metadata.Label
                      title="State"
                      text={
                        item["workspace-is-focused"] ? "Focused" : item["workspace-is-visible"] ? "Visible" : "Inactive"
                      }
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={workspaceActions(item, refresh)}
          />
        ))}
      </List.Section>
      {empty.length > 0 ? (
        <List.Section title="Empty" subtitle={`${empty.length} workspaces`}>
          <List.Item
            icon={coloredIcon(Icon.Ellipsis, PALETTE.secondary)}
            title={`${empty.length} Empty Workspaces`}
            subtitle={shorten(empty.map((item) => item.workspace).join(" · "), 80)}
            accessories={[{ text: "Press Return to expand" }]}
            detail={
              <List.Item.Detail
                markdown={emptyWorkspacesMarkdown(empty)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Available" text={`${empty.length} workspaces`} />
                    <List.Item.Detail.Metadata.Label
                      title="Monitors"
                      text={String(new Set(empty.map((item) => item["monitor-id"])).size)}
                    />
                    <List.Item.Detail.Metadata.Label title="Windows" text="0" />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Expand Empty Workspaces"
                  icon={Icon.ArrowRight}
                  onAction={() => push(<EmptyWorkspacesView items={empty} />)}
                />
                <Action
                  title="Refresh Workspaces"
                  icon={Icon.RotateClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}

type MonitorSummary = MonitorInfo & {
  workspaces: WorkspaceSummary[];
  windows: WindowInfo[];
};

function monitorMarkdown(item: MonitorSummary): string {
  const rows = item.workspaces
    .map(
      (workspace) =>
        `| ${workspace.workspace} | ${workspace.windows.length} | ${workspace.appNames.length} | ${
          workspace["workspace-is-focused"] ? "Focused" : workspace["workspace-is-visible"] ? "Visible" : "Inactive"
        } |`,
    )
    .join("\n");
  return `## ${item["monitor-name"]}\n\n> ${item["monitor-is-main"] ? "Main display" : "Secondary display"} · ${item.workspaces.length} workspace${item.workspaces.length === 1 ? "" : "s"} · ${item.windows.length} window${item.windows.length === 1 ? "" : "s"}\n\n### Workspaces\n\n| Workspace | Windows | Apps | State |\n| :-- | --: | --: | :-- |\n${rows}\n\n### Quick Actions\n\n| | |\n| :-- | :-- |\n| **↵** | Focus this display |\n| **⌘ K** | Move a window or workspace here |`;
}

function MonitorsView() {
  const [items, setItems] = useState<MonitorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([listMonitors(), listWorkspaces(), listWindows()])
      .then(([monitors, workspaces, windows]) => {
        setItems(
          monitors.map((monitor) => {
            const monitorWorkspaces = workspaces
              .filter((workspace) => workspace["monitor-id"] === monitor["monitor-id"])
              .map((workspace) => {
                const workspaceWindows = windows.filter((window) => window.workspace === workspace.workspace);
                return {
                  ...workspace,
                  windows: workspaceWindows,
                  appNames: [...new Set(workspaceWindows.map((window) => window["app-name"]))],
                };
              });
            return {
              ...monitor,
              workspaces: monitorWorkspaces,
              windows: windows.filter((window) => window["monitor-id"] === monitor["monitor-id"]),
            };
          }),
        );
      })
      .catch((error) => showToast({ style: Toast.Style.Failure, title: errorMessage(error) }))
      .finally(() => setLoading(false));
  }, []);
  return (
    <List
      isLoading={loading}
      isShowingDetail
      navigationTitle="AeroSpace Monitors"
      searchBarPlaceholder="Search monitors or workspaces…"
    >
      {items.map((item) => (
        <List.Item
          key={item["monitor-id"]}
          icon={coloredIcon(Icon.Desktop, PALETTE.teal)}
          title={item["monitor-name"]}
          subtitle={`Monitor ${item["monitor-id"]} · Workspaces ${shorten(
            item.workspaces.map((workspace) => workspace.workspace).join(" · "),
            40,
          )}`}
          keywords={[
            item["monitor-name"],
            String(item["monitor-id"]),
            ...item.workspaces.map((workspace) => workspace.workspace),
          ]}
          accessories={[
            ...(item["monitor-is-main"] ? [{ text: "Main", icon: coloredIcon(Icon.CheckCircle, PALETTE.green) }] : []),
            { text: `${item.workspaces.length} workspaces` },
            { text: `${item.windows.length} windows` },
          ]}
          detail={
            <List.Item.Detail
              markdown={monitorMarkdown(item)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Display"
                    text={item["monitor-name"]}
                    icon={coloredIcon(Icon.Desktop, PALETTE.teal)}
                  />
                  <List.Item.Detail.Metadata.Label title="Monitor ID" text={String(item["monitor-id"])} />
                  <List.Item.Detail.Metadata.Label
                    title="macOS Screen ID"
                    text={String(item["monitor-appkit-nsscreen-screens-id"])}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Workspaces" text={String(item.workspaces.length)} />
                  <List.Item.Detail.Metadata.Label title="Windows" text={String(item.windows.length)} />
                  <List.Item.Detail.Metadata.Label
                    title="Role"
                    text={item["monitor-is-main"] ? "Main Monitor" : "Secondary Monitor"}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <CommandAction title="Focus Monitor" args={["focus-monitor", String(item["monitor-id"])]} />
              <CommandAction
                title="Move Focused Window to Monitor"
                args={["move-node-to-monitor", "--focus-follows-window", String(item["monitor-id"])]}
              />
              <CommandAction
                title="Move Focused Workspace to Monitor"
                args={["move-workspace-to-monitor", String(item["monitor-id"])]}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const QUICK_COMMANDS: Array<{
  title: string;
  subtitle: string;
  icon: Icon;
  args: string[];
  section: string;
}> = [
  ...(["left", "down", "up", "right"] as const).map((direction) => ({
    title: `Focus ${direction.charAt(0).toUpperCase()}${direction.slice(1)}`,
    subtitle: `focus ${direction}`,
    icon: Icon.Eye,
    args: ["focus", direction],
    section: "Focus and Move",
  })),
  ...(["left", "down", "up", "right"] as const).map((direction) => ({
    title: `Move ${direction.charAt(0).toUpperCase()}${direction.slice(1)}`,
    subtitle: `move ${direction}`,
    icon: Icon.ArrowRight,
    args: ["move", direction],
    section: "Focus and Move",
  })),
  {
    title: "Focus Back and Forth",
    subtitle: "focus-back-and-forth",
    icon: Icon.Switch,
    args: ["focus-back-and-forth"],
    section: "Focus and Move",
  },
  {
    title: "Swap with Next Window",
    subtitle: "swap dfs-next",
    icon: Icon.Shuffle,
    args: ["swap", "dfs-next"],
    section: "Focus and Move",
  },
  {
    title: "Split Horizontally",
    subtitle: "split horizontal",
    icon: Icon.AppWindowSidebarLeft,
    args: ["split", "horizontal"],
    section: "Layout",
  },
  {
    title: "Split Vertically",
    subtitle: "split vertical",
    icon: Icon.AppWindowSidebarRight,
    args: ["split", "vertical"],
    section: "Layout",
  },
  {
    title: "Set Tiling",
    subtitle: "layout tiling",
    icon: Icon.AppWindowGrid3x3,
    args: ["layout", "tiling"],
    section: "Layout",
  },
  {
    title: "Set Floating",
    subtitle: "layout floating",
    icon: Icon.AppWindow,
    args: ["layout", "floating"],
    section: "Layout",
  },
  {
    title: "Horizontal Tiles",
    subtitle: "layout h_tiles",
    icon: Icon.AppWindowGrid3x3,
    args: ["layout", "h_tiles"],
    section: "Layout",
  },
  {
    title: "Vertical Tiles",
    subtitle: "layout v_tiles",
    icon: Icon.AppWindowGrid3x3,
    args: ["layout", "v_tiles"],
    section: "Layout",
  },
  {
    title: "Horizontal Accordion",
    subtitle: "layout h_accordion",
    icon: Icon.List,
    args: ["layout", "h_accordion"],
    section: "Layout",
  },
  {
    title: "Vertical Accordion",
    subtitle: "layout v_accordion",
    icon: Icon.List,
    args: ["layout", "v_accordion"],
    section: "Layout",
  },
  {
    title: "Shrink Window",
    subtitle: "resize smart -50",
    icon: Icon.Minus,
    args: ["resize", "smart", "-50"],
    section: "Size and Window",
  },
  {
    title: "Grow Window",
    subtitle: "resize smart +50",
    icon: Icon.Plus,
    args: ["resize", "smart", "+50"],
    section: "Size and Window",
  },
  {
    title: "Toggle AeroSpace Fullscreen",
    subtitle: "fullscreen",
    icon: Icon.Maximize,
    args: ["fullscreen"],
    section: "Size and Window",
  },
  {
    title: "Minimize Window",
    subtitle: "macos-native-minimize",
    icon: Icon.MinusCircle,
    args: ["macos-native-minimize"],
    section: "Size and Window",
  },
  {
    title: "Workspace Back and Forth",
    subtitle: "workspace-back-and-forth",
    icon: Icon.Switch,
    args: ["workspace-back-and-forth"],
    section: "Workspace",
  },
  {
    title: "Next Workspace",
    subtitle: "workspace next",
    icon: Icon.ArrowRight,
    args: ["workspace", "next"],
    section: "Workspace",
  },
  {
    title: "Previous Workspace",
    subtitle: "workspace prev",
    icon: Icon.ArrowLeft,
    args: ["workspace", "prev"],
    section: "Workspace",
  },
  {
    title: "Reload Configuration",
    subtitle: "reload-config",
    icon: Icon.RotateClockwise,
    args: ["reload-config"],
    section: "Maintenance",
  },
  {
    title: "Balance Sizes",
    subtitle: "balance-sizes",
    icon: Icon.FullSignal,
    args: ["balance-sizes"],
    section: "Maintenance",
  },
  {
    title: "Flatten Workspace Tree",
    subtitle: "flatten-workspace-tree",
    icon: Icon.Tree,
    args: ["flatten-workspace-tree"],
    section: "Maintenance",
  },
];

function QuickCommandsView() {
  const grouped = QUICK_COMMANDS.reduce<Record<string, typeof QUICK_COMMANDS>>((result, item) => {
    (result[item.section] ||= []).push(item);
    return result;
  }, {});
  const sectionColors: Record<string, CompactGridColor> = {
    "Focus and Move": "blue",
    Layout: "cyan",
    "Size and Window": "orange",
    Workspace: "purple",
    Maintenance: "green",
  };
  const sectionIcons: Record<string, CompactGridIcon> = {
    "Focus and Move": "focus",
    Layout: "layout",
    "Size and Window": "resize",
    Workspace: "workspaces",
    Maintenance: "maintenance",
  };
  return (
    <Grid
      columns={8}
      aspectRatio="1"
      inset={Grid.Inset.Zero}
      searchBarPlaceholder="Search AeroSpace actions…"
      navigationTitle="AeroSpace Quick Actions"
    >
      {Object.entries(grouped).map(([section, items]) => (
        <Grid.Section key={section} title={section} subtitle={`${items.length} actions`} columns={8}>
          {items.map((item) => (
            <Grid.Item
              key={item.subtitle}
              content={{
                value: compactGridIcon(sectionIcons[section] || "bolt", sectionColors[section] || "blue"),
                tooltip: `${item.title} — aerospace ${item.subtitle}`,
              }}
              title={item.title}
              actions={
                <ActionPanel>
                  <CommandAction title={item.title} args={item.args} onDone={popToRoot} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

function AnyCommandForm() {
  const { push } = useNavigation();
  const [subcommands, setSubcommands] = useState<string[]>([...ALL_SUBCOMMANDS]);
  useEffect(() => {
    listAvailableSubcommands().then(setSubcommands);
  }, []);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Command"
            onSubmit={async (values: { command: string; arguments: string; showOutput: boolean }) => {
              try {
                const args = [values.command, ...splitArguments(values.arguments || "")];
                if (values.showOutput) push(<OutputView title={`aerospace ${args.join(" ")}`} args={args} />);
                else await run(`Run ${values.command}`, () => aerospace(args));
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Invalid Arguments",
                  message: errorMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="command" title="Subcommand">
        {subcommands.map((command) => (
          <Form.Dropdown.Item key={command} value={command} title={command} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="arguments" title="Arguments" placeholder='For example: --window-id 123 "workspace name"' />
      <Form.Checkbox id="showOutput" label="Show output in a detail view" defaultValue />
      <Form.Description text="Arguments are passed directly to the AeroSpace CLI without shell interpolation. Single quotes, double quotes, and backslash escaping are supported." />
    </Form>
  );
}

function DiagnosticsView() {
  const [info, setInfo] = useState<Awaited<ReturnType<typeof diagnoseInstallation>> | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    diagnoseInstallation()
      .then(setInfo)
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const markdown = info
    ? info.issues.length
      ? `# Compatibility Check\n\n${info.issues.map((issue) => `- ⚠️ ${issue}`).join("\n")}`
      : "# Compatibility Check\n\n✅ AeroSpace is installed and ready."
    : "# Compatibility Check";

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      metadata={
        info ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={info.state} />
            <Detail.Metadata.Label title="CLI Version" text={info.clientVersion || "Unknown"} />
            <Detail.Metadata.Label title="App Version" text={info.serverVersion || "Not Running"} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="CLI" text={info.binaryPath || "Not Found"} />
            <Detail.Metadata.Label title="Application" text={info.appPath || "Not Found"} />
            <Detail.Metadata.Label title="Configuration" text={info.configPath || "Using Built-in Defaults"} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh Compatibility Check"
            icon={Icon.RotateClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser
            title="Open AeroSpace Installation Guide"
            url="https://nikitabobko.github.io/AeroSpace/guide#installation"
          />
        </ActionPanel>
      }
    />
  );
}

export default function ControlCenter() {
  const [state, setState] = useState<ServiceState>("stopped");
  const [stateLabel, setStateLabel] = useState("Detecting…");
  const [configPath, setConfigPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState<"checking" | "show" | "hidden">("checking");
  const { pop, push } = useNavigation();

  const refresh = async () => {
    setLoading(true);
    const [summary, config] = await Promise.all([getServiceSummary(), resolveConfigPath(true)]);
    setState(summary.state);
    setStateLabel(summary.label);
    setConfigPath(config);
    setLoading(false);
  };
  useEffect(() => {
    refresh();
    const checkInitialSetup = async () => {
      try {
        if ((await LocalStorage.getItem<string>(SETUP_COMPLETE_KEY)) === "true") {
          setSetupMode("hidden");
          return;
        }
        const readiness = await checkSetupReadiness();
        if (readiness.required) {
          setSetupMode("show");
        } else {
          await LocalStorage.setItem(SETUP_COMPLETE_KEY, "true");
          setSetupMode("hidden");
        }
      } catch {
        setSetupMode("show");
      }
    };
    checkInitialSetup();
  }, []);

  const serviceAction =
    state === "enabled"
      ? "Pause AeroSpace"
      : state === "disabled"
        ? "Resume AeroSpace"
        : state === "not-installed"
          ? "Configure AeroSpace"
          : "Start AeroSpace";
  const serviceIcon = state === "enabled" ? Icon.Pause : Icon.Play;
  const serviceSubtitle =
    state === "enabled"
      ? "Automatic window management is active"
      : state === "disabled"
        ? "AeroSpace is running, but window management is paused"
        : state === "not-installed"
          ? "Set up installation paths or install AeroSpace"
          : "Start the app and restore window management";

  if (setupMode === "checking") {
    return <Grid isLoading navigationTitle="AeroSpace Control Center" />;
  }
  if (setupMode === "show") {
    return <SetupGate onExit={() => setSetupMode("hidden")} />;
  }

  return (
    <Grid
      isLoading={loading}
      columns={8}
      aspectRatio="1"
      inset={Grid.Inset.Zero}
      navigationTitle="AeroSpace Control Center"
      searchBarPlaceholder="Search controls…"
    >
      <Grid.Section title="Start Here" subtitle="Guided setup and essential controls" columns={6}>
        <Grid.Item
          content={{
            value: compactGridIcon("tools", "cyan"),
            tooltip: "Check installation health and open the guided setup and repair workflow",
          }}
          title="Setup & Repair"
          subtitle="Guided Setup"
          accessory={{
            icon: coloredIcon(Icon.Stars, PALETTE.teal),
            tooltip: "Recommended starting point",
          }}
          actions={
            <ActionPanel>
              <Action
                title="Open Setup & Repair"
                icon={Icon.WrenchScrewdriver}
                onAction={() => push(<SetupGate onExit={pop} />)}
              />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            value: compactGridIcon("bolt", "yellow"),
            tooltip: "Focus, move, split, resize, and maintain window layouts",
          }}
          title="Quick Actions"
          subtitle="Everyday Controls"
          accessory={{
            icon: coloredIcon(Icon.Bolt, PALETTE.amber),
            tooltip: "Frequently used controls",
          }}
          actions={
            <ActionPanel>
              <Action title="Open Quick Actions" icon={Icon.Bolt} onAction={() => push(<QuickCommandsView />)} />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            value: compactGridIcon("heartbeat", "green"),
            tooltip: "Review detected paths, client and server versions, configuration, and issues",
          }}
          title="Compatibility"
          subtitle="System Health"
          accessory={{
            icon: coloredIcon(Icon.Heartbeat, PALETTE.green),
            tooltip: "Installation and version status",
          }}
          actions={
            <ActionPanel>
              <Action
                title="Run Compatibility Check"
                icon={Icon.Heartbeat}
                onAction={() => push(<DiagnosticsView />)}
              />
            </ActionPanel>
          }
        />
      </Grid.Section>

      <Grid.Section title="Browse and Control" subtitle="Live window management" columns={8}>
        <Grid.Item
          content={{
            value: compactGridIcon("window", "blue"),
            tooltip: "Focus, move, resize, change layout, minimize, or close windows",
          }}
          title="Windows"
          actions={
            <ActionPanel>
              <Action title="Browse Windows" onAction={() => push(<WindowsView />)} />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            value: compactGridIcon("workspaces", "purple"),
            tooltip: "See window and app counts, switch workspaces, summon, balance, or flatten",
          }}
          title="Workspaces"
          actions={
            <ActionPanel>
              <Action title="Browse Workspaces" onAction={() => push(<WorkspacesView />)} />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            value: compactGridIcon("monitor", "cyan"),
            tooltip: "Focus displays or move windows and workspaces between monitors",
          }}
          title="Monitors"
          actions={
            <ActionPanel>
              <Action title="Browse Monitors" onAction={() => push(<MonitorsView />)} />
            </ActionPanel>
          }
        />
      </Grid.Section>

      <Grid.Section title="Service" subtitle="Status and lifecycle" columns={8}>
        <Grid.Item
          content={{
            value: compactGridIcon(
              state === "enabled" ? "status" : "status-ring",
              state === "enabled"
                ? "green"
                : state === "disabled"
                  ? "orange"
                  : state === "not-installed"
                    ? "red"
                    : "blue",
            ),
            tooltip: `${serviceSubtitle}. ${configPath ? "Configuration detected." : "Using built-in defaults."}`,
          }}
          title={stateLabel}
          actions={
            <ActionPanel>
              <Action
                title={serviceAction}
                icon={serviceIcon}
                onAction={() =>
                  state === "not-installed" ? push(<DiagnosticsView />) : run(serviceAction, toggleAerospace, refresh)
                }
              />
              <Action
                title="Run Compatibility Check"
                icon={Icon.Heartbeat}
                onAction={() => push(<DiagnosticsView />)}
              />
              <Action
                title="Refresh Status"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
              {configPath ? <Action.Open title="Open AeroSpace Configuration" target={configPath} /> : null}
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            value: compactGridIcon("reload", "blue"),
            tooltip: "Apply changes from the active aerospace.toml configuration",
          }}
          title="Reload Config"
          actions={
            <ActionPanel>
              <Action
                title="Reload Configuration"
                onAction={() => run("Reload Configuration", reloadAerospace, refresh)}
              />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            value: compactGridIcon("power", "pink"),
            tooltip: "Stop AeroSpace and automatic window management",
          }}
          title="Quit AeroSpace"
          actions={
            <ActionPanel>
              <Action
                title="Quit AeroSpace"
                style={Action.Style.Destructive}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Quit AeroSpace?",
                      message: "Automatic window management will stop.",
                      primaryAction: {
                        title: "Quit",
                        style: Alert.ActionStyle.Destructive,
                      },
                    })
                  )
                    await run("Quit AeroSpace", quitAerospace, refresh);
                }}
              />
            </ActionPanel>
          }
        />
      </Grid.Section>

      <Grid.Section title="Tools" subtitle="Diagnostics and power features" columns={8}>
        <Grid.Item
          content={{
            value: compactGridIcon("menu-bar", "purple"),
            tooltip: "Enable persistent status, workspaces, and controls in the macOS menu bar",
          }}
          title="Menu Bar"
          actions={
            <ActionPanel>
              <Action
                title="Enable Menu Bar Control"
                icon={Icon.Desktop}
                onAction={() =>
                  launchCommand({
                    name: "aerospace-menu-bar",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            value: compactGridIcon("terminal", "yellow"),
            tooltip: `Run any of ${ALL_SUBCOMMANDS.length} detected AeroSpace subcommands`,
          }}
          title="Any Command"
          actions={
            <ActionPanel>
              <Action title="Open Command Form" onAction={() => push(<AnyCommandForm />)} />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            value: compactGridIcon("list", "blue"),
            tooltip: "Inspect applications currently managed by AeroSpace",
          }}
          title="Applications"
          actions={
            <ActionPanel>
              <Action
                title="View Applications"
                onAction={() => push(<OutputView title="Running Applications" args={["list-apps"]} />)}
              />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            value: compactGridIcon("settings", "pink"),
            tooltip: "Inspect active and configured keyboard binding modes",
          }}
          title="Binding Modes"
          actions={
            <ActionPanel>
              <Action
                title="View Binding Modes"
                onAction={() => push(<OutputView title="Binding Modes" args={["list-modes"]} />)}
              />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{
            value: compactGridIcon("code", "cyan"),
            tooltip: "Inspect environment variables available to AeroSpace commands",
          }}
          title="Environment"
          actions={
            <ActionPanel>
              <Action
                title="View Environment Variables"
                onAction={() => push(<OutputView title="Execution Environment" args={["list-exec-env-vars"]} />)}
              />
            </ActionPanel>
          }
        />
      </Grid.Section>
    </Grid>
  );
}
