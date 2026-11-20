import {
  Clipboard,
  PopToRootType,
  Toast,
  closeMainWindow,
  showToast,
} from "@raycast/api";
import { readInputText } from "../hooks/use-selected-text-check";

type Checked = {
  /** The text the corrections were computed from */
  textChecked: string;
  /** Whether that text came from a selection rather than the clipboard */
  fromSelection: boolean;
};

/**
 * Puts the corrected text back, but only if what is in front of the user is
 * still what was checked.
 *
 * Raycast can bring a dismissed command back with everything as it was, and
 * gives a view no way to notice. By then the selection may be gone, or be
 * different text entirely — and pasting is destructive: it overwrites whatever
 * is selected now, or inserts at the cursor when nothing is. So the input is
 * read again and has to match on both counts. The source matters as much as
 * the characters: text that was checked as a selection must still be a live
 * selection, or the paste lands somewhere it was never meant to.
 *
 * Returns whether the text was replaced, so the caller can re-check.
 */
export async function replaceSelectionWith(
  text: string,
  checked: Checked,
): Promise<boolean> {
  const current = await readInputText();

  if (
    !current.text ||
    current.text !== checked.textChecked ||
    current.fromSelection !== checked.fromSelection
  ) {
    await showToast({
      style: Toast.Style.Failure,
      title: checked.fromSelection
        ? "The selection is no longer the text that was checked"
        : "The clipboard is no longer the text that was checked",
      message: checked.fromSelection
        ? "Select the text again and check it afresh"
        : "Copy the text again and check it afresh",
    });
    return false;
  }

  await Clipboard.paste(text);
  // Popping to root as well as closing matters: without it Raycast keeps the
  // command alive, and reopening it resumes a review of text that has already
  // been replaced, against a selection that is no longer there.
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  return true;
}

/**
 * What the replacement will actually do, in the reader's words.
 *
 * The text is not always a selection: with nothing selected the command falls
 * back to the clipboard, as Check Text Instant does, and then there is nothing
 * to replace — the result is pasted wherever the cursor is. Calling that
 * "Replace Selection" would promise something the command cannot deliver.
 */
export function replaceActionTitle(fromSelection: boolean): string {
  return fromSelection ? "Replace Selection" : "Paste Corrected Text";
}
