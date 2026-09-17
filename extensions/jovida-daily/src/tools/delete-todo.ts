import { Action, Tool } from "@raycast/api";
import { remove, view } from "../lib/jovida";
import { toolPreflight } from "../lib/tool-helpers";

type Input = {
  /**
   * The entry_id(s) to permanently delete. Get them from get-todos first —
   * never guess. To stop a routine, pass its recurring_id. Un-materialized
   * recurring:<id>:<timestamp> occurrences cannot be deleted; complete them
   * instead.
   */
  entryIds: string[];
};

/**
 * Permanently delete one or more Jovida todos. This is NOT reversible — there
 * is no undo. Prefer complete-todo unless the item was never real. Get the
 * entry_id(s) from get-todos first.
 */
export default async function tool(input: Input) {
  const blocked = await toolPreflight();
  if (blocked) return blocked;
  await remove(input.entryIds);
  return { entry_ids: input.entryIds, status: "deleted" };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const blocked = await toolPreflight();
  if (blocked) {
    return {
      style: Action.Style.Destructive,
      message: blocked,
    };
  }

  const titles = await Promise.all(
    input.entryIds.map(async (id) => {
      try {
        const t = await view(id);
        return t?.title ?? id;
      } catch {
        return id;
      }
    }),
  );
  return {
    style: Action.Style.Destructive,
    message: `Permanently delete ${input.entryIds.length} todo${
      input.entryIds.length === 1 ? "" : "s"
    }? This cannot be undone.`,
    info: titles.map((title, i) => ({ name: `#${i + 1}`, value: title })),
  };
};
