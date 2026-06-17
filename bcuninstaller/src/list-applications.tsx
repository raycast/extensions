import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { XMLParser } from "fast-xml-parser";
import { spawn } from "node:child_process";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import React from "react";

type Preferences = {
  bcuPath: string;
  autoRemoveHighConfidenceJunk: boolean;
};

type InstalledApp = {
  id: string;
  displayName: string;
  publisher: string;
  version: string;
  uninstallKind: string;
  quietUninstallPossible: boolean;
  uninstallPossible: boolean;
  isProtected: boolean;
  systemComponent: boolean;
  isUpdate: boolean;
  aboutUrl: string;
  ratingId: string;
  registryKeyName: string;
  bundleProviderKey: string;
  installLocation: string;
  raw: Record<string, unknown>;
  matchTarget: MatchTarget;
};

type QueueItem = {
  id: string;
  displayName: string;
  quietUninstallPossible: boolean;
  matchTarget: MatchTarget;
};

type BcuExportResult = {
  apps: InstalledApp[];
  stdout: string;
  stderr: string;
};

type BcuUninstallSummary = {
  exitCode: number;
  stdout: string;
  stderr: string;
  quietCount: number;
  nonQuietCount: number;
};

type MatchTarget =
  | { type: "RatingId"; value: string }
  | { type: "RegistryKeyName"; value: string }
  | {
      type: "Fallback";
      displayName: string;
      publisher: string;
      version: string;
    };

type VisibilityMode =
  | "default"
  | "include-updates"
  | "include-system"
  | "include-protected"
  | "all";

type CommandState = {
  apps: InstalledApp[];
  queue: Record<string, QueueItem>;
  isLoading: boolean;
  error: string | null;
  visibilityMode: VisibilityMode;
  selectedItemId: string | null;
  isShowingDetail: boolean;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

const ctrlEnterShortcut: Keyboard.Shortcut = {
  Windows: {
    modifiers: ["ctrl"],
    key: "enter",
  },
  macOS: {
    modifiers: ["cmd"],
    key: "enter",
  },
};

const refreshShortcut: Keyboard.Shortcut = {
  Windows: {
    modifiers: ["ctrl"],
    key: "r",
  },
  macOS: {
    modifiers: ["cmd"],
    key: "r",
  },
};

const clearQueueShortcut: Keyboard.Shortcut = {
  Windows: {
    modifiers: ["ctrl", "shift"],
    key: "backspace",
  },
  macOS: {
    modifiers: ["cmd", "shift"],
    key: "backspace",
  },
};

const toggleDetailShortcut: Keyboard.Shortcut = {
  Windows: {
    modifiers: ["ctrl"],
    key: "d",
  },
  macOS: {
    modifiers: ["cmd"],
    key: "d",
  },
};

const initialExportCacheMs = 5000;

let exportInFlight: {
  bcuPath: string;
  promise: Promise<BcuExportResult>;
} | null = null;

let lastExportResult: {
  bcuPath: string;
  loadedAt: number;
  result: BcuExportResult;
} | null = null;

export default function Command() {
  return <CommandView />;
}

class CommandView extends React.Component<Record<string, never>, CommandState> {
  private readonly preferences = getPreferenceValues<Preferences>();
  private readonly bcuPath = this.preferences.bcuPath;
  private readonly autoRemoveHighConfidenceJunk =
    this.preferences.autoRemoveHighConfidenceJunk;

  state: CommandState = {
    apps: [],
    queue: {},
    isLoading: true,
    error: null,
    visibilityMode: "default",
    selectedItemId: null,
    isShowingDetail: false,
  };

  componentDidMount(): void {
    void this.refreshApps();
  }

  get queuedItems() {
    return Object.values(this.state.queue);
  }

  get filteredApps() {
    const { apps, visibilityMode } = this.state;
    return apps.filter((app) => {
      if (visibilityMode === "all") {
        return true;
      }

      if (app.systemComponent && visibilityMode !== "include-system") {
        return false;
      }

      if (app.isProtected && visibilityMode !== "include-protected") {
        return false;
      }

      if (app.isUpdate && visibilityMode !== "include-updates") {
        return false;
      }

      return true;
    });
  }

  async refreshApps(forceReload = false) {
    this.setState({
      isLoading: true,
      error: null,
    });

    const reusingInFlightRequest =
      !forceReload &&
      exportInFlight !== null &&
      exportInFlight.bcuPath === this.bcuPath;

    const toast = reusingInFlightRequest
      ? null
      : await showToast({
          style: Toast.Style.Animated,
          title: "Refreshing applications",
          message: "Exporting installed software from BC Uninstaller",
        });

    try {
      const exportResult = await getApplicationsExport(
        this.bcuPath,
        forceReload,
      );
      const nextApps = exportResult.apps.sort((left, right) =>
        left.displayName.localeCompare(right.displayName),
      );
      this.setState((current) => ({
        apps: nextApps,
        queue: filterQueueAgainstApps(current.queue, nextApps),
      }));
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Applications refreshed";
        toast.message = `${nextApps.length} apps loaded`;
      }
    } catch (caught) {
      const message = getErrorMessage(caught);
      this.setState({
        error: message,
        apps: [],
      });
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to refresh applications";
        toast.message = message;
      }
    } finally {
      this.setState({
        isLoading: false,
      });
    }
  }

  toggleQueue(app: InstalledApp) {
    this.setState((current) => {
      const nextQueue = { ...current.queue };
      if (nextQueue[app.id]) {
        delete nextQueue[app.id];
      } else {
        nextQueue[app.id] = {
          id: app.id,
          displayName: app.displayName,
          quietUninstallPossible: app.quietUninstallPossible,
          matchTarget: app.matchTarget,
        };
      }

      return { queue: nextQueue };
    });
  }

  async clearQueue() {
    this.setState({
      queue: {},
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Queue cleared",
    });
  }

  async copyIdentifier(app: InstalledApp) {
    await Clipboard.copy(formatMatchTarget(app.matchTarget));
    await showToast({
      style: Toast.Style.Success,
      title: "BCU identifier copied",
      message: app.displayName,
    });
  }

  async uninstallQueuedApps() {
    const queuedItems = this.queuedItems;
    if (queuedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Queue is empty",
        message: "Add one or more applications first",
      });
      return;
    }

    const quietCount = queuedItems.filter(
      (item) => item.quietUninstallPossible,
    ).length;
    const nonQuietCount = queuedItems.length - quietCount;

    const confirmed = await confirmAlert({
      title: `Uninstall ${queuedItems.length} queued app${queuedItems.length === 1 ? "" : "s"}?`,
      message: [
        `${quietCount} quiet-capable`,
        `${nonQuietCount} non-quiet`,
        this.autoRemoveHighConfidenceJunk
          ? "BC Uninstaller will also clean high-confidence leftover registry entries and other uninstall junk."
          : "Automatic high-confidence leftover cleanup is disabled. Enable it in extension settings if you want BC Uninstaller to remove leftover registry entries and other uninstall junk.",
        nonQuietCount > 0
          ? "Non-quiet uninstallers may still require BC Uninstaller automation."
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      primaryAction: {
        title: "Uninstall Queued Apps",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const currentAppsById = new Map(
      this.state.apps.map((app) => [app.id, app]),
    );
    const missingItems = queuedItems.filter(
      (item) => !currentAppsById.has(item.id),
    );
    if (missingItems.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Queue is stale",
        message: "Refresh the application list and try again",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running batch uninstall",
      message: `Submitting ${queuedItems.length} app${queuedItems.length === 1 ? "" : "s"} to BC Uninstaller`,
    });

    try {
      const summary = await uninstallQueuedAppsWithBcu(
        this.bcuPath,
        queuedItems,
        this.autoRemoveHighConfidenceJunk,
      );
      this.setState({
        queue: {},
      });
      toast.style = Toast.Style.Success;
      toast.title = "Batch uninstall launched";
      toast.message = `Quiet: ${summary.quietCount}, non-quiet: ${summary.nonQuietCount}`;
    } catch (caught) {
      const message = getErrorMessage(caught);
      toast.style = Toast.Style.Failure;
      toast.title = "Batch uninstall failed";
      toast.message = message;
    }
  }

  toggleDetail() {
    this.setState((current) => ({
      isShowingDetail: !current.isShowingDetail,
    }));
  }

  render() {
    const { apps, queue, isLoading, error, selectedItemId, isShowingDetail } =
      this.state;
    const filteredApps = this.filteredApps;
    const queuedItems = this.queuedItems;
    const queueCount = queuedItems.length;
    const fallbackSelectedItemId =
      filteredApps[0]?.id ?? (queueCount > 0 ? "queue-summary" : null);
    const effectiveSelectedItemId =
      selectedItemId &&
      (filteredApps.some((app) => app.id === selectedItemId) ||
        selectedItemId === "queue-summary")
        ? selectedItemId
        : fallbackSelectedItemId;
    const selectedApp = selectedItemId
      ? (apps.find((app) => app.id === selectedItemId) ?? null)
      : null;

    return (
      <List
        isLoading={isLoading}
        isShowingDetail={isShowingDetail}
        selectedItemId={effectiveSelectedItemId}
        onSelectionChange={(id) => this.setState({ selectedItemId: id })}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Visibility"
            storeValue
            onChange={(value) =>
              this.setState({ visibilityMode: value as VisibilityMode })
            }
          >
            <List.Dropdown.Item title="Default Safe View" value="default" />
            <List.Dropdown.Item
              title="Include Updates"
              value="include-updates"
            />
            <List.Dropdown.Item
              title="Include System Components"
              value="include-system"
            />
            <List.Dropdown.Item
              title="Include Protected Entries"
              value="include-protected"
            />
            <List.Dropdown.Item title="Show All" value="all" />
          </List.Dropdown>
        }
        searchBarPlaceholder="Search installed software"
      >
        {error ? (
          <List.EmptyView
            title="Could not load applications"
            description={error}
            icon={Icon.ExclamationMark}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh Applications"
                  icon={Icon.ArrowClockwise}
                  onAction={() => this.refreshApps(true)}
                />
                <Action
                  title={
                    isShowingDetail ? "Hide Details Pane" : "Show Details Pane"
                  }
                  icon={
                    isShowingDetail ? Icon.Sidebar : Icon.AppWindowSidebarLeft
                  }
                  onAction={() => this.toggleDetail()}
                  shortcut={toggleDetailShortcut}
                />
              </ActionPanel>
            }
          />
        ) : null}

        {!error && filteredApps.length === 0 && !isLoading ? (
          <List.EmptyView
            title="No applications match the current filters"
            description="Try changing the visibility dropdown or refreshing the list."
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh Applications"
                  icon={Icon.ArrowClockwise}
                  onAction={() => this.refreshApps(true)}
                />
                <Action
                  title={
                    isShowingDetail ? "Hide Details Pane" : "Show Details Pane"
                  }
                  icon={
                    isShowingDetail ? Icon.Sidebar : Icon.AppWindowSidebarLeft
                  }
                  onAction={() => this.toggleDetail()}
                  shortcut={toggleDetailShortcut}
                />
                {queueCount > 0 ? (
                  <Action
                    title="Uninstall Queued Apps"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => this.uninstallQueuedApps()}
                    shortcut={ctrlEnterShortcut}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        ) : null}

        {filteredApps.map((app) => {
          const isQueued = Boolean(queue[app.id]);
          return (
            <List.Item
              key={app.id}
              id={app.id}
              title={app.displayName}
              subtitle={app.publisher || app.version || undefined}
              accessories={buildAccessories(app, isQueued)}
              icon={buildIcon(app, isQueued)}
              keywords={buildKeywords(app)}
              detail={<AppDetail app={app} isQueued={isQueued} />}
              actions={
                <ActionPanel>
                  <Action
                    title={isQueued ? "Remove from Queue" : "Add to Queue"}
                    icon={isQueued ? Icon.MinusCircle : Icon.PlusCircle}
                    onAction={() => this.toggleQueue(app)}
                  />
                  <Action
                    title="Uninstall Queued Apps"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => this.uninstallQueuedApps()}
                    shortcut={ctrlEnterShortcut}
                  />
                  <ActionPanel.Section>
                    <Action
                      title={
                        isShowingDetail
                          ? "Hide Details Pane"
                          : "Show Details Pane"
                      }
                      icon={
                        isShowingDetail
                          ? Icon.Sidebar
                          : Icon.AppWindowSidebarLeft
                      }
                      onAction={() => this.toggleDetail()}
                      shortcut={toggleDetailShortcut}
                    />
                    <Action
                      title="Refresh Applications"
                      icon={Icon.ArrowClockwise}
                      onAction={() => this.refreshApps(true)}
                      shortcut={refreshShortcut}
                    />
                    <Action
                      title="Clear Queue"
                      icon={Icon.XMarkCircle}
                      onAction={() => this.clearQueue()}
                      shortcut={clearQueueShortcut}
                    />
                    <Action
                      title="Copy BCU Identifier"
                      icon={Icon.Clipboard}
                      onAction={() => this.copyIdentifier(app)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
        {selectedApp === null && queueCount > 0 ? (
          <List.Item
            id="queue-summary"
            title={`${queueCount} queued app${queueCount === 1 ? "" : "s"}`}
            icon={Icon.List}
            detail={<QueueDetail items={queuedItems} />}
            actions={
              <ActionPanel>
                <Action
                  title={
                    isShowingDetail ? "Hide Details Pane" : "Show Details Pane"
                  }
                  icon={
                    isShowingDetail ? Icon.Sidebar : Icon.AppWindowSidebarLeft
                  }
                  onAction={() => this.toggleDetail()}
                  shortcut={toggleDetailShortcut}
                />
                <Action
                  title="Uninstall Queued Apps"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => this.uninstallQueuedApps()}
                  shortcut={ctrlEnterShortcut}
                />
                <Action
                  title="Clear Queue"
                  icon={Icon.XMarkCircle}
                  onAction={() => this.clearQueue()}
                  shortcut={clearQueueShortcut}
                />
                <Action
                  title="Refresh Applications"
                  icon={Icon.ArrowClockwise}
                  onAction={() => this.refreshApps(true)}
                  shortcut={refreshShortcut}
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List>
    );
  }
}

function AppDetail(props: { app: InstalledApp; isQueued: boolean }) {
  const { app, isQueued } = props;
  const metadataTags = buildMetadataTags(app, isQueued);

  return (
    <List.Item.Detail
      markdown={buildMarkdown(app)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="State">
            {metadataTags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={tag.text}
                text={tag.text}
                color={tag.color}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Publisher"
            text={app.publisher || "Unknown"}
          />
          <List.Item.Detail.Metadata.Label
            title="Version"
            text={app.version || "Unknown"}
          />
          <List.Item.Detail.Metadata.Label
            title="Uninstall Kind"
            text={app.uninstallKind || "Unknown"}
          />
          <List.Item.Detail.Metadata.Label
            title="Install Location"
            text={app.installLocation || "Unknown"}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Rating ID"
            text={app.ratingId || "None"}
          />
          <List.Item.Detail.Metadata.Label
            title="Registry Key"
            text={app.registryKeyName || "None"}
          />
          <List.Item.Detail.Metadata.Label
            title="Bundle Provider Key"
            text={app.bundleProviderKey || "None"}
          />
          <List.Item.Detail.Metadata.Label
            title="Match Target"
            text={formatMatchTarget(app.matchTarget)}
          />
          {app.aboutUrl ? (
            <List.Item.Detail.Metadata.Link
              title="About URL"
              target={app.aboutUrl}
              text={app.aboutUrl}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function QueueDetail(props: { items: QueueItem[] }) {
  const { items } = props;

  return (
    <List.Item.Detail
      markdown={items.map((item) => `- ${item.displayName}`).join("\n")}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Queued Count"
            text={String(items.length)}
          />
          <List.Item.Detail.Metadata.Label
            title="Quiet-capable"
            text={String(
              items.filter((item) => item.quietUninstallPossible).length,
            )}
          />
          <List.Item.Detail.Metadata.Label
            title="Non-quiet"
            text={String(
              items.filter((item) => !item.quietUninstallPossible).length,
            )}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function buildMarkdown(app: InstalledApp) {
  const lines = [
    `# ${escapeMarkdown(app.displayName)}`,
    "",
    app.publisher
      ? `Publisher: ${escapeMarkdown(app.publisher)}`
      : "Publisher: Unknown",
    app.version
      ? `Version: ${escapeMarkdown(app.version)}`
      : "Version: Unknown",
    app.uninstallKind
      ? `Uninstall Kind: ${escapeMarkdown(app.uninstallKind)}`
      : "Uninstall Kind: Unknown",
    "",
    app.quietUninstallPossible
      ? "Quiet uninstall is available."
      : "Quiet uninstall is not available. BC Uninstaller may need to automate or show more UI.",
  ];

  return lines.join("\n");
}

function buildAccessories(
  app: InstalledApp,
  isQueued: boolean,
): List.Item.Accessory[] {
  const tags: Array<{ value: string; color: Color.ColorLike }> = [];
  if (isQueued) {
    tags.push({ value: "queued", color: Color.Blue });
  }
  tags.push({
    value: app.quietUninstallPossible ? "quiet" : "non-quiet",
    color: app.quietUninstallPossible ? Color.Green : Color.Orange,
  });
  if (app.systemComponent) {
    tags.push({ value: "system", color: Color.SecondaryText });
  }
  if (app.isProtected) {
    tags.push({ value: "protected", color: Color.Red });
  }
  if (app.isUpdate) {
    tags.push({ value: "update", color: Color.Yellow });
  }

  return [{ text: app.version || "" }, ...tags.map((tag) => ({ tag }))].filter(
    (entry) => {
      if ("text" in entry && typeof entry.text === "string") {
        return entry.text.length > 0;
      }
      return true;
    },
  );
}

function buildIcon(app: InstalledApp, isQueued: boolean) {
  if (isQueued) {
    return { source: Icon.CheckCircle, tintColor: Color.Blue };
  }
  if (app.isProtected) {
    return { source: Icon.Lock, tintColor: Color.Red };
  }
  if (app.systemComponent) {
    return { source: Icon.Gear, tintColor: Color.SecondaryText };
  }
  if (app.isUpdate) {
    return { source: Icon.ArrowClockwise, tintColor: Color.Yellow };
  }
  return app.quietUninstallPossible
    ? { source: Icon.Bolt, tintColor: Color.Green }
    : { source: Icon.AppWindow, tintColor: Color.Orange };
}

function buildKeywords(app: InstalledApp) {
  return [
    app.displayName,
    app.publisher,
    app.version,
    app.uninstallKind,
    app.ratingId,
    app.registryKeyName,
    app.bundleProviderKey,
  ].filter(Boolean);
}

function buildMetadataTags(app: InstalledApp, isQueued: boolean) {
  const tags = [];
  if (isQueued) {
    tags.push({ text: "queued", color: Color.Blue });
  }
  tags.push({
    text: app.quietUninstallPossible ? "quiet" : "non-quiet",
    color: app.quietUninstallPossible ? Color.Green : Color.Orange,
  });
  if (app.systemComponent) {
    tags.push({ text: "system", color: Color.SecondaryText });
  }
  if (app.isProtected) {
    tags.push({ text: "protected", color: Color.Red });
  }
  if (app.isUpdate) {
    tags.push({ text: "update", color: Color.Yellow });
  }
  return tags;
}

function filterQueueAgainstApps(
  currentQueue: Record<string, QueueItem>,
  apps: InstalledApp[],
) {
  const appIds = new Set(apps.map((app) => app.id));
  return Object.fromEntries(
    Object.entries(currentQueue).filter(([id]) => appIds.has(id)),
  );
}

async function exportApplications(
  preferencePath: string,
): Promise<BcuExportResult> {
  const bcuConsolePath = await resolveBcuConsolePath(preferencePath);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "raycast-bcu-export-"));
  const exportPath = path.join(tempDir, "applications.xml");

  try {
    const result = await runBcuCommand(bcuConsolePath, [
      "export",
      exportPath,
      "/Q",
      "/U",
    ]);
    await waitForFile(exportPath, 5000);
    const xml = await readFile(exportPath, "utf8");
    const apps = parseExportedApplications(xml);
    if (apps.length === 0) {
      throw new Error(
        "BC Uninstaller export completed but no applications were found.",
      );
    }
    return {
      apps,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function getApplicationsExport(
  preferencePath: string,
  forceReload: boolean,
): Promise<BcuExportResult> {
  const now = Date.now();
  if (
    !forceReload &&
    lastExportResult !== null &&
    lastExportResult.bcuPath === preferencePath &&
    now - lastExportResult.loadedAt <= initialExportCacheMs
  ) {
    return Promise.resolve(lastExportResult.result);
  }

  if (
    !forceReload &&
    exportInFlight !== null &&
    exportInFlight.bcuPath === preferencePath
  ) {
    return exportInFlight.promise;
  }

  const promise = exportApplications(preferencePath)
    .then((result) => {
      lastExportResult = {
        bcuPath: preferencePath,
        loadedAt: Date.now(),
        result,
      };
      return result;
    })
    .finally(() => {
      if (
        exportInFlight !== null &&
        exportInFlight.bcuPath === preferencePath &&
        exportInFlight.promise === promise
      ) {
        exportInFlight = null;
      }
    });

  exportInFlight = {
    bcuPath: preferencePath,
    promise,
  };

  return promise;
}

async function uninstallQueuedAppsWithBcu(
  preferencePath: string,
  items: QueueItem[],
  autoRemoveHighConfidenceJunk: boolean,
): Promise<BcuUninstallSummary> {
  const bcuConsolePath = await resolveBcuConsolePath(preferencePath);
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "raycast-bcu-uninstall-"),
  );
  const listPath = path.join(tempDir, "queued-apps.bcul");
  const xml = buildUninstallListXml(items);
  const args = ["uninstall", listPath, "/Q", "/U"];

  if (autoRemoveHighConfidenceJunk) {
    args.push("/J=VeryGood");
  }

  try {
    await writeFile(listPath, xml, "utf16le");
    const result = await runBcuCommand(bcuConsolePath, args);
    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      quietCount: items.filter((item) => item.quietUninstallPossible).length,
      nonQuietCount: items.filter((item) => !item.quietUninstallPossible)
        .length,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function resolveBcuConsolePath(preferencePath: string) {
  const trimmedPath = preferencePath.trim();
  if (!trimmedPath) {
    throw new Error(
      "Set the BCU Path preference to BCU-console.exe or the BC Uninstaller install folder.",
    );
  }

  const normalizedPath = path.resolve(trimmedPath);
  const lowerPath = normalizedPath.toLowerCase();

  const candidates = lowerPath.endsWith("bcu-console.exe")
    ? [normalizedPath]
    : lowerPath.endsWith("bcuninstaller.exe")
      ? [path.join(path.dirname(normalizedPath), "win-x64", "BCU-console.exe")]
      : [
          path.join(normalizedPath, "BCU-console.exe"),
          path.join(normalizedPath, "win-x64", "BCU-console.exe"),
        ];

  for (const candidatePath of candidates) {
    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      continue;
    }
  }

  throw new Error(
    `BCU-console.exe was not found. Checked: ${candidates.join(", ")}. Update the BCU Path preference to BCU-console.exe, BCUninstaller.exe, or the BC Uninstaller install folder.`,
  );
}

function runBcuCommand(executablePath: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number }>(
    (resolve, reject) => {
      const argumentList = `@(${args.map((arg) => toPowerShellLiteral(arg)).join(", ")})`;
      const command = [
        "$ErrorActionPreference = 'Stop'",
        `$process = Start-Process -FilePath ${toPowerShellLiteral(executablePath)} -ArgumentList ${argumentList} -Verb RunAs -Wait -PassThru`,
        'Write-Output ("__EXITCODE__=" + $process.ExitCode)',
      ].join("; ");

      const child = spawn(
        "powershell.exe",
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command],
        {
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      let stdout = "";
      let stderr = "";

      child.stdout?.setEncoding("utf8");
      child.stderr?.setEncoding("utf8");
      child.stdout?.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk;
      });

      child.on("error", (error) => {
        reject(new Error(`Failed to launch BC Uninstaller: ${error.message}`));
      });

      child.on("close", (exitCode) => {
        if (exitCode === 0) {
          const processExitCode = parseExitCode(stdout);
          if (processExitCode === 0) {
            resolve({ stdout, stderr, exitCode: processExitCode });
            return;
          }

          reject(
            new Error(
              `BC Uninstaller exited with code ${processExitCode}.${stderr.trim() ? ` ${stderr.trim()}` : ""}`,
            ),
          );
          return;
        }

        const combinedOutput = `${stdout}\n${stderr}`.trim();
        const elevationHint =
          /administrator|elevat|access denied|permission/i.test(combinedOutput)
            ? " BC Uninstaller may need elevated permissions."
            : "";
        reject(
          new Error(
            `BC Uninstaller exited with code ${exitCode}.${elevationHint}${combinedOutput ? ` ${combinedOutput}` : ""}`,
          ),
        );
      });
    },
  );
}

function toPowerShellLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function parseExitCode(stdout: string) {
  const match = stdout.match(/__EXITCODE__=(\d+)/);
  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

async function waitForFile(filePath: string, timeoutMs: number) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const fileStat = await stat(filePath);
      if (fileStat.size > 0) {
        return;
      }
    } catch {
      // Wait for the elevated process to finish writing the export.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(
    `BC Uninstaller finished without writing the export file at "${filePath}". If you dismissed the Windows elevation prompt, try again and approve it.`,
  );
}

function parseExportedApplications(xml: string) {
  const parsed = parser.parse(xml) as {
    ApplicationEntrySerializer?: {
      Items?: {
        ApplicationUninstallerEntry?:
          | Record<string, unknown>
          | Record<string, unknown>[];
      };
    };
  };

  const rawEntries = toArray(
    parsed.ApplicationEntrySerializer?.Items?.ApplicationUninstallerEntry,
  ).filter(isRecord);
  const seenIds = new Map<string, number>();
  return rawEntries.map((entry, index) => {
    const app = normalizeApplicationEntry(entry, index);
    const seenCount = seenIds.get(app.id) ?? 0;
    seenIds.set(app.id, seenCount + 1);

    if (seenCount === 0) {
      return app;
    }

    return {
      ...app,
      id: `${app.id}::duplicate:${seenCount + 1}`,
    };
  });
}

function normalizeApplicationEntry(
  entry: Record<string, unknown>,
  index: number,
): InstalledApp {
  const displayName =
    readString(entry.DisplayName) ||
    readString(entry.RawDisplayName) ||
    `Unnamed Application ${index + 1}`;
  const publisher = readString(entry.Publisher);
  const version = readString(entry.DisplayVersion);
  const uninstallKind = readString(entry.UninstallerKind);
  const ratingId = readString(entry.RatingId);
  const registryKeyName = readString(entry.RegistryKeyName);
  const bundleProviderKey = readString(entry.BundleProviderKey);
  const installLocation = readString(entry.InstallLocation);
  const aboutUrl = readString(entry.AboutUrl);

  const matchTarget = createMatchTarget({
    displayName,
    publisher,
    version,
    ratingId,
    registryKeyName,
  });

  return {
    id: createStableId({
      matchTarget,
      bundleProviderKey,
      installLocation,
      uninstallKind,
      aboutUrl,
      displayName,
      publisher,
      version,
    }),
    displayName,
    publisher,
    version,
    uninstallKind,
    quietUninstallPossible: readBoolean(entry.QuietUninstallPossible),
    uninstallPossible: readBoolean(entry.UninstallPossible),
    isProtected: readBoolean(entry.IsProtected),
    systemComponent: readBoolean(entry.SystemComponent),
    isUpdate: readBoolean(entry.IsUpdate),
    aboutUrl,
    ratingId,
    registryKeyName,
    bundleProviderKey,
    installLocation,
    raw: entry,
    matchTarget,
  };
}

function createMatchTarget(values: {
  displayName: string;
  publisher: string;
  version: string;
  ratingId: string;
  registryKeyName: string;
}): MatchTarget {
  if (values.ratingId) {
    return { type: "RatingId", value: values.ratingId };
  }
  if (values.registryKeyName) {
    return { type: "RegistryKeyName", value: values.registryKeyName };
  }
  return {
    type: "Fallback",
    displayName: values.displayName,
    publisher: values.publisher,
    version: values.version,
  };
}

function createStableId(values: {
  matchTarget: MatchTarget;
  bundleProviderKey: string;
  installLocation: string;
  uninstallKind: string;
  aboutUrl: string;
  displayName: string;
  publisher: string;
  version: string;
}) {
  const baseId = (() => {
    switch (values.matchTarget.type) {
      case "RatingId":
        return `rating:${values.matchTarget.value}`;
      case "RegistryKeyName":
        return `registry:${values.matchTarget.value}`;
      case "Fallback":
        return `fallback:${values.matchTarget.displayName}::${values.matchTarget.publisher}::${values.matchTarget.version}`;
    }
  })();

  const qualifiers = [
    values.bundleProviderKey,
    values.installLocation,
    values.uninstallKind,
    values.aboutUrl,
    values.displayName,
    values.publisher,
    values.version,
  ]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return [baseId, ...qualifiers].join("::");
}

function buildUninstallListXml(items: QueueItem[]) {
  const filters = items
    .map((item) => {
      const name = escapeXml(item.displayName);
      const conditions = buildFilterConditionsXml(item.matchTarget);
      return [
        "    <Filter>",
        `      <Name>${name}</Name>`,
        "      <Exclude>false</Exclude>",
        "      <ComparisonEntries>",
        conditions,
        "      </ComparisonEntries>",
        "      <Enabled>true</Enabled>",
        "    </Filter>",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    '<?xml version="1.0" encoding="utf-16"?>',
    "<UninstallList>",
    "  <Filters>",
    filters,
    "  </Filters>",
    "  <Enabled>true</Enabled>",
    "</UninstallList>",
    "",
  ].join("\r\n");
}

function buildFilterConditionsXml(matchTarget: MatchTarget) {
  switch (matchTarget.type) {
    case "RatingId":
      return createConditionXml(matchTarget.value, "RatingId");
    case "RegistryKeyName":
      return createConditionXml(matchTarget.value, "RegistryKeyName");
    case "Fallback":
      return [
        createConditionXml(matchTarget.displayName, "DisplayName"),
        createConditionXml(matchTarget.publisher, "Publisher"),
        createConditionXml(matchTarget.version, "DisplayVersion"),
      ].join("\r\n");
  }
}

function createConditionXml(value: string, targetPropertyId: string) {
  return [
    "        <FilterCondition>",
    "          <InvertResults>false</InvertResults>",
    "          <ComparisonMethod>Equals</ComparisonMethod>",
    `          <FilterText>${escapeXml(value)}</FilterText>`,
    `          <TargetPropertyId>${escapeXml(targetPropertyId)}</TargetPropertyId>`,
    "          <Enabled>true</Enabled>",
    "        </FilterCondition>",
  ].join("\r\n");
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown) {
  return String(value).trim().toLowerCase() === "true";
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeMarkdown(value: string) {
  return value.replaceAll(/([\\`*_{}[\]()+#.!-])/g, "\\$1");
}

function formatMatchTarget(matchTarget: MatchTarget) {
  switch (matchTarget.type) {
    case "RatingId":
      return `RatingId=${matchTarget.value}`;
    case "RegistryKeyName":
      return `RegistryKeyName=${matchTarget.value}`;
    case "Fallback":
      return `DisplayName=${matchTarget.displayName}; Publisher=${matchTarget.publisher}; DisplayVersion=${matchTarget.version}`;
  }
}

function getErrorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : String(caught);
}
