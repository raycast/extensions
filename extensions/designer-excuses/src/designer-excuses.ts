import { showHUD, Clipboard } from "@raycast/api";
import excuses from "./excuses"; // Adjust the path if necessary
import { exec } from "child_process"; // Use import instead of require

// Main function to execute when the command is run
export default async function main() {
  const randomExcuse: string = getRandomElement(excuses);
  await Clipboard.copy(randomExcuse); // Copy to clipboard
  await showHUD(`✅ Pasted excuse: ${randomExcuse}`); // Show HUD notification

  // Use AppleScript to paste into the current application
  await pasteWithAppleScript();
}

// Function to get a random element from an array
const getRandomElement = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)];

// Function to paste using AppleScript
async function pasteWithAppleScript() {
  const script = `
    tell application "System Events"
      keystroke "v" using command down
    end tell
  `;

  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script}'`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(true);
      }
    });
  });
}
