import { getSpaces } from "./dia";
import { AUTOMATION_PERMISSION_MESSAGE, toAutomationError } from "./find-tab";

/** Reads Dia's spaces for a tool, or throws a message the AI can act on. */
export async function readSpacesForTool() {
  const spaces = await getSpaces().catch((error) => {
    throw toAutomationError(error);
  });
  if (spaces.names.length === 0) {
    throw new Error(`No Dia window is open. Open a Dia window and try again. ${AUTOMATION_PERMISSION_MESSAGE}`);
  }
  return spaces;
}

/** Resolves a space name case-insensitively, or throws with the list of spaces to pick from. */
export function findSpaceName(names: string[], space: string): string {
  const wanted = space.trim().toLowerCase();
  const match = names.find((name) => name.toLowerCase() === wanted);
  if (match) return match;
  const partial = names.filter((name) => name.toLowerCase().includes(wanted));
  if (partial.length === 1) return partial[0];
  throw new Error(`No Dia space is named "${space.trim()}". The spaces are: ${names.join(", ")}.`);
}
