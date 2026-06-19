import { FloatingAppAction } from "./types";

/**
 * In the Floating Apps command, listed apps can now be either floating or not floating.
 * "Float" is undone by "unfloat", while both "toggle" and "unfloat" are undone
 * by floating the app again.
 */
export function getUndoFloatingAction(action: FloatingAppAction): FloatingAppAction | undefined {
  if (action === "float") {
    return "unfloat";
  }

  // Every other action in the floating-apps list removes the already-floating app,
  // so the matching undo action is always to float it again.
  return "float";
}
