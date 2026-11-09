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

export default function Command() {
  const services = usePromise(listServices);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const log = usePromise(captureLog, [selectedId ?? ""], { execute: selectedId !== null });

  useEffect(() => {
    const timer = setInterval(() => {
      services.revalidate();
      if (selectedId !== null) log.revalidate();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [services.revalidate, log.revalidate, selectedId]);

  const projects = new Map<string, Service[]>();
  for (const service of services.data ?? []) {
    projects.set(service.project, [...(projects.get(service.project) ?? []), service]);
  }

  return (
    <List
      isLoading={services.data === undefined && services.isLoading}
      isShowingDetail={projects.size > 0}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Search services…"
    >
      {services.error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={services.error instanceof TmuxMissingError ? "tmux Is Missing" : "tmux Error"}
          description={services.error.message}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Dev Services Running"
          description="Run makedeck in a project root, e.g. from a Zed task"
        />
      )}
      {[...projects].map(([project, items]) => (
        <List.Section
          key={project}
          title={project}
          subtitle={truncateStart(homeRelative(items[0].projectPath), SECTION_CHARS - project.length - 2)}
        >
          {items.map((service) => (
            <ServiceItem
              key={service.windowId}
              service={service}
              siblings={items}
              log={service.windowId === selectedId ? log.data : undefined}
              onChange={services.revalidate}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ServiceItem({
  service,
  siblings,
  log,
  onChange,
}: {
  service: Service;
  siblings: Service[];
  log: string | undefined;
  onChange: () => void;
}) {
  const run = (action: () => Promise<void>, success?: string) => async () => {
    try {
      await action();
      if (success) await showToast({ style: Toast.Style.Success, title: success });
      onChange();
    } catch (error) {
      await showFailureToast(error, { title: "Action failed" });
    }
  };

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
      detail={
        <List.Item.Detail markdown={log === undefined ? undefined : logMarkdown(fitLog(log, LOG_ROWS, LOG_COLS))} />
      }
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
