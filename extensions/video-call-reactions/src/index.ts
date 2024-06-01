// index.ts
import { environment, showToast, Toast, getPreferenceValues, closeMainWindow, open } from "@raycast/api";
import { executeReaction } from "./executeReaction";
import { exec } from "child_process";

// Add the sound file path and command to play it
const sound = "mixkit-happy-crowd-cheer-975.wav";
const playSoundCommand = `afplay "${environment.assetsPath + "/" + sound}"`;

interface Preferences {
  defaultReaction: string;
  showConfetti: boolean;
  playSound: boolean; // Add this to your Preferences interface
}

// Mapping from string values with emojis to AppleScript commands
const reactionCommandMap: { [key: string]: string } = {
  "Hearts ❤️": "button 1 of group 1",
  "Thumbs Up 👍": "button 2 of group 1",
  "Thumbs Down 👎": "button 3 of group 1",
  "Balloons 🎈": "button 4 of group 1",
  "Rain 🌧️": "button 1 of group 2",
  "Confetti 🎉": "button 2 of group 2",
  "Lasers 🔆": "button 3 of group 2",
  "Fireworks 🎆": "button 4 of group 2",
};

export default async function main() {
  await closeMainWindow();
  const preferences = getPreferenceValues<Preferences>();
  const reactionCommand = reactionCommandMap[preferences.defaultReaction];

  if (reactionCommand) {
    await executeReaction(reactionCommand, preferences.defaultReaction);
    if (preferences.showConfetti && preferences.defaultReaction === "Confetti 🎉") {
      open("raycast://confetti");
      // Check if playSound preference is true and play the sound
      if (preferences.playSound) {
        exec(playSoundCommand, (error, stderr) => {
          if (error || stderr) {
            const message = error ? error.message : "Unknown error";
            console.error(`Failed to play sound: ${message}`);
            showToast(Toast.Style.Failure, "Sound Error", "Failed to play the sound.");
          }
        });
      }
    }
  } else {
    await showToast(Toast.Style.Failure, "Error", "Selected reaction not found.");
  }
}
