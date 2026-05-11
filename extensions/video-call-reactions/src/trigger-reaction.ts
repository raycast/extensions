// Command to trigger a reaction based on user input or default preference
import { closeMainWindow, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { TITLE_TOAST_REACTION_MISSING, MESSAGE_TOAST_REACTION_MISSING, handleReactionExecution } from "./common";

export default async function main(args: { arguments: { reaction?: string } }) {
  await closeMainWindow();
  const preferences = getPreferenceValues<Preferences>();
  // Use the provided reaction or fall back to the default reaction
  const reactionName = args.arguments.reaction || preferences.defaultReaction;

  if (reactionName) {
    // Execute the reaction command
    await handleReactionExecution(reactionName, preferences);
  } else {
    // Show an error toast if the reaction command does not exist
    showToast(Toast.Style.Failure, TITLE_TOAST_REACTION_MISSING, MESSAGE_TOAST_REACTION_MISSING);
  }
}
