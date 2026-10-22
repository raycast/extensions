import { invalidateTaskCache } from "../hooks/useTaskCache";
import { UpdateType } from "../types";
import { addDaysISO, getTodayISO } from "../utils/date-utils";
import { update_task } from "../utils/tweek-client";

type Input = {
  /**
   * The ID of the task (or virtual occurrence ID `<taskId>_yyyyMMdd`) to update.
   */
  taskId: string;
  /**
   * Optional new title for the task.
   */
  text?: string;
  /**
   * Optional new date in YYYY-MM-DD format, or "today" / "tomorrow".
   */
  date?: string;
  /**
   * Optional new color badge ("blank", "pink", "yellowish", "cornflower", "mango", "greenish", "lilac", "grey", "black").
   */
  color?: string;
  /**
   * Optional new Markdown note.
   */
  note?: string;
  /**
   * Optional completion status (true or false).
   */
  done?: boolean;
  /**
   * Optional recurring update scope: "only_this", "this_and_future", or "all_linked".
   */
  updateType?: string;
};

/**
 * Updates an existing Tweek task's title, date, color, note, or completion status.
 */
export default async function updateTaskTool(input: Input) {
  const todayISO = getTodayISO();
  let resolvedDate: string | undefined;

  if (input.date) {
    const raw = input.date.trim().toLowerCase();
    if (raw === "today") {
      resolvedDate = todayISO;
    } else if (raw === "tomorrow") {
      resolvedDate = addDaysISO(todayISO, 1);
    } else {
      resolvedDate = input.date.trim();
    }
  }

  const validUpdateType =
    input.updateType === "only_this" ||
    input.updateType === "this_and_future" ||
    input.updateType === "all_linked"
      ? (input.updateType as UpdateType)
      : undefined;

  const res = await update_task(
    input.taskId,
    {
      text: input.text,
      date: resolvedDate,
      color: input.color,
      note: input.note,
      done: input.done,
    },
    validUpdateType,
  );

  invalidateTaskCache();

  return {
    success: true,
    id: res.id,
    updated: res.updated,
  };
}
