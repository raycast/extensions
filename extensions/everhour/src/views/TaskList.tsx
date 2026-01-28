import { useState, useEffect } from "react";
import { List, Icon, showToast, Toast } from "@raycast/api";
import { TaskListItem } from "../components";
import { getCurrentTimer, getTasks } from "../api";
import { createResolvedToast } from "../utils";
import { Task } from "../types";

const filterTasks = (records: Array<Task>, projectId: string) => {
  return records.filter((record: Task) => record.projects[0] === projectId);
};

export function TaskList({
  projectId,
  timeRecords,
  refreshRecords,
}: {
  projectId: string;
  timeRecords: Array<Task>;
  refreshRecords: () => Promise<Array<Task>>;
}) {
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<null | string>(null);
  const [tasks, setTasks] = useState<Array<Task>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshActiveTimer = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing Tasks",
    });
    try {
      const activeTimer = await getCurrentTimer();
      setActiveTimerTaskId(activeTimer);
      createResolvedToast(toast, "Tasks Refreshed").success();
    } catch (error) {
      createResolvedToast(toast, "Failed to Refresh Tasks").error();
    }
  };

  const fetchTasks = async () => {
    const tasksResp = await getTasks(projectId);

    setTasks(tasksResp);
  };

  useEffect(() => {
    async function fetch() {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Fetching Tasks",
      });
      try {
        await fetchTasks();
        setIsLoading(false);
        createResolvedToast(toast, "Tasks Fetched").success();
      } catch (error) {
        const message = (error as { message: string }).message;
        createResolvedToast(toast, message || "Failed to Fetch Projects").error();
        setIsLoading(false);
      }
    }
    fetch();
  }, []);

  useEffect(() => {
    refreshActiveTimer();
  }, [activeTimerTaskId]);

  const recentTimeRecords = filterTasks(timeRecords, projectId);

  const renderTasks = () => {
    if (tasks[0]) {
      return (
        <List.Section title={`Projects / ${projectId} / Tasks`}>
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              recentTimeRecords={recentTimeRecords}
              refreshRecords={() => {
                fetchTasks();
                return refreshRecords();
              }}
              refreshActiveTimer={refreshActiveTimer}
              task={task}
              hasActiveTimer={task.id === activeTimerTaskId}
            />
          ))}
        </List.Section>
      );
    }

    if (!isLoading && tasks[0]) {
      return <List.Item title="No tasks found" icon={Icon.XMarkCircle} />;
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tasks by name...">
      {renderTasks()}
    </List>
  );
}
