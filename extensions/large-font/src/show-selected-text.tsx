import { getSelectedText, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";

/**
 * This no-view command is intentionally the hotkey target. It runs on every
 * invocation, captures a fresh selection, then opens/replaces the display view.
 */
export default async function ShowSelectedText() {
  try {
    const text = await getSelectedText();
    await launchCommand({
      name: "display-selected-text",
      type: LaunchType.UserInitiated,
      context: { text },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No selected text available",
      message: "Select text in another app, then invoke Large Font.",
    });
    console.error(error);
  }
}
