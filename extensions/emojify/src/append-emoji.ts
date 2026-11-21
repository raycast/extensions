import { Clipboard, closeMainWindow, getFrontmostApplication, getSelectedText, showHUD } from "@raycast/api";
import { AIConfigurationError, getAppendEmojis } from "./api";
import { appendEmojiText } from "./emoji-text";

export default async function Command() {
  try {
    await closeMainWindow();
    const originalApp = await getFrontmostApplication().catch(() => undefined);
    const text = await getSelectedText().catch(() => undefined);
    if (!text?.trim()) {
      await showHUD("Select Text to Append Emoji");
      return;
    }

    await showHUD("Finding Emoji…");
    const result = appendEmojiText(text, await getAppendEmojis(text));
    if (result === undefined) {
      await showHUD("The Model Did Not Return Valid Emoji");
      return;
    }
    if (result === text) {
      await showHUD("Emoji Already Present");
      return;
    }

    const currentText = await getSelectedText().catch(() => undefined);
    const currentApp = await getFrontmostApplication().catch(() => undefined);
    if (!originalApp || currentApp?.path !== originalApp.path || currentText !== text) {
      await Clipboard.copy(result);
      await showHUD("Selection or App Changed. Result Copied");
      return;
    }

    await Clipboard.paste(result);
    await showHUD("Emoji Appended");
  } catch (error) {
    await showHUD(error instanceof AIConfigurationError ? error.message : "Could Not Append Emoji");
  }
}
