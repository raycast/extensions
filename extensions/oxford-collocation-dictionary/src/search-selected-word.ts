import { getSelectedText, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    await launchCommand({ name: "search", type: LaunchType.UserInitiated, context: { selectedText } });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to get selected text",
    });
  }
}
