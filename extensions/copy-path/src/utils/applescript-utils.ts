import { runAppleScript } from "@raycast/utils";
import * as os from "node:os";
import { Application, Clipboard } from "@raycast/api";

const APPLESCRIPT_TIMEOUT_MS = 5000;
const VSCODE_SENTINEL_CLIPBOARD = "__raycast_copy_path_no_active_file__";
const NOTION_SENTINEL_CLIPBOARD = "__raycast_copy_path_no_notion_link__";
const NOTION_COPY_LINK_WAIT_MS = 400;
const NOTION_COPY_SELECTION_WAIT_MS = 600;
const NOTION_CLIPBOARD_POLL_MS = 50;

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
  set hasUnifiedSelection to false
  set currentSelection to {}

  -- Newer QSpace versions choose the front window or active desktop for us.
  -- An empty selection is meaningful: do not pick up a stale desktop selection.
  try
    set currentSelection to get selection
    set hasUnifiedSelection to true
  end try

  if hasUnifiedSelection then
    repeat with itemRef in currentSelection
      set end of urlList to urlstr of itemRef
    end repeat
  else
    -- Retain compatibility with versions that only expose selected items.
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
// A Document Picture-in-Picture window, such as Google Meet's floating mini-window,
// stays above the other windows, so it is the "front window" while the user works in
// another one. Its URL is always about:blank and, unlike a normal browser window, it
// cannot be minimized. When the front window is one of these, use the first window
// behind it that is not. A normal window showing about:blank is left alone. The check
// is wrapped in try so browsers without a minimizable property keep the front URL.
export const scriptChromiumBrowserPath = (app: string) => `
tell application "${app}"
    set currentURL to URL of active tab of front window
    try
        if currentURL is "about:blank" and minimizable of front window is false then
            repeat with browserWindow in windows
                set windowURL to URL of active tab of browserWindow
                if windowURL is not "about:blank" or minimizable of browserWindow is true then
                    set currentURL to windowURL
                    exit repeat
                end if
            end repeat
        end if
    end try
end tell
return currentURL`;

// More than one instance of a Chromium browser can be running. Automation tools such
// as Playwright, Puppeteer and Selenium start their own instance of the installed
// browser, often a headless one, next to the one the user works in. "tell application"
// reaches whichever instance the system picks, so the script above can return the URL
// of a hidden automation page, or fail because that instance has no windows, while the
// user's own browser is frontmost.
// When the frontmost app has more than one running instance, ask the frontmost
// instance itself. Scripting Bridge can address an app by process ID, which "tell
// application" cannot, and JXA's Application(pid) did not reach the instance with that
// ID in testing. Scripting Bridge reads properties by the four-character codes of the
// Chromium scripting dictionary. Only an app whose dictionary defines "active tab" is
// asked, so no other app is sent an Apple event. The script returns "" whenever it does
// not apply, and the caller then uses the script above. The Picture-in-Picture rule is
// the same as above.
export const scriptChromiumFrontInstancePath = (bundleId: string) => `
ObjC.import("AppKit");
ObjC.import("ScriptingBridge");
function code(name) {
  let value = 0;
  for (const char of name) value = value * 256 + char.charCodeAt(0);
  return value;
}
const WINDOW_CLASS = code("cwin");
const ACTIVE_TAB = code("acTa");
const TAB_URL = code("URL ");
const MINIMIZABLE = code("ismn");
function definesActiveTab(app) {
  const bundle = $.NSBundle.bundleWithURL(app.bundleURL);
  const sdef = ObjC.unwrap(bundle.objectForInfoDictionaryKey("OSAScriptingDefinition"));
  if (!sdef) return false;
  const path = bundle.resourcePath.stringByAppendingPathComponent(sdef);
  const dictionary = ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null));
  return !!dictionary && dictionary.includes('code="acTa"');
}
function urlOf(browserWindow) {
  return ObjC.unwrap(browserWindow.propertyWithCode(ACTIVE_TAB).propertyWithCode(TAB_URL).get) || "";
}
function isPictureInPicture(browserWindow, url) {
  return url === "about:blank" && ObjC.unwrap(browserWindow.propertyWithCode(MINIMIZABLE).get) === false;
}
let currentURL = "";
const bundleId = ${JSON.stringify(bundleId)};
const frontmost = $.NSWorkspace.sharedWorkspace.frontmostApplication;
const instances = $.NSRunningApplication.runningApplicationsWithBundleIdentifier(bundleId);
if (instances.count > 1 && ObjC.unwrap(frontmost.bundleIdentifier) === bundleId && definesActiveTab(frontmost)) {
  const browser = $.SBApplication.applicationWithProcessIdentifier(frontmost.processIdentifier);
  const windows = browser.elementArrayWithCode(WINDOW_CLASS);
  const count = windows.count;
  if (count > 0) {
    currentURL = urlOf(windows.objectAtIndex(0));
    if (isPictureInPicture(windows.objectAtIndex(0), currentURL)) {
      for (let i = 1; i < count; i++) {
        const windowURL = urlOf(windows.objectAtIndex(i));
        if (!isPictureInPicture(windows.objectAtIndex(i), windowURL)) {
          currentURL = windowURL;
          break;
        }
      }
    }
  }
}
currentURL;
`;

export const getChromiumFrontInstancePath = async (app: Application) => {
  if (!app.bundleId) {
    return "";
  }
  try {
    const url = await runAppleScript(scriptChromiumFrontInstancePath(app.bundleId), {
      language: "JavaScript",
      timeout: APPLESCRIPT_TIMEOUT_MS,
    });
    return url.trim();
  } catch (e) {
    return "";
  }
};

export const getChromiumBrowserPath = async (app: Application) => {
  const frontInstanceUrl = await getChromiumFrontInstancePath(app);
  if (frontInstanceUrl !== "") {
    return frontInstanceUrl;
  }
  try {
    return await runAppleScript(scriptChromiumBrowserPath(app.name), { timeout: APPLESCRIPT_TIMEOUT_MS });
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

// Arc popup views: "Little Arc" windows and "Peek" previews.
// Arc's scripting dictionary only knows about full tabs, so
// "URL of active tab of front window" returns the underlying tab (or fails)
// while a Little Arc window or a Peek preview is what the user is looking at.
// Both are plain Chromium web areas in the accessibility tree, so read the
// AXURL of the focused web area through the accessibility C API
// (System Events cannot coerce Chromium's AXURL value).
export const scriptArcFocusedPageUrl = `
ObjC.import("Cocoa");
ObjC.import("ApplicationServices");
ObjC.bindFunction("AXUIElementCreateApplication", ["id", ["int"]]);
ObjC.bindFunction("AXUIElementCopyAttributeValue", ["int", ["id", "id", "id*"]]);
function attr(el, name) {
  if (!el) return null;
  const ref = Ref();
  const err = $.AXUIElementCopyAttributeValue(el, $(name), ref);
  return err === 0 ? ref[0] : null;
}
function str(v) {
  if (!v) return null;
  try {
    return ObjC.unwrap(v.isKindOfClass($.NSURL) ? v.absoluteString : v);
  } catch (e) {
    return null;
  }
}
function isWebArea(el) {
  return str(attr(el, "AXRole")) === "AXWebArea";
}
function collectWebAreas(el, depth, acc) {
  if (!el || depth > 10 || acc.visited > 4000) return;
  acc.visited++;
  if (isWebArea(el)) {
    acc.areas.push(el);
    return;
  }
  const kids = attr(el, "AXChildren");
  if (!kids) return;
  const n = kids.count;
  for (let i = 0; i < n; i++) collectWebAreas(kids.objectAtIndex(i), depth + 1, acc);
}
function urlOf(el) {
  const u = str(attr(el, "AXURL"));
  return u && u.indexOf("http") === 0 ? u : "";
}
const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier("company.thebrowser.Browser");
let result = "";
if (apps.count > 0) {
  const app = $.AXUIElementCreateApplication(apps.objectAtIndex(0).processIdentifier);
  // 1. the focused element, or its nearest enclosing web area
  let el = attr(app, "AXFocusedUIElement");
  for (let i = 0; el && i < 30 && !isWebArea(el); i++) el = attr(el, "AXParent");
  if (el) result = urlOf(el);
  // 2. otherwise the focused web area of the focused window; a lone web area also counts
  if (!result) {
    const win = attr(app, "AXFocusedWindow") || attr(app, "AXMainWindow");
    const acc = { visited: 0, areas: [] };
    collectWebAreas(win, 0, acc);
    const focused = acc.areas.filter(function (a) { return str(attr(a, "AXFocused")) === true || str(attr(a, "AXFocused")) === 1; });
    if (focused.length === 1) result = urlOf(focused[0]);
    else if (acc.areas.length === 1) result = urlOf(acc.areas[0]);
  }
}
result;
`;

export const getArcFocusedPageUrl = async () => {
  try {
    const url = await runAppleScript(scriptArcFocusedPageUrl, {
      language: "JavaScript",
      timeout: APPLESCRIPT_TIMEOUT_MS,
    });
    return url.trim().startsWith("http") ? url.trim() : "";
  } catch (e) {
    return "";
  }
};

// Notion desktop app.
// Notion is not scriptable and does not expose the page URL through the
// accessibility tree, but its Edit menu has "Copy Link to Current Page" (⌘L).
// Press that menu item and read the link from the clipboard. Menu items are
// found by their shortcut rather than their title so this works in every
// display language, and pressing a menu item (instead of sending the shortcut)
// is not affected by modifier keys still held down from the Raycast hotkey.
export const scriptNotionPressMenuItem = (bundleId: string, shortcutKey: string) => `
tell application "System Events"
  tell (first application process whose bundle identifier is "${bundleId}")
    repeat with menuBarItem in menu bar items of menu bar 1
      try
        click (first menu item of menu 1 of menuBarItem whose (value of attribute "AXMenuItemCmdChar" is "${shortcutKey}") and (value of attribute "AXMenuItemCmdModifiers" is 0))
        return true
      end try
    end repeat
  end tell
end tell
return false
`;

export const scriptNotionDismissPopover = `
tell application "System Events" to key code 53
`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pressNotionMenuItem = async (bundleId: string, shortcutKey: string) => {
  const pressed = await runAppleScript(scriptNotionPressMenuItem(bundleId, shortcutKey), {
    timeout: APPLESCRIPT_TIMEOUT_MS,
  });
  return pressed.trim() === "true";
};

// Resolves with the new clipboard text, or null when the clipboard did not change in time.
const waitForNotionClipboard = async (timeoutMs: number) => {
  for (let waited = 0; waited <= timeoutMs; waited += NOTION_CLIPBOARD_POLL_MS) {
    const text = ((await Clipboard.readText()) ?? "").trim();
    if (text !== NOTION_SENTINEL_CLIPBOARD) {
      return text;
    }
    await sleep(NOTION_CLIPBOARD_POLL_MS);
  }
  return null;
};

export const getNotionPageUrl = async (app: Application) => {
  if (!app.bundleId) {
    return "";
  }

  const previousClipboard = await Clipboard.read();
  let url = "";
  try {
    await Clipboard.copy(NOTION_SENTINEL_CLIPBOARD, { concealed: true });
    if (await pressNotionMenuItem(app.bundleId, "L")) {
      let copied = await waitForNotionClipboard(NOTION_COPY_LINK_WAIT_MS);
      if (copied === null) {
        // Notion can only write to the clipboard while the page itself has keyboard
        // focus, which it loses until the page is clicked (for example after switching
        // to Notion or opening a link in it). In that case Notion shows a "Right click
        // and copy the link above" popover with the link selected, and its Edit > Copy
        // menu item (⌘C) copies that selection without needing focus.
        if (await pressNotionMenuItem(app.bundleId, "C")) {
          copied = await waitForNotionClipboard(NOTION_COPY_SELECTION_WAIT_MS);
          if (copied?.startsWith("http")) {
            await runAppleScript(scriptNotionDismissPopover, { timeout: APPLESCRIPT_TIMEOUT_MS });
          }
        }
      }
      url = copied?.startsWith("http") ? copied : "";
    }
  } catch (e) {
    url = "";
  } finally {
    if (url === "") {
      await restoreClipboard(previousClipboard);
    }
  }

  return url;
};
