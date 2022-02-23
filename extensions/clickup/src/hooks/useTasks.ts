import { useEffect, useState } from "react";
import { showToast, ToastStyle } from "@raycast/api";
import { ClickUpClient } from "../utils/clickUpClient";
import type { TaskItem, TasksResponse } from "../types/tasks.dt";

function useTasks(listId: string) {
  const [tasks, setTasks] = useState<TaskItem[] | undefined>(undefined);

  useEffect(() => {
    async function getTeams() {
      try {
        const response = await ClickUpClient<TasksResponse>(`/list/${listId}/task?archived=false`);
        setTasks(response.data?.tasks ?? []);
      } catch (error: any) {
        setTasks([]);
        error?.response?.data
          ? await showToast(
              ToastStyle.Failure,
              "Something went wrong",
              `${error?.response?.data?.err} - ${error?.response?.data?.ECODE}`
            )
          : await showToast(ToastStyle.Failure, "Something went wrong");
      }
    }

    getTeams().then((r) => r);
  }, [listId]);

  return tasks;
}

export { useTasks };
