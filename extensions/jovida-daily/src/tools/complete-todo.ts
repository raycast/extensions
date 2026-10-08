import { complete } from "../lib/jovida";
import { toolPreflight } from "../lib/tool-helpers";

type Input = {
  /**
   * The entry_id(s) to mark done. Get them from get-todos first — never guess.
   * For a repeating todo, pass an occurrence id to tick off just that date.
   */
  entryIds: string[];
};

/**
 * Mark one or more Jovida todos as done. Applies immediately and is reversible
 * (they can be reopened). Get the entry_id(s) from get-todos first.
 */
export default async function tool(input: Input) {
  const blocked = await toolPreflight();
  if (blocked) return blocked;
  return complete(input.entryIds);
}
