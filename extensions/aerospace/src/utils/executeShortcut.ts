import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { failureToastOptions, triggerBinding } from "./aerospace";
import { Shortcut } from "./config";

export async function executeShortcutInMode(shortcut: Shortcut): Promise<void> {
  try {
    await triggerBinding(shortcut.mode, shortcut.key);
    await showHUD(`Activated ${shortcut.key}`);
  } catch (error) {
    await showFailureToast(error, failureToastOptions(`Could Not Activate ${shortcut.key}`));
  }
}
