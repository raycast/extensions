import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { countChanged, removeAccents } from "./accents";

/**
 * Strip the accents from whatever is selected in the frontmost app and paste the result back.
 *
 * `getSelectedText()` REJECTS when nothing is selected rather than returning "", which is why the
 * whole thing sits in a try/catch — an unhandled rejection here would surface to the user as a
 * generic extension crash instead of a sentence telling them to select something.
 */
export default async function Command(): Promise<void> {
  let selection: string;

  try {
    selection = await getSelectedText();
  } catch {
    await showHUD("Select some text first");
    return;
  }

  if (!selection.trim()) {
    await showHUD("Select some text first");
    return;
  }

  const stripped = removeAccents(selection);

  // Pasting an identical string would still overwrite the user's selection and cost them an undo
  // step, for no change. Say nothing happened instead.
  if (stripped === selection) {
    await showHUD("No accents to remove");
    return;
  }

  const changed = countChanged(selection, stripped);

  // The frontmost app can refuse a paste — a read-only field, a terminal in some modes. Without
  // this the command dies with a generic extension failure and the user cannot tell whether their
  // text was replaced or not.
  try {
    await Clipboard.paste(stripped);
  } catch {
    await Clipboard.copy(stripped);
    await showHUD("Could not paste there — copied to the clipboard instead");
    return;
  }

  await showHUD(`Removed accents from ${changed} letter${changed === 1 ? "" : "s"}`);
}
