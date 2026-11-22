import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  showToast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { homedir } from "node:os";
import { useEffect, useState } from "react";
import {
  ExternalService,
  listExternalServices,
  moveToMakedeck,
  readLogFile,
  realPath,
  stopExternal,
} from "./processes.ts";
import {
  Service,
  TmuxMissingError,
  captureLog,
  listServices,
  logMarkdown,
  fitLog,
  truncateStart,
  openInTerminal,
  STOP_TARGET,
  restartService,
  stopProject,
  stopService,
} from "./tmux.ts";

const REFRESH_MS = 2000;
// Visible area of the detail view in the default Raycast window (estimated).
// LOG_ROWS too large: the newest lines fall below the edge; too small: empty space at the bottom.
// LOG_COLS too large: long lines wrap; too small: lines are cut early.
const LOG_ROWS = 19;
const LOG_COLS = 60;
// Characters that fit in a section header (project title + path) in the list column (estimated).
const SECTION_CHARS = 40;

type Loaded = { services: Service[]; externals: ExternalService[]; scanError: Error | null };

// tmux errors propagate to the empty views; a failed process scan must not hide the
// tmux services, so it becomes an item of its own.
async function loadAll(): Promise<Loaded> {
  const services = await listServices();
  try {
    return { services, externals: await listExternalServices(services), scanError: null };
  } catch (error) {
    return { services, externals: [], scanError: error instanceof Error ? error : new Error(String(error)) };
  }
}

// A tmux window's pane, or the log file an external service writes its stdout to.
function loadLog(windowId: string | null, path: string | null): Promise<string> {
  return windowId !== null ? captureLog(windowId) : readLogFile(path!);
}

type Project = { name: string; path: string; services: Service[]; externals: ExternalService[] };

export default function Command() {
  const data = usePromise(loadAll);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const services = data.data?.services ?? [];
  const externals = data.data?.externals ?? [];
  const selectedWindow = services.find((s) => s.windowId === selectedId)?.windowId ?? null;
  const selectedLogPath = externals.find((e) => e.id === selectedId)?.logPath ?? null;
  const log = usePromise(loadLog, [selectedWindow, selectedLogPath], {
    execute: selectedWindow !== null || selectedLogPath !== null,
    // Shown in the detail view instead of a toast on every refresh.
    onError: () => {},
  });

  useEffect(() => {
    const timer = setInterval(() => {
      data.revalidate();
      if (selectedWindow !== null || selectedLogPath !== null) log.revalidate();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [data.revalidate, log.revalidate, selectedWindow, selectedLogPath]);

  // By resolved path: two repositories can share a folder name. External paths are resolved already.
  const projects = new Map<string, Project>();
  const projectFor = (name: string, path: string) => {
    if (!projects.has(path)) projects.set(path, { name, path, services: [], externals: [] });
    return projects.get(path)!;
  };
  for (const service of services) projectFor(service.project, realPath(service.projectPath)).services.push(service);
  for (const external of externals) projectFor(external.project, external.projectPath).externals.push(external);
  // By name on purpose: makedeck names the session after the folder and does not start a
  // second session of the same name, even for another path. Move would then only stop.
  const sessions = new Set(services.map((s) => s.project));

  return (
    <List
      isLoading={data.data === undefined && data.isLoading}
      isShowingDetail={projects.size > 0 || Boolean(data.data?.scanError)}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Search services…"
    >
      {data.error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={data.error instanceof TmuxMissingError ? "tmux Is Missing" : "tmux Error"}
          description={data.error.message}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Dev Services Running"
          description="Run makedeck in a project root, e.g. from a Zed task"
        />
      )}
      {[...projects.values()].map((items) => (
        <List.Section
          key={items.path}
          title={items.name}
          subtitle={truncateStart(homeRelative(items.path), SECTION_CHARS - items.name.length - 2)}
        >
          {items.services.map((service) => (
            <ServiceItem
              key={service.windowId}
              service={service}
              siblings={items.services}
              log={service.windowId === selectedId ? log.data : undefined}
              logError={service.windowId === selectedId ? log.error : undefined}
              onChange={data.revalidate}
            />
          ))}
          {items.externals.map((external) => (
            <ExternalItem
              key={external.id}
              service={external}
              externals={externals}
              canMove={external.makedeckReady && !sessions.has(external.project)}
              log={external.id === selectedId ? log.data : undefined}
              logError={external.id === selectedId ? log.error : undefined}
              onChange={data.revalidate}
            />
          ))}
        </List.Section>
      ))}
      {data.data?.scanError && (
        <List.Item
          id="scan-error"
          title="Process scan failed"
          subtitle={data.data.scanError.message}
          icon={Icon.Warning}
          detail={<List.Item.Detail markdown={logMarkdown(data.data.scanError.message)} />}
        />
      )}
    </List>
  );
}

const runAction = (action: () => Promise<void>, onChange: () => void, success?: string) => async () => {
  try {
    await action();
    if (success) await showToast({ style: Toast.Style.Success, title: success });
    onChange();
  } catch (error) {
    await showFailureToast(error, { title: "Action failed" });
  }
};

function ExternalItem({
  service,
  externals,
  canMove,
  log,
  logError,
  onChange,
}: {
  service: ExternalService;
  externals: ExternalService[];
  canMove: boolean;
  log: string | undefined;
  logError: Error | undefined;
  onChange: () => void;
}) {
  const confirmStop = async () => {
    const confirmed = await confirmAlert({
      title: `Stop ${service.name} (PID ${service.pid})?`,
      message: "Sends SIGTERM to it and its child processes, SIGKILL after 5 s.",
      primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await stopExternal(service);
    await showToast({ style: Toast.Style.Success, title: `${service.name} stopped` });
  };

  const move = async () => {
    const stopped = externals.filter((s) => s.projectPath === service.projectPath);
    const confirmed = await confirmAlert({
      title: `Move ${service.project} to makedeck?`,
      message: `Stops ${stopped.map((s) => `${s.name} (PID ${s.pid})`).join(", ")} (SIGTERM, SIGKILL after 5 s), then starts the project with makedeck.`,
      primaryAction: { title: "Move", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Moving ${service.project} to makedeck…` });
    await moveToMakedeck(service.projectPath, externals);
    toast.style = Toast.Style.Success;
    toast.title = `Moved ${service.project} to makedeck`;
  };

  return (
    <List.Item
      id={service.id}
      title={service.name}
      // No accessories: the detail view leaves no room for them.
      subtitle={["outside makedeck", ...service.ports.map((port) => `:${port}`)].join(" ")}
      icon={{ source: Icon.CircleFilled, tintColor: Color.Orange }}
      detail={<List.Item.Detail markdown={externalMarkdown(service, log, logError)} />}
      actions={
        <ActionPanel>
          {/* Read-only actions before Stop, so that Stop does not get ⏎ or ⌘⏎. */}
          <ActionPanel.Section>
            {canMove && (
              <Action
                title="Move to Makedeck"
                icon={Icon.ArrowRight}
                style={Action.Style.Destructive}
                onAction={runAction(move, onChange)}
              />
            )}
            <Action.CopyToClipboard title="Copy Command" content={service.command} />
            <Action.ShowInFinder title="Show Project in Finder" path={service.projectPath} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {service.logPath !== null && (
              <Action.CopyToClipboard title="Copy Logs" content={log ?? ""} shortcut={Keyboard.Shortcut.Common.Copy} />
            )}
            <Action
              title="Stop"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "c" }}
              onAction={runAction(confirmStop, onChange)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function externalMarkdown(service: ExternalService, log: string | undefined, logError: Error | undefined) {
  if (service.logPath === null) {
    const target = service.stdout === null ? "No log." : `No log: output goes to ${service.stdout}.`;
    return `${target}\n\n${logMarkdown(service.command)}`;
  }
  if (logError) return `Cannot read ${service.logPath}: ${logError.message}`;
  return log === undefined ? undefined : logMarkdown(fitLog(log, LOG_ROWS, LOG_COLS));
}

function ServiceItem({
  service,
  siblings,
  log,
  logError,
  onChange,
}: {
  service: Service;
  siblings: Service[];
  log: string | undefined;
  logError: Error | undefined;
  onChange: () => void;
}) {
  const run = (action: () => Promise<void>, success?: string) => runAction(action, onChange, success);

  const confirmStopProject = async () => {
    const confirmed = await confirmAlert({
      title: `Stop ${service.project}?`,
      message: `All services of this project will be stopped, then "make ${STOP_TARGET}" runs if it exists.`,
      primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Stopping ${service.project}…` });
    const ranStopTarget = await stopProject(service.project, service.projectPath);
    toast.style = Toast.Style.Success;
    toast.title = `${service.project} stopped`;
    if (ranStopTarget) toast.message = `Ran make ${STOP_TARGET}`;
  };

  return (
    <List.Item
      id={service.windowId}
      title={service.name}
      icon={statusIcon(service)}
      accessories={[{ text: statusText(service) }]}
      detail={<List.Item.Detail markdown={serviceMarkdown(log, logError)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Open in Terminal"
              icon={Icon.Terminal}
              onAction={run(async () => {
                await openInTerminal(service);
                await closeMainWindow();
              })}
            />
            {service.status === "running" && (
              <Action
                title="Stop"
                icon={Icon.Stop}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
                onAction={run(() => stopService(service.windowId), `${service.name} stopped`)}
              />
            )}
            <Action
              title="Restart"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={run(() => restartService(service.windowId), `${service.name} restarted`)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={service.project}>
            <Action.CopyToClipboard title="Copy Logs" content={log ?? ""} shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action
              title="Restart Project"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={run(async () => {
                await Promise.all(siblings.map((sibling) => restartService(sibling.windowId)));
              }, `${service.project} restarted`)}
            />
            <Action
              title="Stop Project"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={run(confirmStopProject)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function serviceMarkdown(log: string | undefined, logError: Error | undefined) {
  if (logError) return `Cannot read the log from tmux: ${logError.message}`;
  return log === undefined ? undefined : logMarkdown(fitLog(log, LOG_ROWS, LOG_COLS));
}

function statusText(service: Service): string {
  if (service.status === "running") return "running";
  if (service.exitCode === null) return "stopped";
  return service.exitCode === 0 ? "exited (0)" : `failed (${service.exitCode})`;
}

function statusIcon(service: Service): List.Item.Props["icon"] {
  if (service.status === "running") return { source: Icon.CircleFilled, tintColor: Color.Green };
  if (service.exitCode === null) return { source: Icon.Stop, tintColor: Color.SecondaryText };
  if (service.exitCode === 0) return { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
  return { source: Icon.XMarkCircle, tintColor: Color.Red };
}

function homeRelative(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}
