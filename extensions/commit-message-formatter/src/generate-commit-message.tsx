import { getPreferenceValues, getSelectedText, Clipboard, showToast, Toast, showHUD } from "@raycast/api";
import { getCommitMessage } from "./lib/utils";

export default async function GenerateCommitMessage() {
  const { action } = getPreferenceValues<Preferences.GenerateCommitMessage>();

  const selectedText = (await getSelectedText()) || (await Clipboard.readText());
  if (!selectedText) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
    });
    return;
  }
  await showToast({
    style: Toast.Style.Animated,
    title: "Generating commit message...",
  });
  const commitMessage = await getCommitMessage(selectedText);
  if (!commitMessage) {
    return;
  }
  if (action.includes("paste")) {
    await Clipboard.paste(commitMessage);
  }
  if (action.includes("copy")) {
    await showHUD("Commit message copied to clipboard");
    await Clipboard.copy(commitMessage);
  }
}
