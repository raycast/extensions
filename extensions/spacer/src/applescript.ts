import { runAppleScript } from "@raycast/utils";

// Key codes for desktops 1-9
const desktopKeyCodes: Record<number, number> = {
  1: 18, // 1
  2: 19, // 2
  3: 20, // 3
  4: 21, // 4
  5: 23, // 5
  6: 22, // 6
  7: 26, // 7
  8: 28, // 8
  9: 25, // 9
};

export async function switchToSpace(index: number) {
  const keyCode = desktopKeyCodes[index];
  if (!keyCode) {
    throw new Error(`Desktop index ${index} is not supported (must be 1-9).`);
  }

  const script = `
    tell application "System Events"
        key code ${keyCode} using {control down}
    end tell
  `;
  await runAppleScript(script);
}
