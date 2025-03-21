import { runAppleScript } from "@raycast/utils";
import * as os from "node:os";
import { Application } from "@raycast/api";

export const scriptFinderPath = `
if application "Finder" is not running then
    return "Finder not running"
end if

tell application "Finder"
    return POSIX path of ((insertion location) as alias)
end tell
`;

// finder path, with / at the end
export const getFocusFinderPath = async () => {
  try {
    return await runAppleScript(scriptFinderPath);
  } catch (e) {
    return os.homedir();
  }
};

export const scriptWindowTitle = (app: Application) => `
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
    set windowTitle to ""
end try

return windowTitle
`;

export const getFocusWindowTitle = async (app: Application) => {
  try {
    return await runAppleScript(scriptWindowTitle(app));
  } catch (e) {
    return "";
  }
};

// webkit browser
export const scriptWebkitBrowserPath = (app: string) => `
tell application "${app}"
    set currentURL to URL of current tab of front window
end tell
return currentURL`;

export const getWebkitBrowserPath = async (app: string) => {
  try {
    return await runAppleScript(scriptWebkitBrowserPath(app));
  } catch (e) {
    return "";
  }
};

// chromium browser
export const scriptChromiumBrowserPath = (app: string) => `
tell application "${app}"
    set currentURL to URL of active tab of front window
end tell
return currentURL`;

export const getChromiumBrowserPath = async (app: string) => {
  try {
    return await runAppleScript(scriptChromiumBrowserPath(app));
  } catch (e) {
    return "";
  }
};

// firefox browser
export const scriptFirefoxBrowserPath = (app: string) => `
tell application "${app}"
  activate
  tell application "System Events"
    keystroke "l" using command down
    keystroke "c" using command down
    key code 53
  end tell
  delay 0.2
  set activeTabURL to the clipboard
  return (activeTabURL)
end tell`;

export const copyFirefoxBrowserPath = async (app: string) => {
  try {
    return await runAppleScript(scriptFirefoxBrowserPath(app));
  } catch (e) {
    return "";
  }
};

// safari web app browser
export const scriptSafariWebAppPath = (app: string) => `
tell application "${app}" to activate
tell application "System Events"
  tell process "${app}"
    keystroke "c" using {option down, command down}
  end tell
  delay 0.2
  set activeTabURL to the clipboard
  return (activeTabURL)
end tell`;

export const copySafariWebAppPath = async (app: string) => {
  try {
    return await runAppleScript(scriptSafariWebAppPath(app));
  } catch (e) {
    return "";
  }
};
