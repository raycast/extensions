import { invalidateTaskCache } from "../hooks/useTaskCache";
import { UpdateType } from "../types";
import { complete_task } from "../utils/tweek-client";

type Input = {
  /**
   * The ID of the task (or virtual occurrence ID `<taskId>_yyyyMMdd`) to mark completed or pending.
   */
  taskId: string;
  /**
   * Set to true to mark completed (default), or false to mark pending again.
   */
  done?: boolean;
  /**
   * Optional recurring scope: "only_this", "this_and_future", or "all_linked".
   */
  updateType?: string;
};

/**
 * Marks a Tweek task (or recurring occurrence) as completed or pending.
 */
export default async function completeTaskTool(input: Input) {
  const validUpdateType =
    input.updateType === "only_this" ||
    input.updateType === "this_and_future" ||
    input.updateType === "all_linked"
      ? (input.updateType as UpdateType)
      : undefined;

  const res = await complete_task(
    input.taskId,
    input.done ?? true,
    validUpdateType,
  );
  invalidateTaskCache();
  return {
    success: true,
    taskId: res.id,
    done: res.done,
  };
}
