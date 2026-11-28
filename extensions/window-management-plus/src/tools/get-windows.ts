import { listWindows } from "../lib/raycast";

/**
 * Lists every display and every open window on the current desktop: its id, app, title, which display
 * it is on, whether it has focus, and its frame in that display's coordinates.
 */
export default async function tool() {
  const { displays, windows } = await listWindows();
  return { displays, windows };
}
