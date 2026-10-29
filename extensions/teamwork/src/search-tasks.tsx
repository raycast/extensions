import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  addRecentTask,
  addStarredTask,
  getRecentTasks,
  getStarredTasks,
  removeRecentTask,
  removeStarredTask,
  updateRecentTask,
  updateStarredTask,
} from "./recent";
import {
  fetchTask,
  isTimerAlreadyRunningError,
  searchTasks,
  startTimer,
  taskUrl,
} from "./teamwork";
import type { TeamworkTask } from "./types";

export default function Command() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "completed">("active");
  const [recents, setRecents] = useState<TeamworkTask[]>([]);
  const [starred, setStarred] = useState<TeamworkTask[]>([]);

  async function refreshStoredLists() {
    const [nextRecents, nextStarred] = await Promise.all([
      getRecentTasks(),
      getStarredTasks(),
    ]);
    setRecents(nextRecents);
    setStarred(nextStarred);
  }

  useEffect(() => {
    refreshStoredLists();
  }, []);

  const {
    data = [],
    isLoading,
    revalidate,
  } = usePromise(searchTasks, [query, filter === "completed"]);

  async function remember(task: TeamworkTask) {
    await addRecentTask(task);
    await refreshStoredLists();
  }

  async function beginTimer(task: TeamworkTask) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Teamwork timer…",
    });
    try {
      await startTimer(task);
      await remember(task);

      toast.style = Toast.Style.Success;
      toast.title = "Timer started";
      toast.message = task.name;

      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start timer";
      toast.message = isTimerAlreadyRunningError(error)
        ? "A timer is already running on this task."
        : error instanceof Error
          ? error.message
          : String(error);
    }
  }

  async function refreshRecent(task: TeamworkTask) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing task…",
    });
    try {
      const fresh = await fetchTask(task.id);
      if (fresh) {
        await updateRecentTask(fresh);
        await updateStarredTask(fresh);
        await refreshStoredLists();
        toast.style = Toast.Style.Success;
        toast.title = "Task refreshed";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Task not found";
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not refresh task";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function removeRecent(task: TeamworkTask) {
    await removeRecentTask(task.id);
    await refreshStoredLists();
  }

  async function starTask(task: TeamworkTask) {
    await addStarredTask(task);
    await refreshStoredLists();
  }

  async function unstarTask(task: TeamworkTask) {
    await removeStarredTask(task.id);
    await refreshStoredLists();
  }

  const recentLimit = Math.max(
    1,
    parseInt(getPreferenceValues<Preferences>().recentLimit, 10) || 5,
  );
  const showRecents =
    query.length === 0 && filter === "active" && recents.length > 0;
  const showStarred =
    query.length === 0 && filter === "active" && starred.length > 0;
  const starredIds = new Set(starred.map((task) => task.id));
  const visibleRecents = recents.filter((task) => !starredIds.has(task.id));
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks assigned to me…"
      onSearchTextChange={setQuery}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Tasks"
          value={filter}
          onChange={(value) => setFilter(value as "active" | "completed")}
        >
          <List.Dropdown.Item
            title="Active"
            value="active"
            icon={Icon.Circle}
          />
          <List.Dropdown.Item
            title="Completed"
            value="completed"
            icon={Icon.CheckCircle}
          />
        </List.Dropdown>
      }
    >
      {showStarred ? (
        <List.Section title="Starred">
          {starred.map((task) => (
            <TaskItem
              key={`starred-${task.id}`}
              task={task}
              onOpen={remember}
              onStart={beginTimer}
              onRefresh={refreshRecent}
              onStar={starTask}
              onUnstar={unstarTask}
              isStarred
            />
          ))}
        </List.Section>
      ) : null}
      {showRecents && visibleRecents.length > 0 ? (
        <List.Section title="Recent">
          {visibleRecents.slice(0, recentLimit).map((task) => (
            <TaskItem
              key={`recent-${task.id}`}
              task={task}
              onOpen={remember}
              onStart={beginTimer}
              onRefresh={refreshRecent}
              onRemove={removeRecent}
              onStar={starTask}
              onUnstar={unstarTask}
              isStarred={starredIds.has(task.id)}
            />
          ))}
        </List.Section>
      ) : null}
      <List.Section
        title={filter === "completed" ? "Completed" : "Assigned to Me"}
      >
        {data.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onOpen={remember}
            onStart={beginTimer}
            onStar={starTask}
            onUnstar={unstarTask}
            isStarred={starredIds.has(task.id)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function TaskItem({
  task,
  onOpen,
  onStart,
  onRefresh,
  onRemove,
  onStar,
  onUnstar,
  isStarred = false,
}: {
  task: TeamworkTask;
  onOpen: (task: TeamworkTask) => void;
  onStart: (task: TeamworkTask) => void;
  onRefresh?: (task: TeamworkTask) => void;
  onRemove?: (task: TeamworkTask) => void;
  onStar?: (task: TeamworkTask) => void;
  onUnstar?: (task: TeamworkTask) => void;
  isStarred?: boolean;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (isStarred)
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  if (task.dueDate)
    accessories.push({
      date: new Date(task.dueDate),
      tooltip: `Due ${task.dueDate}`,
    });

  const isCompleted = task.status === "completed";
  const icon = isCompleted
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: Icon.Circle, tintColor: Color.SecondaryText };

  return (
    <List.Item
      icon={icon}
      title={task.name}
      subtitle={task.tasklistName}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Start Timer"
            icon={Icon.Stopwatch}
            onAction={() => onStart(task)}
          />
          <Action
            title="Open in Teamwork"
            icon={Icon.Globe}
            onAction={async () => {
              await onOpen(task);
              await open(taskUrl(task.id));
            }}
          />
          <Action.CopyToClipboard
            title="Copy Task Link"
            content={taskUrl(task.id)}
          />
          <Action.CopyToClipboard
            title="Copy Task Name"
            content={task.name}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {isStarred && onUnstar ? (
            <Action
              title="Remove Star"
              icon={Icon.StarDisabled}
              onAction={() => onUnstar(task)}
            />
          ) : onStar ? (
            <Action
              title="Star Task"
              icon={Icon.Star}
              onAction={() => onStar(task)}
            />
          ) : null}
          {onRefresh ? (
            <Action
              title="Refresh Task"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => onRefresh(task)}
            />
          ) : null}
          {onRemove ? (
            <Action
              title="Remove from Recents"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => onRemove(task)}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
