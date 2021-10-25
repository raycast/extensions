import { useState, useEffect } from "react";
import { List, Icon, showToast, ToastStyle } from "@raycast/api";
import { TaskListItem } from "../components";
import { getCurrentTimer } from "../api";
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
  refreshRecords: () => Promise<Array<any>>;
}) {
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<null | string>(null);
  const [tasks, setTasks] = useState<Array<any>>(filterTasks(timeRecords, projectId));

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

  useEffect(() => {
    refreshActiveTimer();
  }, [activeTimerTaskId]);

  const renderTasks = () => {
    if (tasks[0]) {
      return tasks.map((task) => (
        <TaskListItem
          key={task.id}
          refreshRecords={async () => {
            const records = await refreshRecords();
            setTasks(filterTasks(records, projectId));
          }}
          refreshActiveTimer={refreshActiveTimer}
          task={task}
          hasActiveTimer={task.id === activeTimerTaskId}
        />
      ));
    }

    return <List.Item title="No tasks found" icon={Icon.XmarkCircle} />;
  };

  return <List searchBarPlaceholder="Filter tasks by name...">{renderTasks()}</List>;
}
