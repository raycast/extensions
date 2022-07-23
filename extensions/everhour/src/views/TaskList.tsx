import { useState, useEffect } from "react";
import { List, Icon, showToast, ToastStyle } from "@raycast/api";
import { TaskListItem } from "../components";
import { getCurrentTimer, getTasks } from "../api";
import { createResolvedToast } from "../utils";

const filterTasks = (records: Array<any>, projectId: string) => {
  return records.filter((record: any) => record.projectId === projectId);
};

export function TaskList({
  projectId,
  timeRecords,
  refreshRecords,
}: {
  projectId: string;
  timeRecords: Array<any>;
  refreshRecords: () => Promise<any[]>;
}) {
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<null | string>(null);
  const [tasks, setTasks] = useState<Array<any>>([]);
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

  const todaysTimeRecords = filterTasks(timeRecords, projectId);

  const renderTasks = () => {
    if (tasks[0]) {
      return tasks.map((task) => (
        <TaskListItem
          key={task.id}
          todaysTimeRecords={todaysTimeRecords}
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
      return <List.Item title="No tasks found" icon={Icon.XMarkCircle} />;
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tasks by name...">
      {renderTasks()}
    </List>
  );
}
