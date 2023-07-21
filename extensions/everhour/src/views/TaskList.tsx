import { useState, useEffect } from "react";
import { List, Icon, showToast, ToastStyle } from "@raycast/api";
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
    const toast = await showToast(ToastStyle.Animated, "Refreshing tasks");
    try {
      const activeTimer = await getCurrentTimer();
      setActiveTimerTaskId(activeTimer);
      createResolvedToast(toast, "Tasks refreshed").success();
    } catch (error) {
      createResolvedToast(toast, "Failed to refresh tasks").error();
    }
  };

  const fetchTasks = async () => {
    const tasksResp = await getTasks(projectId);

    setTasks(tasksResp);
  };

  useEffect(() => {
    async function fetch() {
      const toast = await showToast(ToastStyle.Animated, "Fetching tasks");
      try {
        await fetchTasks();
        setIsLoading(false);
        createResolvedToast(toast, "Tasks fetched").success();
      } catch (error) {
        const message = (error as { message: string }).message;
        createResolvedToast(toast, message || "Failed to fetch projects").error();
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
      return tasks.map((task) => (
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
      ));
    }

    if (!isLoading && tasks[0]) {
      return <List.Item title="No tasks found" icon={Icon.XmarkCircle} />;
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tasks by name...">
      {renderTasks()}
    </List>
  );
}
