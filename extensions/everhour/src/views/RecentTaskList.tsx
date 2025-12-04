import { useState, useEffect } from "react";
import { List, Icon, showToast, Toast } from "@raycast/api";
import { TaskListItem } from "../components";
import { getRecentTasks, getCurrentTimer } from "../api";
import { Task } from "../types";
import { createResolvedToast } from "../utils";

export function RecentTaskList() {
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
    const tasksResp = await getRecentTasks();
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

  const renderTasks = () => {
    if (tasks[0]) {
      return tasks
        .sort((t1, t2) => {
          // Active timer first.
          if (t1.id === activeTimerTaskId) return -1;
          if (t2.id === activeTimerTaskId) return 1;
          // Keep order otherwise.
          return 0;
          // Sort times descending by time.
          // return t1.time.recent > t2.time.recent ? -1 : 1;
        })
        .map((task) => (
          <TaskListItem
            key={task.id}
            refreshRecords={getRecentTasks}
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
