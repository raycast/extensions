import { LaunchProps, showHUD } from "@raycast/api";
import { appendToDaily } from "./lib/notes";
import { notesRoot } from "./lib/prefs";

/**
 * Capture is fire-and-forget, so every exit clears the root search — otherwise
 * the next launch opens on the stale query typed to reach this command.
 */
const DISMISS = { clearRootSearch: true };

export default async function QuickNote(props: LaunchProps<{ arguments: { text: string } }>) {
  const text = props.arguments.text.trim();
  if (!text) {
    await showHUD("Nothing to save", DISMISS);
    return;
  }

  try {
    appendToDaily(notesRoot(), text, new Date());
    await showHUD("Saved to today's note", DISMISS);
  } catch (error) {
    await showHUD(`Could not save: ${error instanceof Error ? error.message : String(error)}`, DISMISS);
  }
}
