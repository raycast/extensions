import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { XMLParser } from "fast-xml-parser";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import React from "react";

type InstalledApp = {
  id: string;
  displayName: string;
  publisher: string;
  version: string;
  quietUninstallPossible: boolean;
  installLocation: string;
  matchTarget: MatchTarget;
};

type QueueItem = {
  id: string;
  displayName: string;
  quietUninstallPossible: boolean;
  installLocation: string;
  matchTarget: MatchTarget;
};

type RunningProcess = {
  processId: number;
  name: string;
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

type CommandState = {
  apps: InstalledApp[];
  queue: Record<string, QueueItem>;
  isLoading: boolean;
  error: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

let exportInFlight: {
  bcuPath: string;
  promise: Promise<InstalledApp[]>;
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
  };

  componentDidMount(): void {
    void this.refreshApps();
  }

  get queuedItems() {
    return Object.values(this.state.queue);
  }

  async refreshApps(options?: { suppressToast?: boolean }) {
    this.setState({
      isLoading: true,
      error: null,
    });

    const reusingInFlightRequest =
      exportInFlight !== null && exportInFlight.bcuPath === this.bcuPath;

    const toast = options?.suppressToast
      ? null
      : reusingInFlightRequest
        ? null
        : await showToast({
            style: Toast.Style.Animated,
            title: "Refreshing Applications",
          });

    try {
      const nextApps = (await getApplicationsExport(this.bcuPath)).sort(
        (left, right) => left.displayName.localeCompare(right.displayName),
      );
      this.setState((current) => ({
        apps: nextApps,
        queue: filterQueueAgainstApps(current.queue, nextApps),
      }));
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Applications Refreshed";
      }
      return true;
    } catch (caught) {
      const message = getErrorMessage(caught);
      this.setState({
        error: message,
        apps: [],
      });
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to Refresh Applications";
        toast.message = message;
      }
      return false;
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
          installLocation: app.installLocation,
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
      title: "Queue Cleared",
    });
  }

  async uninstallQueuedApps() {
    const queuedItems = this.queuedItems;
    if (queuedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Queue Is Empty",
        message: "Add one or more applications first",
      });
      return;
    }

    const currentAppIds = new Set(this.state.apps.map((app) => app.id));
    if (queuedItems.some((item) => !currentAppIds.has(item.id))) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Queue Is Stale",
        message: "Refresh the application list and try again",
      });
      return;
    }

    let runningProcesses: RunningProcess[];
    try {
      runningProcesses = await findRunningProcesses(queuedItems);
    } catch (caught) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Check Running Applications",
        message: getErrorMessage(caught),
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
        `${quietCount} quiet • ${nonQuietCount} non-quiet`,
        `High-confidence cleanup: ${this.autoRemoveHighConfidenceJunk ? "On" : "Off"}`,
        nonQuietCount > 0 ? "Non-quiet uninstallers may need input." : null,
        runningProcesses.length > 0
          ? `${formatRunningProcesses(runningProcesses)}\n\nThese processes will be force-quit before uninstalling. Unsaved work may be lost.`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      primaryAction: {
        title:
          runningProcesses.length > 0
            ? "Quit Apps and Uninstall"
            : "Uninstall Queued Apps",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    if (runningProcesses.length > 0) {
      try {
        await terminateProcesses(runningProcesses);
        await new Promise((resolve) => setTimeout(resolve, 500));
        const survivors = await findRunningProcesses(queuedItems);
        if (survivors.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Quit All Running Applications",
            message: formatRunningProcesses(survivors),
          });
          return;
        }
      } catch (caught) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Quit Running Applications",
          message: getErrorMessage(caught),
        });
        return;
      }
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running Batch Uninstall",
    });

    try {
      await uninstallQueuedAppsWithBcu(
        this.bcuPath,
        queuedItems,
        this.autoRemoveHighConfidenceJunk,
      );
      this.setState({
        queue: {},
      });
      const refreshed = await this.refreshApps({ suppressToast: true });
      toast.style = Toast.Style.Success;
      toast.title = "Batch Uninstall Complete";
      if (!refreshed) {
        toast.message =
          "Refresh failed. Refresh the application list manually.";
      }
    } catch (caught) {
      const message = getErrorMessage(caught);
      toast.style = Toast.Style.Failure;
      toast.title = "Batch Uninstall Failed";
      toast.message = message;
    }
  }

  render() {
    const { apps, queue, isLoading, error } = this.state;
    const queueCount = this.queuedItems.length;

    return (
      <List
        isLoading={isLoading}
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
                  shortcut={{ modifiers: ["ctrl"], key: "r" }}
                  onAction={() => this.refreshApps()}
                />
              </ActionPanel>
            }
          />
        ) : null}

        {!error && apps.length === 0 && !isLoading ? (
          <List.EmptyView
            title="No applications found"
            description="Refresh the application list and try again."
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh Applications"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["ctrl"], key: "r" }}
                  onAction={() => this.refreshApps()}
                />
                {queueCount > 0 ? (
                  <Action
                    title="Uninstall Queued Apps"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => this.uninstallQueuedApps()}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        ) : null}

        {queueCount > 0 ? (
          <List.Item
            id="queue-summary"
            title={`${queueCount} queued app${queueCount === 1 ? "" : "s"}`}
            icon={Icon.List}
            actions={
              <ActionPanel>
                <Action
                  title="Uninstall Queued Apps"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => this.uninstallQueuedApps()}
                />
                <Action
                  title="Clear Queue"
                  icon={Icon.XMarkCircle}
                  onAction={() => this.clearQueue()}
                />
                <Action
                  title="Refresh Applications"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["ctrl"], key: "r" }}
                  onAction={() => this.refreshApps()}
                />
              </ActionPanel>
            }
          />
        ) : null}
        {apps.map((app) => {
          const isQueued = Boolean(queue[app.id]);
          return (
            <List.Item
              key={app.id}
              id={app.id}
              title={app.displayName}
              subtitle={app.publisher || app.version || undefined}
              icon={
                isQueued
                  ? { source: Icon.CheckCircle, tintColor: Color.Blue }
                  : { source: Icon.AppWindow, tintColor: Color.Orange }
              }
              keywords={[app.publisher, app.version].filter(Boolean)}
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
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Refresh Applications"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["ctrl"], key: "r" }}
                      onAction={() => this.refreshApps()}
                    />
                    <Action
                      title="Clear Queue"
                      icon={Icon.XMarkCircle}
                      onAction={() => this.clearQueue()}
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

async function findRunningProcesses(items: QueueItem[]) {
  const roots = items
    .map((item) => item.installLocation)
    .map(normalizeProcessRoot)
    .filter((root): root is string => root !== null);
  if (roots.length === 0) {
    return [];
  }

  const rootsJson = toPowerShellLiteral(JSON.stringify([...new Set(roots)]));
  const command = [
    `$roots = ConvertFrom-Json ${rootsJson}`,
    "$processes = Get-CimInstance Win32_Process | Where-Object {",
    "  $executablePath = $_.ExecutablePath",
    "  $executablePath -and ($roots | Where-Object { $executablePath.Equals($_, 'OrdinalIgnoreCase') -or $executablePath.StartsWith($_ + '\\', 'OrdinalIgnoreCase') })",
    "} | ForEach-Object { [pscustomobject]@{ processId = [int]$_.ProcessId; name = [string]$_.Name } }",
    "@($processes) | ConvertTo-Json -Compress",
  ].join("; ");
  const result = await runPowerShell(command);
  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr || `PowerShell exited with code ${result.exitCode}`,
    );
  }
  const parsed = JSON.parse(result.stdout || "[]") as
    | RunningProcess
    | RunningProcess[];
  return Array.isArray(parsed) ? parsed : [parsed];
}

function normalizeProcessRoot(value: string) {
  const trimmed = value.trim().replace(/^"|"$/g, "");
  if (!trimmed || !path.win32.isAbsolute(trimmed)) {
    return null;
  }
  return path.win32.normalize(trimmed).replace(/[\\/]+$/, "");
}

function formatRunningProcesses(processes: RunningProcess[]) {
  const visible = processes
    .slice(0, 8)
    .map((process) => `${process.name} (PID ${process.processId})`);
  if (processes.length > visible.length) {
    visible.push(`and ${processes.length - visible.length} more`);
  }
  return visible.join("\n");
}

async function terminateProcesses(processes: RunningProcess[]) {
  const ids = processes.map((process) => process.processId).join(", ");
  const result = await runPowerShell(
    `Stop-Process -Id @(${ids}) -Force -ErrorAction SilentlyContinue`,
  );
  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr || `PowerShell exited with code ${result.exitCode}`,
    );
  }
}

function runPowerShell(command: string) {
  return new Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
  }>((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => (stdout += chunk));
    child.stderr?.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode });
    });
  });
}

async function exportApplications(preferencePath: string) {
  const bcuConsolePath = await resolveBcuConsolePath(preferencePath);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "raycast-bcu-export-"));
  const exportPath = path.join(tempDir, "applications.xml");

  try {
    await runBcuCommand(bcuConsolePath, ["export", exportPath, "/Q", "/U"]);
    const xml = await readFile(exportPath, "utf8");
    const apps = parseExportedApplications(xml);
    if (apps.length === 0) {
      throw new Error(
        "BC Uninstaller export completed but no applications were found.",
      );
    }
    return apps;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function getApplicationsExport(
  preferencePath: string,
): Promise<InstalledApp[]> {
  if (exportInFlight !== null && exportInFlight.bcuPath === preferencePath) {
    return exportInFlight.promise;
  }

  const promise = exportApplications(preferencePath).finally(() => {
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
) {
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
    await runBcuCommand(bcuConsolePath, args);
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

async function runBcuCommand(executablePath: string, args: string[]) {
  const argumentList = `@(${args.map((arg) => toPowerShellLiteral(arg)).join(", ")})`;
  const result = await runPowerShell(
    [
      "$ErrorActionPreference = 'Stop'",
      `$process = Start-Process -FilePath ${toPowerShellLiteral(executablePath)} -ArgumentList ${argumentList} -Verb RunAs -Wait -PassThru`,
      "Start-Process 'raycast://'",
      'Write-Output ("__EXITCODE__=" + $process.ExitCode)',
    ].join("; "),
  );
  const exitCode =
    result.exitCode === 0 ? parseExitCode(result.stdout) : result.exitCode;
  if (exitCode !== 0) {
    const output = `${result.stdout}\n${result.stderr}`.trim();
    const elevationHint = /administrator|elevat|access denied|permission/i.test(
      output,
    )
      ? " BC Uninstaller may need elevated permissions."
      : "";
    throw new Error(
      `BC Uninstaller exited with code ${exitCode}.${elevationHint}${output ? ` ${output}` : ""}`,
    );
  }
}

function toPowerShellLiteral(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function parseExitCode(stdout: string) {
  const match = stdout.match(/__EXITCODE__=(\d+)/);
  if (!match) {
    return -1;
  }

  return Number(match[1]);
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
  )
    .filter(isRecord)
    .filter(
      (entry) =>
        !readBoolean(entry.IsProtected) &&
        !readBoolean(entry.SystemComponent) &&
        !readBoolean(entry.IsUpdate),
    );
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
  const ratingId = readString(entry.RatingId);
  const registryKeyName = readString(entry.RegistryKeyName);
  const installLocation = readString(entry.InstallLocation);

  const matchTarget = createMatchTarget({
    displayName,
    publisher,
    version,
    ratingId,
    registryKeyName,
  });

  return {
    id: JSON.stringify(matchTarget),
    displayName,
    publisher,
    version,
    quietUninstallPossible: Boolean(readString(entry.QuietUninstallString)),
    installLocation,
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
    default: {
      const _exhaustive: never = matchTarget;
      return _exhaustive;
    }
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

function getErrorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : String(caught);
}
