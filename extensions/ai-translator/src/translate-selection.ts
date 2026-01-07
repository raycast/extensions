import {
  getSelectedText,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
} from "@raycast/api";

export default async function Command() {
  try {
    // Get selected text
    let selectedText: string;
    try {
      selectedText = await getSelectedText();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Selection",
        message:
          "Raycast could not get selected text. Please check permissions.",
      });
      return;
    }

    if (!selectedText || selectedText.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Selection",
        message: "Please select some text first",
      });
      return;
    }

    // Launch the translate-preview command with the selected text
    await launchCommand({
      name: "translate-preview",
      type: LaunchType.UserInitiated,
      context: { text: selectedText.trim() },
    });
  } catch (error) {
    console.error("Translate selection error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Launch",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}
