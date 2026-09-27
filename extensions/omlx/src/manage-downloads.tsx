import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelHfDownload,
  fetchHfTasks,
  formatBytes,
  getDashboardUrl,
  isOmlxInstalled,
  isServerRunning,
  notifyIfUpdateAvailable,
  removeHfTask,
  retryHfDownload,
  type HfTask,
} from "./lib/omlx";

type ViewState = "loading" | "not-installed" | "offline" | "ready";

export default function ManageDownloads() {
  const [tasks, setTasks] = useState<HfTask[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!isOmlxInstalled()) {
      setViewState("not-installed");
      return;
    }

    const running = await isServerRunning();
    if (!running) {
      setViewState("offline");
      return;
    }

    try {
      const data = await fetchHfTasks();
      setTasks(data);
      setViewState("ready");
      notifyIfUpdateAvailable();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch downloads",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setViewState("ready");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const hasActive = tasks.some(
      (t) => t.status === "pending" || t.status === "downloading",
    );

    if (hasActive && !intervalRef.current) {
      intervalRef.current = setInterval(refresh, 1000);
    } else if (!hasActive && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tasks, refresh]);

  if (viewState === "not-installed") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="oMLX Not Found"
          description="Install oMLX from omlx.com, then launch it once."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Download oMLX"
                url="https://omlx.com"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (viewState === "offline") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="oMLX Server Offline"
          description="Start the server with Start/Stop Server."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const active = tasks.filter(
    (t) => t.status === "pending" || t.status === "downloading",
  );
  const completed = tasks.filter((t) => t.status === "completed");
  const failed = tasks.filter((t) => t.status === "failed");
  const cancelled = tasks.filter((t) => t.status === "cancelled");

  if (tasks.length === 0 && viewState === "ready") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Download}
          title="No Downloads"
          description="Use Download Model to start downloading models."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
              <Action.OpenInBrowser
                title="Open Web Dashboard"
                url={getDashboardUrl({
                  tab: "models",
                  modelsTab: "downloader",
                })}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={viewState === "loading"}>
      {active.length > 0 && (
        <List.Section title="Downloading">
          {active.map((t) => (
            <TaskItem key={t.task_id} task={t} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
      {failed.length > 0 && (
        <List.Section title="Failed">
          {failed.map((t) => (
            <TaskItem key={t.task_id} task={t} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
      {cancelled.length > 0 && (
        <List.Section title="Cancelled">
          {cancelled.map((t) => (
            <TaskItem key={t.task_id} task={t} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
      {completed.length > 0 && (
        <List.Section title="Completed">
          {completed.map((t) => (
            <TaskItem key={t.task_id} task={t} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function TaskItem({
  task,
  onRefresh,
}: {
  task: HfTask;
  onRefresh: () => Promise<void>;
}) {
  const icon = getTaskIcon(task);
  const accessories = getTaskAccessories(task);

  return (
    <List.Item
      title={task.repo_id}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          {(task.status === "pending" || task.status === "downloading") && (
            <Action
              title="Cancel Download"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Cancelling...",
                });
                try {
                  await cancelHfDownload(task.task_id);
                  toast.style = Toast.Style.Success;
                  toast.title = "Download cancelled";
                  await onRefresh();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to cancel";
                  toast.message =
                    error instanceof Error ? error.message : "Unknown error";
                }
              }}
            />
          )}
          {(task.status === "completed" ||
            task.status === "failed" ||
            task.status === "cancelled") && (
            <Action
              title="Remove"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                try {
                  await removeHfTask(task.task_id);
                  await onRefresh();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to remove",
                    message:
                      error instanceof Error ? error.message : "Unknown error",
                  });
                }
              }}
            />
          )}
          {(task.status === "failed" || task.status === "cancelled") && (
            <Action
              title="Retry Download"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Retrying...",
                });
                try {
                  await retryHfDownload(task.task_id);
                  toast.style = Toast.Style.Success;
                  toast.title = "Download restarted";
                  await onRefresh();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to retry";
                  toast.message =
                    error instanceof Error ? error.message : "Unknown error";
                }
              }}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
          />
          <Action.OpenInBrowser
            title="Open Web Dashboard"
            url={getDashboardUrl({ tab: "models", modelsTab: "downloader" })}
          />
        </ActionPanel>
      }
    />
  );
}

function getTaskIcon(task: HfTask): List.Item.Props["icon"] {
  switch (task.status) {
    case "downloading":
      return { source: Icon.Download, tintColor: Color.Blue };
    case "pending":
      return Icon.Clock;
    case "completed":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
    case "cancelled":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return Icon.Circle;
  }
}

function getTaskAccessories(task: HfTask): List.Item.Accessory[] {
  switch (task.status) {
    case "downloading":
    case "pending": {
      const accessories: List.Item.Accessory[] = [];
      if (task.progress > 0) {
        accessories.push({
          tag: {
            value: `${Math.round(task.progress)}%`,
            color: Color.Blue,
          },
        });
      }
      if (task.total_size > 0) {
        accessories.push({
          text: `${formatBytes(task.downloaded_size)} / ${formatBytes(task.total_size)}`,
        });
      }
      return accessories;
    }
    case "failed":
    case "cancelled":
      return task.error
        ? [
            {
              text:
                task.error.slice(0, 60) + (task.error.length > 60 ? "…" : ""),
            },
          ]
        : [];
    case "completed":
      return task.completed_at > 0
        ? [{ text: relativeTime(task.completed_at) }]
        : [];
    default:
      return [];
  }
}

function relativeTime(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSeconds);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
