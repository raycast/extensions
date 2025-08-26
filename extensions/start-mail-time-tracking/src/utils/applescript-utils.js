import { runAppleScript } from "@raycast/utils";

export const scriptChromiumBrowserPath = (app) => `
  try
      tell application "${app}"
          set currentURL to URL of active tab of front window
      end tell
      return currentURL
  on error errMsg
      log "AppleScript error getting browser URL: " & errMsg
      return ""
  end try
`;

export const getChromiumBrowserPath = async (app) => {
  try {
    const result = await runAppleScript(scriptChromiumBrowserPath(app));
    console.log("AppleScript browser URL result:", result);
    return result;
  } catch (e) {
    console.error("Error running browser URL AppleScript:", String(e));
    console.error("AppleScript error details:", e.stack);
    return "";
  }
};

export const scriptRunShortcut = (shortcutName, input) => `
  tell application "Shortcuts Events" to run the shortcut named "${shortcutName}" with input "${input.replace(/"/g, '\\"')}"
`;

export const runAppleShortcut = async (shortcutName, input) => {
  try {
    const result = await runAppleScript(scriptRunShortcut(shortcutName, input));
    console.log("Shortcut execution result:", result);
    return result;
  } catch (e) {
    console.error("Error running shortcut:", String(e));
    throw e;
  }
};

export const scriptWindowTitle = (app) => `
  set windowTitle to ""
  try
      tell application "System Events"
          tell process "${app.name}"
              tell (1st window whose value of attribute "AXMain" is true)
                  set windowTitle to value of attribute "AXTitle"
              end tell
          end tell
      end tell
  on error errMsg
      log "AppleScript error getting window title: " & errMsg
      set windowTitle to ""
  end try

  return windowTitle
`;

export const getFocusWindowTitle = async (app) => {
  try {
    const result = await runAppleScript(scriptWindowTitle(app));
    console.log("AppleScript window title result:", result);
    return result;
  } catch (e) {
    console.error("Error running window title AppleScript:", String(e));
    return "";
  }
};
