import { runAppleScript } from "@raycast/utils";

export async function getRaycastIsOpen() {
  const script = `
tell application "System Events"
    tell process "Raycast"
        set b to position of back window  
    end tell
end tell`;
  try {
    await runAppleScript(script);
    return true;
  } catch (e) {
    return false;
  }
}
