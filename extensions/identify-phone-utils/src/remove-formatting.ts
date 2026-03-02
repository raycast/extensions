import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { stripFormatting } from "./utils/phone";

export default async function Command() {
  let text: string | undefined;

  try {
    const selected = await getSelectedText();
    if (selected?.trim()) text = selected.trim();
  } catch {
    // nothing selected — fall through to clipboard
  }

  if (!text) {
    try {
      text = (await Clipboard.readText()) ?? undefined;
    } catch (error) {
      await showFailureToast(error, { title: "Cannot read clipboard" });
      return;
    }
  }

  if (!text?.trim()) {
    await showHUD("No text found — copy a phone number first");
    return;
  }

  const stripped = stripFormatting(text);

  if (!stripped) {
    await showHUD("No digits found in the text");
    return;
  }

  await Clipboard.copy(stripped);
  await showHUD(`Copied: ${stripped}`);
}
