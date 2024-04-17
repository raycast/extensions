import { runAppleScript } from "@raycast/utils";

export const openFileCallback = async (page: number) => {
  const script = `
    delay 1
    tell application "System Events"
        keystroke "g" using {option down, command down}
        keystroke "${page + 1}"
        keystroke return
    end tell
    `;

  await runAppleScript(script);
};
