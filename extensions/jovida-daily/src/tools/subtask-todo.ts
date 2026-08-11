import { updateSubtasks } from "../lib/jovida";
import { toolPreflight } from "../lib/tool-helpers";

type Input = {
  /**
   * The entry_id of a real todo. Get it from get-todos or view-todo first.
   * Repeating todo templates do not support per-occurrence subtask checking.
   */
  entryId: string;
  /** Operation to perform on the todo's subtasks. */
  action: "check" | "uncheck" | "add" | "remove";
  /**
   * For check/uncheck/remove: subtask ids or 1-based indexes from view-todo.
   * Omit for add.
   */
  targets?: string[];
  /** For add: the new subtask title. */
  title?: string;
};

/**
 * Manage subtasks without replacing the whole subtask list. Use this for
 * requests like "mark the second subtask done", "uncheck metrics", or "add a
 * subtask". For check/uncheck/remove, call view-todo first when you need
 * subtask ids or indexes.
 */
export default async function tool(input: Input) {
  const blocked = await toolPreflight();
  if (blocked) return blocked;

  if (input.action === "add") {
    const title = input.title?.trim();
    if (!title) {
      return "A subtask title is required for the add action.";
    }
    return updateSubtasks(input.entryId, {
      action: "add",
      title,
    });
  }

  return updateSubtasks(input.entryId, {
    action: input.action,
    targets: input.targets ?? [],
  });
}
