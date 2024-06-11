// trigger-preset-reaction.ts
// Command to trigger the preset reaction
import { closeMainWindow, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { TITLE_TOAST_REACTION_MISSING, MESSAGE_TOAST_REACTION_MISSING, handleReactionExecution } from "./common";

export default async function main() {
  await closeMainWindow();
  const preferences = getPreferenceValues<Preferences>();
  const reactionName = preferences.defaultReaction;

  if (reactionName) {
    // If the reaction command exists, execute it
    await handleReactionExecution(reactionName, preferences);
  } else {
    // If the reaction command does not exist, show an error toast
    showToast(Toast.Style.Failure, TITLE_TOAST_REACTION_MISSING, MESSAGE_TOAST_REACTION_MISSING);
  }
}
