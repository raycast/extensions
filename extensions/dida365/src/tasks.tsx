import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  completeTask,
  describeApiError,
  listOpenTasks,
  updateTask,
} from "./api/dida365.js";
import { TaskListItem } from "./components/task-list-item.js";
import { SetupTokenView } from "./components/setup-token-view.js";
import { isMissingApiToken } from "./setup.js";
import type { Task } from "./types.js";
import { groupTasksByProject, taskSearchText } from "./utils/task.js";

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [searchText, setSearchText] = useState("");

  async function loadTasks() {
    setIsLoading(true);
    try {
      setTasks(await listOpenTasks());
    } catch (error) {
      if (isMissingApiToken(error)) {
        setNeedsSetup(true);
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: describeApiError(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const openTasks = tasks.filter((task) => task.status !== 2);

    if (!query) {
      return openTasks;
    }

    return openTasks.filter((task) =>
      taskSearchText(task).toLowerCase().includes(query),
    );
  }, [searchText, tasks]);

  const taskGroups = useMemo(
    () => groupTasksByProject(filteredTasks),
    [filteredTasks],
  );

  async function handleComplete(task: Task) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Completing task...",
    });

    try {
      await completeTask(task);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      toast.style = Toast.Style.Success;
      toast.title = "Task completed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to complete task";
      toast.message = describeApiError(error);
    }
  }

  async function handleUpdateChecklistItem(
    task: Task,
    itemIndex: number,
    status: number,
  ) {
    const items = task.items?.map((item, index) =>
      index === itemIndex ? { ...item, status } : item,
    );

    const toast = await showToast({
      style: Toast.Style.Animated,
      title:
        status === 2
          ? "Completing checklist item..."
          : "Reopening checklist item...",
    });

    try {
      const updatedTask = await updateTask({ ...task, items });
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id && item.projectId === task.projectId
            ? { ...item, ...updatedTask, projectId: task.projectId }
            : item,
        ),
      );
      toast.style = Toast.Style.Success;
      toast.title =
        status === 2 ? "Checklist item completed" : "Checklist item reopened";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update checklist item";
      toast.message = describeApiError(error);
    }
  }

  if (needsSetup) {
    return <SetupTokenView />;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search Dida365 tasks..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {taskGroups.map((group) => (
        <List.Section
          key={group.key}
          title={group.title}
          subtitle={`${group.tasks.length}`}
        >
          {group.tasks.map((task) => (
            <TaskListItem
              key={`${task.projectId}:${task.id}`}
              task={task}
              onComplete={handleComplete}
              onUpdateChecklistItem={handleUpdateChecklistItem}
              onRefresh={loadTasks}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
