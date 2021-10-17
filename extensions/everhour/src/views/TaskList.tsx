import { useState, useEffect } from "react";
import { List, Icon, showToast, ToastStyle } from "@raycast/api";
import { TaskListItem } from "../components";
import { getTasks, getCurrentTimer } from "../api";
import { Task } from "../types";

export function TaskList({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<null | string>(null);

  const refreshActiveTimer = async () => {
    try {
      const activeTimer = await getCurrentTimer();
      setActiveTimerTaskId(activeTimer);
    } catch (error) {
       await showToast(ToastStyle.Failure, "Failed to refresh tasks");
    }
  };

  const fetchTasks = async () => {
    const tasksResp = await getTasks(projectId);
    setTasks(tasksResp);
  };

  useEffect(() => {
    async function fetch() {
      try {
        await fetchTasks();
        setIsLoading(false);
      } catch (error) {
        const message = (error as { message: string }).message;
        await showToast(ToastStyle.Failure, message || "Failed to fetch projects");
        setIsLoading(false);
      }
    }
    fetch();
  }, []);

  useEffect(() => {
    refreshActiveTimer();
  }, [activeTimerTaskId]);

  const renderTasks = () => {
    if (!isLoading && tasks[0]) {
      return tasks.map((task) => (
        <TaskListItem
          key={task.id}
          fetchTasks={fetchTasks}
          refreshActiveTimer={refreshActiveTimer}
          task={task}
          hasActiveTimer={task.id === activeTimerTaskId}
        />
      ));
    }

    if (!isLoading && !tasks[0]) {
      return <List.Item title="No tasks found" icon={Icon.XmarkCircle} />;
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tasks by name...">
      {renderTasks()}
    </List>
  );
}
