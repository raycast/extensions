import { open, showToast, Toast } from "@raycast/api";
import { reportError } from "./errors";
import {
  buildCreateNoteDeeplink,
  buildFloatingNoteText,
  type FloatingNoteInput,
} from "./floating-note-model";

/**
 * Create a new Raycast Note pre-filled with the expression study card, so it
 * stays visible (as a floating note) after the Raycast window dismisses.
 */
export async function saveToFloatingNote(
  input: FloatingNoteInput,
): Promise<void> {
  try {
    await open(buildCreateNoteDeeplink(buildFloatingNoteText(input)));
    await showToast({
      style: Toast.Style.Success,
      title: "Saved to Floating Note",
    });
  } catch (err) {
    await reportError(err);
  }
}
