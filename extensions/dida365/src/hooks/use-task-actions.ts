import { showToast, Toast } from "@raycast/api";
import type { Dispatch, SetStateAction } from "react";
import { completeTask, describeApiError, updateTask } from "../api/dida365.js";
import type { Task } from "../types.js";

export function useTaskActions(setTasks: Dispatch<SetStateAction<Task[]>>) {
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

  async function handleUpdateChecklistItem(task: Task, itemIndex: number, status: number) {
    const items = task.items?.map((item, index) => (index === itemIndex ? { ...item, status } : item));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: status === 2 ? "Completing checklist item..." : "Reopening checklist item...",
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
      toast.title = status === 2 ? "Checklist item completed" : "Checklist item reopened";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update checklist item";
      toast.message = describeApiError(error);
    }
  }

  return { handleComplete, handleUpdateChecklistItem };
}
