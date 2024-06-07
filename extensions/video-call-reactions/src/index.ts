// index.ts
import { showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { executeReaction } from "./executeReaction";
import {
  REACTION_CONFETTI,
  ERROR_VIDEO_MENU_NOT_VISIBLE,
  TITLE_REACTION_ERROR,
  MESSAGE_TOAST_NO_VIDEO_CALL,
  MAP_REACTION_COMMANDS,
  TITLE_TOAST_REACTION_MISSING,
  showConfetti,
  MESSAGE_UNKNOWN_ERROR,
  Preferences,
} from "./constants";

function handleNoVideoCall(preferences: Preferences): void {
  if (preferences.showConfetti && preferences.defaultReaction === REACTION_CONFETTI) {
    showConfetti(preferences, true);
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: MESSAGE_TOAST_NO_VIDEO_CALL,
      message: MESSAGE_TOAST_NO_VIDEO_CALL,
    });
  }
}

export default async function main() {
  await closeMainWindow();
  const preferences = getPreferenceValues<Preferences>();
  const reactionCommand = MAP_REACTION_COMMANDS[preferences.defaultReaction];

  if (!reactionCommand) {
    showToast({
      style: Toast.Style.Failure,
      title: TITLE_REACTION_ERROR,
      message: TITLE_TOAST_REACTION_MISSING,
    });
    return;
  }

  try {
    await executeReaction(reactionCommand, preferences);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === ERROR_VIDEO_MENU_NOT_VISIBLE) {
        handleNoVideoCall(preferences);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: TITLE_REACTION_ERROR,
          message: error.message,
        });
      }
    } else {
      console.error(MESSAGE_UNKNOWN_ERROR, error);
      showToast({
        style: Toast.Style.Failure,
        title: TITLE_REACTION_ERROR,
        message: MESSAGE_UNKNOWN_ERROR,
      });
    }
  }
}
