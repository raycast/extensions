import {
  Clipboard,
  closeMainWindow,
  environment,
  getFrontmostApplication,
  getSelectedText,
  showHUD,
  WindowManagement,
} from "@raycast/api";
import { getAppendEmojiErrorMessage, getAppendEmojis } from "./api";
import { appendEmojiText } from "./emoji-text";

async function getPasteTarget() {
  if (!environment.canAccess(WindowManagement)) return undefined;

  const window = await WindowManagement.getActiveWindow().catch(() => undefined);
  const app = await getFrontmostApplication().catch(() => undefined);
  if (!app || !window?.id || window.application?.path !== app.path) return undefined;

  return { appPath: app.path, windowId: window.id };
}

export default async function Command() {
  try {
    await closeMainWindow();
    const originalTarget = await getPasteTarget();
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
    const currentTarget = await getPasteTarget();
    if (
      !originalTarget ||
      !currentTarget ||
      currentTarget.appPath !== originalTarget.appPath ||
      currentTarget.windowId !== originalTarget.windowId ||
      currentText !== text
    ) {
      await Clipboard.copy(result);
      await showHUD("Could Not Verify Paste Target. Result Copied");
      return;
    }

    await Clipboard.paste(result);
    await showHUD("Emoji Appended");
  } catch (error) {
    await showHUD(getAppendEmojiErrorMessage(error));
  }
}
