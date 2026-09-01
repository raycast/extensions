import { Clipboard, PopToRootType, closeMainWindow } from "@raycast/api";

/**
 * Puts the text back where the selection was and ends the run.
 *
 * Popping to root as well as closing matters: without it Raycast keeps the
 * command alive, and reopening it resumes a review of text that has already
 * been replaced, against a selection that is no longer there.
 */
export async function replaceSelectionWith(text: string): Promise<void> {
  await Clipboard.paste(text);
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
}
