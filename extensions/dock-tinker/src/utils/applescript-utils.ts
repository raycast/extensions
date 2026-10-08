import { runAppleScript } from "run-applescript";

export const toggleDockVisibilityScript = `tell application "System Events"
    tell dock preferences to set autohide to not autohide
end tell`;

export const toggleDockVisibility = async () => {
  try {
    await runAppleScript(toggleDockVisibilityScript);
  } catch (e) {
    console.error(String(e));
  }
};
