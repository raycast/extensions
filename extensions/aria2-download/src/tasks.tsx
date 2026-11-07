import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef } from "react";

import AddDownload from "./add-download";
import Configuration from "./configuration";
import TaskDetail from "./task-detail";
import {
  removeTask,
  removeTaskResult,
  pauseTask,
  resumeTask,
  getAllTasks,
  isDaemonRunning,
} from "./lib/rpc";
import { startDaemon, stopDaemon } from "./lib/engine";
import { formatBytes, formatEta, formatSpeed, parseBytes } from "./lib/format";
import {
  getTaskError,
  getTaskKind,
  getTaskKindEmoji,
  getTaskKindLabel,
  getTaskName,
  getTaskProgress,
  getTaskStatusLabel,
  isMetadataTask,
  getPrimaryUri,
  isActiveTask,
  isStoppedTask,
  isWaitingTask,
} from "./lib/task-type";
import { showFailureToast, useCachedPromise } from "@raycast/utils";

import { Aria2Task } from "./lib/types";
import { ctrlShortcut } from "./lib/shortcuts";

interface TaskSection {
  title: string;
  tasks: Aria2Task[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function taskActions(
  task: Aria2Task,
  onRefresh: () => void,
  onOpenDetail: () => void,
  onToggle: () => void,
): React.ReactNode {
  const uri = getPrimaryUri(task);
  const isActive = isActiveTask(task);
  const isStopped = isStoppedTask(task);
  const removeTitle = isStopped ? "Remove from List" : "Remove Download";

  return (
    <ActionPanel>
      <Action title="Show Details" icon={Icon.Eye} onAction={onOpenDetail} />
      {(isActive || task.status === "waiting") && (
        <Action
          title="Pause"
          icon={Icon.Pause}
          shortcut={ctrlShortcut("p")}
          onAction={async () => {
            try {
              await pauseTask(task.gid);
              await showToast({ style: Toast.Style.Success, title: "Paused" });
              onRefresh();
            } catch (error) {
              await showFailureToast(error, { title: "Pause failed" });
            }
          }}
        />
      )}
      {task.status === "paused" && (
        <Action
          title="Resume"
          icon={Icon.Play}
          shortcut={ctrlShortcut("r")}
          onAction={async () => {
            try {
              await resumeTask(task.gid);
              await showToast({ style: Toast.Style.Success, title: "Resumed" });
              onRefresh();
            } catch (error) {
              await showFailureToast(error, { title: "Resume failed" });
            }
          }}
        />
      )}
      <Action
        title={removeTitle}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={ctrlShortcut("x")}
        onAction={async () => {
          const confirmed = await confirmAlert({
            title: removeTitle,
            message: `Remove "${getTaskName(task)}" from aria2?`,
            primaryAction: {
              title: removeTitle,
              style: Alert.ActionStyle.Destructive,
            },
          });
          if (!confirmed) return;
          try {
            if (isStopped) {
              await removeTaskResult(task.gid);
            } else {
              await removeTask(task.gid);
            }
            await showToast({ style: Toast.Style.Success, title: "Removed" });
            onRefresh();
          } catch (error) {
            await showFailureToast(error, { title: "Remove failed" });
          }
        }}
      />
      {task.dir && (
        <Action
          title="Open Download Folder"
          icon={Icon.Folder}
          onAction={() => open(task.dir)}
        />
      )}
      {uri && (
        <Action.CopyToClipboard
          title="Copy Source URL"
          content={uri}
          shortcut={ctrlShortcut("c")}
        />
      )}
      <ActionPanel.Section title="aria2">
        <Action title="Toggle Aria2" icon={Icon.Switch} onAction={onToggle} />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="New">
        <Action.Push
          title="Add Download"
          icon={Icon.Plus}
          target={<AddDownload fromTasks />}
        />
        <Action.Push
          title="Aria2 Configuration"
          icon={Icon.Gear}
          target={<Configuration />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Tasks() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const {
    data: tasks = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(getAllTasks, [], { keepPreviousData: true });
  const daemonError = error ? errorMessage(error) : null;
  const errorToastShown = useRef(false);

  const refresh = useCallback(async () => {
    await revalidate();
  }, [revalidate]);

  useEffect(() => {
    if (daemonError && !errorToastShown.current) {
      errorToastShown.current = true;
      void showFailureToast(error, { title: "aria2 is not available" });
    }
    if (!daemonError) {
      errorToastShown.current = false;
    }
  }, [daemonError, error]);

  const toggle = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Toggling aria2…",
    });
    try {
      if (await isDaemonRunning()) {
        await stopDaemon({ onlyIfIdle: true });
        toast.style = Toast.Style.Success;
        toast.title = "aria2 stopped";
      } else {
        await startDaemon();
        toast.style = Toast.Style.Success;
        toast.title = "aria2 is ready";
      }
      await refresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could not toggle aria2" });
    }
  }, [refresh]);

  useEffect(() => {
    const seconds = Math.max(
      1,
      Number.parseInt(preferences.refreshInterval || "1", 10),
    );
    const timer = setInterval(() => {
      void refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [preferences.refreshInterval, refresh]);

  const active = tasks.filter(isActiveTask);
  const waiting = tasks.filter(isWaitingTask);
  const stopped = tasks.filter(isStoppedTask);
  const sections: TaskSection[] = [
    { title: "Active", tasks: active },
    { title: "Waiting", tasks: waiting },
    ...(preferences.showStopped ? [{ title: "Stopped", tasks: stopped }] : []),
  ].filter((section) => section.tasks.length > 0);

  const emptyView = (
    <List.EmptyView
      icon={daemonError ? Icon.WifiDisabled : Icon.Download}
      title={daemonError ? "aria2 RPC is not running" : "No downloads"}
      description={
        daemonError ?? "Add a URL, torrent or magnet link to start downloading."
      }
      actions={
        <ActionPanel>
          <Action title="Toggle Aria2" icon={Icon.Switch} onAction={toggle} />
          <Action.Push
            title="Add Download"
            icon={Icon.Plus}
            target={<AddDownload fromTasks />}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search downloads…"
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
          />
          <Action title="Toggle Aria2" icon={Icon.Switch} onAction={toggle} />

          <ActionPanel.Section title="New">
            <Action.Push
              title="Add Download"
              icon={Icon.Plus}
              target={<AddDownload fromTasks />}
            />
            <Action.Push
              title="Aria2 Configuration"
              icon={Icon.Gear}
              target={<Configuration />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {sections.length === 0 ? emptyView : undefined}
      {sections.map((section) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={`${section.tasks.length}`}
        >
          {section.tasks.map((task) => {
            const kind = getTaskKind(task);
            const progress = getTaskProgress(task);
            const isActive = isActiveTask(task);
            const isWaiting = isWaitingTask(task);
            const isComplete = task.status === "complete";
            const isError = task.status === "error";
            const isMetadata = isMetadataTask(task);
            const subtitle = isActive
              ? `${getTaskKindLabel(kind)} · ${isMetadata ? "Waiting for metadata" : "Downloading"}`
              : isComplete
                ? `${getTaskKindLabel(kind)} · Completed`
                : isError
                  ? `${getTaskKindLabel(kind)} · Failed: ${getTaskError(task)}`
                  : `${getTaskKindLabel(kind)} · ${getTaskStatusLabel(task.status)}`;

            const accessories: List.Item.Accessory[] = [];
            if (isActive) {
              if (isMetadata) {
                accessories.push({ text: `${task.connections || "0"} peers` });
              } else {
                accessories.push({ text: `${progress.toFixed(1)}%` });
                if (parseBytes(task.downloadSpeed) > 0) {
                  accessories.push({
                    tag: {
                      value: formatSpeed(task.downloadSpeed),
                      color: Color.Green,
                    },
                  });
                  const eta = formatEta(
                    task.totalLength,
                    task.completedLength,
                    task.downloadSpeed,
                  );
                  if (
                    eta !== "unknown" &&
                    eta !== "done" &&
                    eta !== "waiting"
                  ) {
                    accessories.push({ text: `ETA ${eta}` });
                  }
                }
              }
            } else if (isWaiting) {
              accessories.push({ text: `${progress.toFixed(1)}%` });
            } else if (isComplete) {
              accessories.push({ text: formatBytes(task.totalLength) });
            }

            return (
              <List.Item
                key={task.gid}
                icon={getTaskKindEmoji(kind)}
                title={getTaskName(task)}
                subtitle={subtitle}
                keywords={[kind, task.status, task.gid, getTaskKindLabel(kind)]}
                accessories={accessories}
                actions={taskActions(
                  task,
                  refresh,
                  () => push(<TaskDetail gid={task.gid} />),
                  toggle,
                )}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
