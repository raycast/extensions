// constants.ts
import { showToast, Toast, environment, open } from "@raycast/api";
import { exec } from "child_process";
// File and Command Constants
export const SOUND_FILE_NAME = "mixkit-happy-crowd-cheer-975.wav";
export const COMMAND_PLAY_SOUND = `afplay "${environment.assetsPath}/${SOUND_FILE_NAME}"`;
export const COMMAND_LAUNCH_CONFFETI = "raycast://confetti";

// Reaction Constants
export const REACTION_CONFETTI = "Confetti 🎉";
export const MESSAGE_CONFETTI_TRIGGERED = "Raycast Confetti Triggered!";
export const ERROR_REACTION_UNAVAILABLE = "Reaction unavailable.";
export const ERROR_VIDEO_MENU_NOT_VISIBLE = "The green video menu icon is not visible.";
export const ERROR_REACTIONS_CHECKBOX_MISSING = "Reactions checkbox does not exist.";
export const ERROR_REACTIONS_SUBMENU_MISSING = "Reactions submenu UI element does not exist.";
export const ERROR_REACTION_BUTTON_MISSING = "Reaction button does not exist.";

// Success and Error Messages
export const MESSAGE_REACTION_DEPLOYED = "The video call reaction has been successfully deployed.";
export const TITLE_REACTION_ERROR = "Reaction Error";
export const MESSAGE_UNKNOWN_ERROR = "An unknown error occurred. Please try again.";
export const STATUS_SUCCESS = "Success";
export const MESSAGE_PLEASE_WAIT = "Please wait...";
export const MESSAGE_SOUND_PLAYED = "Raycast's confetti and sound triggered";
export const MESSAGE_SOUND_NOT_PLAYED = "Raycast's confetti triggered";

// Toast Titles
export const TITLE_TOAST_TRIGGER_FAILURE = "Unable to Trigger ";
export const TITLE_TOAST_REACTION_MISSING = "Reaction Not Found";
export const TITLE_TOAST_ERROR = "Error";

// Toast Messages
export const MESSAGE_TOAST_NO_VIDEO_CALL = "No active video call detected.";
export const MESSAGE_TOAST_REACTION_MISSING = "The selected reaction could not be found. Please check your settings.";

// Error Handling Functions
export function handleErrorSound(error: Error | null) {
  if (error) {
    console.error(`Failed to play sound: ${error.message}`);
    showToast({
      style: Toast.Style.Failure,
      title: TITLE_TOAST_ERROR,
      message: `Failed to play the sound: ${error.message}. Please check your sound settings and ensure the sound file exists at ${environment.assetsPath}/${SOUND_FILE_NAME}.`,
    });
  }
}

export function handleErrorReaction(error: Error | null) {
  if (error) {
    console.error(`Failed to trigger reaction: ${error.message}`);
    showToast({
      style: Toast.Style.Failure,
      title: TITLE_REACTION_ERROR,
      message: `Failed to trigger the reaction: ${error.message}. Please ensure the Control Center is accessible and the specified reaction exists.`,
    });
  }
}

// Preferences Interface
export interface Preferences {
  defaultReaction: string;
  showConfetti: boolean;
  playSound: boolean;
}

// Reaction Command Map
export const MAP_REACTION_COMMANDS: { [key: string]: string } = {
  "Hearts ❤️": "button 1 of group 1",
  "Thumbs Up 👍": "button 2 of group 1",
  "Thumbs Down 👎": "button 3 of group 1",
  "Balloons 🎈": "button 4 of group 1",
  "Rain 🌧️": "button 1 of group 2",
  "Confetti 🎉": "button 2 of group 2",
  "Lasers 🔆": "button 3 of group 2",
  "Fireworks 🎆": "button 4 of group 2",
};

//
export function showConfetti(preferences: Preferences, toastShow: boolean): void {
  open(COMMAND_LAUNCH_CONFFETI);
  if (preferences.playSound) {
    exec(COMMAND_PLAY_SOUND, handleErrorSound);
    if (toastShow) {
      showToast({
        style: Toast.Style.Success,
        title: MESSAGE_SOUND_PLAYED,
      });
    }
  } else if (toastShow) {
    showToast({
      style: Toast.Style.Success,
      title: MESSAGE_SOUND_NOT_PLAYED,
    });
  }
}
