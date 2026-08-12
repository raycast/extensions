import { view } from "../lib/jovida";
import { toolPreflight } from "../lib/tool-helpers";

type Input = {
  /**
   * The entry_id, recurring_id, or recurring:<id>:<timestamp> occurrence id to inspect.
   * Get it from get-todos first — never guess it.
   */
  entryId: string;
};

/**
 * Return full details for one Jovida todo, repeating todo, or occurrence:
 * description, subtasks with ids/completion state, reminders, reminder channels,
 * and repeat rule when applicable. Use before precise edits such as checking a
 * specific subtask by id or index.
 */
export default async function tool(input: Input) {
  const blocked = await toolPreflight();
  if (blocked) return blocked;
  return view(input.entryId);
}
