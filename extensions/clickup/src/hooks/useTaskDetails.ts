import { useEffect, useState } from "react";
import { showToast, ToastStyle } from "@raycast/api";
import { ClickUpClient } from "../utils/clickUpClient";
import type { Task } from "../types/task.dt";

function useTaskDetails(taskId: string) {
  const [task, setTask] = useState<Task | undefined>(undefined);

  useEffect(() => {
    async function getTeams() {
      try {
        const response = await ClickUpClient<Task>(`/task/${taskId}/?include_subtasks=true`);
        setTask(response.data ?? []);
      } catch (error: any) {
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
  }, [taskId]);

  return task;
}

export { useTaskDetails };
