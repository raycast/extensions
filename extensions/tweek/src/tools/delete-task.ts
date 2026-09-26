import { Action, Tool } from "@raycast/api";
import { invalidateTaskCache } from "../hooks/useTaskCache";
import { UpdateType } from "../types";
import { delete_task } from "../utils/tweek-client";

export type DeleteTaskToolInput = {
  /**
   * The ID of the task (or virtual occurrence ID `<taskId>_yyyyMMdd`) to delete.
   */
  taskId: string;
  /**
   * Optional title of the task (displayed in the confirmation prompt).
   */
  taskTitle?: string;
  /**
   * Optional recurring scope: "only_this", "this_and_future", or "all_linked".
   */
  updateType?: UpdateType;
};

/**
 * Asks the user for confirmation before Raycast AI deletes a Tweek task.
 */
export const confirmation: Tool.Confirmation<DeleteTaskToolInput> = async (
  input,
) => {
  return {
    style: Action.Style.Destructive,
    message: `Are you sure you want to delete "${input.taskTitle || input.taskId}" from Tweek?`,
    info: [
      { name: "Task", value: input.taskTitle || input.taskId },
      { name: "Task ID", value: input.taskId },
      { name: "Recurring Scope", value: input.updateType || "Single Task" },
    ],
  };
};

/**
 * Permanently deletes a task or recurring occurrence from Tweek.
 */
export default async function deleteTaskTool(input: DeleteTaskToolInput) {
  const res = await delete_task(input.taskId, input.updateType);
  invalidateTaskCache();
  return {
    success: true,
    taskId: res.id,
    deleted: res.deleted,
  };
}
