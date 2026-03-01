import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { formatAsUS } from "./utils/phone";

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

  const formatted = formatAsUS(text);

  if (!formatted) {
    await showHUD("Not a US/Canada number — must be 10 or 11 digits");
    return;
  }

  await Clipboard.copy(formatted);
  await showHUD(`Copied: ${formatted}`);
}
