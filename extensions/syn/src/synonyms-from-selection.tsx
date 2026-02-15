import { getSelectedText, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    const word = selectedText.trim();

    if (!word) {
      await showToast({ style: Toast.Style.Failure, title: "No text selected" });
      return;
    }

    await launchCommand({
      name: "synonyms",
      type: LaunchType.UserInitiated,
      arguments: { word },
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot read selected text",
      message: "Select a word and try again",
    });
  }
}
