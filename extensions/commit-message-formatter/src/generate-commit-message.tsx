import { getPreferenceValues, getSelectedText, Clipboard, showToast, Toast, showHUD } from "@raycast/api";
import { getCommitMessage } from "./lib/utils";

export default async function GenerateCommitMessage() {
  const { action } = getPreferenceValues<Preferences.GenerateCommitMessage>();
  let commitMessage: string | undefined = undefined;
  try {
    commitMessage = await getSelectedText();
  } catch (error) {
    commitMessage = await Clipboard.readText();
  }
  if (!commitMessage) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected or copied",
    });
    return;
  }
  await showToast({
    style: Toast.Style.Animated,
    title: "Generating commit message...",
  });
  const formattedCommitMessage = await getCommitMessage(commitMessage);
  if (!formattedCommitMessage) {
    return;
  }
  if (action.includes("paste")) {
    await Clipboard.paste(formattedCommitMessage);
  }
  if (action.includes("copy")) {
    await showHUD("Commit message copied to clipboard");
    await Clipboard.copy(formattedCommitMessage);
  }
}
