import { runAppleScript } from "@raycast/utils";
import * as os from "node:os";
import { Application, Clipboard } from "@raycast/api";

const APPLESCRIPT_TIMEOUT_MS = 5000;
const VSCODE_SENTINEL_CLIPBOARD = "__raycast_copy_path_no_active_file__";

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
    return await runAppleScript(scriptFinderPath, { timeout: APPLESCRIPT_TIMEOUT_MS });
  } catch (e) {
    return os.homedir();
  }
};

export const scriptQSpacePath = `
tell application id "com.jinghaoshe.qspace.pro"
  set urlList to {}

  try
    repeat with itemRef in selected items
      set end of urlList to urlstr of itemRef
    end repeat
  end try

  if (count of urlList) = 0 then
    try
      repeat with desktopRef in qs desktops
        repeat with itemRef in selected items of desktopRef
          set end of urlList to urlstr of itemRef
        end repeat
      end repeat
    end try
  end if

  if (count of urlList) = 0 then
    try
      set end of urlList to urlstr of root item
    end try
  end if

  set AppleScript's text item delimiters to linefeed
  return urlList as text
end tell
`;

export const getQSpacePathUrls = async () => {
  try {
    return await runAppleScript(scriptQSpacePath, { timeout: APPLESCRIPT_TIMEOUT_MS });
  } catch (e) {
    return "";
  }
};

export const scriptWindowPath = (app: Application) => `
set windowPath to ""
tell application "System Events"
	tell process "${app.name}"
		tell (1st window whose value of attribute "AXMain" is true)
			try
				set windowPath to value of attribute "AXDocument"
			on error
				set windowPath to ""
			end try
		end tell
	end tell
end tell
return windowPath
`;

export const getFocusWindowPath = async (app: Application) => {
  try {
    let path = await runAppleScript(scriptWindowPath(app), { timeout: APPLESCRIPT_TIMEOUT_MS });
    if (path == "missing value" || path == "") {
      return "";
    }
    if (!path.startsWith("file://") && !path.startsWith("/")) {
      return "";
    }
    if (path.startsWith("file://")) {
      path = path.replace("file://", "");
    }
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  } catch (e) {
    return "";
  }
};

export const scriptVSCodeActiveFilePath = (app: Application) => `
try
  tell application id "${app.bundleId}" to activate
  delay 0.1
  tell application "System Events"
    tell process "${app.name}"
      keystroke "c" using {option down, command down}
    end tell
  end tell
  delay 0.2
  return the clipboard
on error
  return ""
end try
`;

export const getVSCodeActiveFilePath = async (app: Application) => {
  if (!app.bundleId) {
    return "";
  }

  const previousClipboard = await Clipboard.read();
  let path = "";
  try {
    await Clipboard.copy(VSCODE_SENTINEL_CLIPBOARD);
    const clipboardPath = (
      await runAppleScript(scriptVSCodeActiveFilePath(app), { timeout: APPLESCRIPT_TIMEOUT_MS })
    ).trim();
    path = normalizeVSCodeFilePath(clipboardPath);
  } catch (e) {
    path = "";
  } finally {
    if (path === "") {
      await restoreClipboard(previousClipboard);
    }
  }

  return path;
};

const normalizeVSCodeFilePath = (path: string) => {
  try {
    if (path.startsWith("file://")) {
      return decodeURIComponent(new URL(path).pathname);
    }
  } catch {
    return "";
  }
  return path.startsWith("/") || path.startsWith("~") ? path : "";
};

const restoreClipboard = async (content: Clipboard.ReadContent) => {
  if (content.file) {
    await Clipboard.copy({ file: content.file });
  } else if (content.html) {
    await Clipboard.copy({ html: content.html, text: content.text });
  } else if (content.text) {
    await Clipboard.copy(content.text);
  } else {
    await Clipboard.clear();
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
    return await runAppleScript(scriptWindowTitle(app), { timeout: APPLESCRIPT_TIMEOUT_MS });
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
    return await runAppleScript(scriptWebkitBrowserPath(app), { timeout: APPLESCRIPT_TIMEOUT_MS });
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
    return await runAppleScript(scriptChromiumBrowserPath(app), { timeout: APPLESCRIPT_TIMEOUT_MS });
  } catch (e) {
    return "";
  }
};

// firefox browser
export const scriptFirefoxBrowserPath = (app: string) => `
tell application "${app}"
  activate
  tell application "System Events"
    delay 0.2
    key code 37 using command down
    delay 0.2
    key code 8 using command down
    delay 0.2
    key code 53
  end tell
  delay 0.3
  set activeTabURL to the clipboard
  return (activeTabURL)
end tell`;

export const copyFirefoxBrowserPath = async (app: string) => {
  try {
    return await runAppleScript(scriptFirefoxBrowserPath(app), { timeout: APPLESCRIPT_TIMEOUT_MS });
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
    return await runAppleScript(scriptSafariWebAppPath(app), { timeout: APPLESCRIPT_TIMEOUT_MS });
  } catch (e) {
    return "";
  }
};
