// Command to trigger a custom reaction based on user input
import { closeMainWindow, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { TITLE_TOAST_REACTION_MISSING, MESSAGE_TOAST_REACTION_MISSING, handleReactionExecution } from "./common";

export default async function main(args: { arguments: { reaction?: string } }) {
  await closeMainWindow();
  const preferences = getPreferenceValues<Preferences>();
  const reactionName = args.arguments.reaction;

  if (reactionName) {
    // If the reaction command exists, execute it
    await handleReactionExecution(reactionName, preferences);
  } else {
    // If the reaction command does not exist, show an error toast
    showToast(Toast.Style.Failure, TITLE_TOAST_REACTION_MISSING, MESSAGE_TOAST_REACTION_MISSING);
  }
}
