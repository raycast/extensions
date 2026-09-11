import { loadState, type ExtensionState } from "./store";

/**
 * Reads are gated on membership alone: a disabled val can still be inspected, since reading its
 * data or its failures is how the user decides to re-enable it. Only running requires `active`.
 */
export async function requireAllowed(val: string): Promise<ExtensionState> {
  const state = await loadState();
  if (!state.tools[val]) {
    const allowed = Object.keys(state.tools).join(", ");
    throw new Error(`${val} is not one of the user's allowed vals. Allowed: ${allowed || "none"}.`);
  }
  return state;
}
