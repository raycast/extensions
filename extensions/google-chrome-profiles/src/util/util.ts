import { URL } from "url";
import { runAppleScript } from "@raycast/utils";

export type ChromeTarget = { action: "focus" } | { action: "newTab" } | { action: "openUrl"; url: string };

export const ChromeAction = {
  Focus: { action: "focus" } as ChromeTarget,
  NewTab: { action: "newTab" } as ChromeTarget,
  openUrl: (url: string): ChromeTarget => ({ action: "openUrl", url }),
};

export const createBookmarkListItem = (url: string, name?: string) => {
  const urlOrigin = new URL(url).origin;
  const urlToDisplay = url.replace(/(^\w+:|^)\/\//, "");
  return {
    url: url,
    title: name ? name : urlToDisplay,
    subtitle: name ? urlToDisplay : undefined,
    iconURL: urlOrigin,
  };
};

/**
 * Naive implementation. This can certainly be improved.
 */
export const matchSearchText = (searchText: string, url: string, name?: string) => {
  const searchWords = searchText
    .split(" ")
    .flatMap((e) => e.split("/"))
    .flatMap((e) => e.split("."))
    .filter((e) => e)
    .map(lowerCased);

  const nameWords =
    name
      ?.split(" ")
      .map(lowerCased)
      .filter((e) => e) ?? [];

  if (hasMatch(searchWords, nameWords)) {
    return true;
  }

  const urlWords = url
    .replace("https://", "")
    .replace("http://", "")
    .split("/")
    .flatMap((e) => e.split("."))
    .filter((e) => e)
    .map(lowerCased);

  if (hasMatch(searchWords, urlWords)) {
    return true;
  }

  return false;
};

const lowerCased = (text: string) => text.toLowerCase();

const hasMatch = (search: string[], words: string[]) => {
  for (const element of search) {
    for (const word of words) {
      if (word.includes(element)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Determines whether a string is a valid, launchable URL for a Chrome profile launcher.
 *
 * This validator is intentionally *opinionated* and aligned with how Chrome users
 * expect URLs to behave, rather than with generic RFC or WHATWG URL validity.
 *
 * The function:
 * - Accepts only explicit, absolute URLs (no implicit scheme repair).
 * - Allows Chrome-navigable schemes that users commonly open in a tab.
 * - Explicitly blocks execution-oriented schemes (bookmarklets).
 *
 * ✅ Allowed schemes:
 *   - http://
 *   - https://
 *   - chrome://
 *   - chrome-extension://
 *   - about:
 *   - view-source:
 *
 * 🚫 Explicitly rejected schemes:
 *   - javascript:
 *   - data:
 *   - vbscript:
 *
 * ❌ Rejected inputs include:
 *   - URLs requiring parser repair (e.g. "http:/example.com", "http:example.com")
 *   - Relative paths ("/settings", "../index.html")
 *   - Bare hostnames ("example.com")
 *   - Bookmarklets or executable payloads
 *
 * The function does NOT:
 * - Check reachability or network availability
 * - Validate host existence or DNS
 * - Guarantee that Chrome will successfully open the URL (some chrome:// pages are restricted)
 *
 * This behavior is intentional and optimized for safe, predictable profile launching.
 */
export function isValidUrl(str: string): boolean {
  if (typeof str !== "string") return false;

  const trimmed = str.trim();

  // Explicit deny list (execution vectors)
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return false;
  }

  try {
    const url = new URL(trimmed);

    // Allowlist of schemes Chrome users expect
    switch (url.protocol) {
      case "http:":
      case "https:":
      case "chrome:":
      case "chrome-extension:":
      case "about:":
        return true;

      case "view-source:":
        // view-source: can wrap another URL; require something after it
        return trimmed.length > "view-source:".length;

      default:
        return false;
    }
  } catch {
    return false;
  }
}

export const formatAsUrl = (str: string) => {
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  } else {
    return `https://${str}`;
  }
};

/**
 * Escapes a string for safe use in AppleScript string literals.
 * Prevents injection attacks by escaping special characters.
 *
 * @param str The string to escape
 * @returns A safely escaped string for AppleScript interpolation
 */
export const escapeAppleScriptString = (str: string): string => {
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first (must be first!)
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\t/g, "\\t"); // Escape tabs
};

/**
 * Run the script that opens Google Chrome.
 *
 * - `ChromeAction.Focus`: focuses the existing profile window (or opens it if not open)
 * - `ChromeAction.NewTab`: focuses the profile window, then opens a new blank tab
 * - `ChromeAction.openUrl(url)`: focuses the profile window, then opens the URL in a new tab
 *
 * @param profile The Chrome profile to open
 * @param target The action to perform
 * @param willOpen Function to run before opening Google Chrome
 */
export const openGoogleChrome = async (
  profile: { name: string; directory: string },
  target: ChromeTarget,
  willOpen: () => Promise<void>,
) => {
  const action = target.action;
  const url = action === "openUrl" ? target.url : undefined;

  // Escape all user-controlled input to prevent AppleScript injection
  const escapedProfileName = escapeAppleScriptString(profile.name);
  const escapedUrl = url ? escapeAppleScriptString(url) : undefined;

  // Use menu bar item 8 for Profiles menu (language-independent position)
  // Chrome menu bar: 1=Apple, 2=Chrome, 3=File, 4=Edit, 5=View, 6=History, 7=Bookmarks, 8=Profiles, 9=Tab, 10=Window, 11=Help
  const script = `
    tell application "Google Chrome" to activate
    tell application "System Events"
      tell process "Google Chrome"
        -- Focus the profile window via Profiles menu (menu bar item 8, language-independent)
        set profileMenu to menu 1 of menu bar item 8 of menu bar 1
        set menuItems to name of menu items of profileMenu

        if "${escapedProfileName}" is in menuItems then
          click menu item "${escapedProfileName}" of profileMenu
        else
          set foundMatch to false
          repeat with menuItemName in menuItems
            if menuItemName is not missing value then
              if menuItemName contains "${escapedProfileName}" then
                click menu item menuItemName of profileMenu
                set foundMatch to true
                exit repeat
              end if
            end if
          end repeat

          if foundMatch is false then
            error "Profile not found in menu"
          end if
        end if
      end tell
    end tell

    delay 0.3

    ${
      action === "newTab"
        ? `
    tell application "Google Chrome"
      set currentURL to URL of active tab of front window
      -- Check if current tab is already a new tab
      if currentURL is not "chrome://newtab/" then
        make new tab at end of tabs of front window
      end if
    end tell
    `
        : ""
    }

    ${
      escapedUrl
        ? `
    tell application "Google Chrome"
      set targetURL to "${escapedUrl}"
      set tabCount to count of tabs of front window
      set foundTab to false
      repeat with t from 1 to tabCount
        if URL of tab t of front window is targetURL then
          set active tab index of front window to t
          set foundTab to true
          exit repeat
        end if
      end repeat

      if foundTab is false then
        open location targetURL
      end if
    end tell
    `
        : ""
    }
  `;

  try {
    await willOpen();
    await runAppleScript(script);
    return;
  } catch (error) {
    // If the Profiles menu approach fails, fall back to the shell script method
    console.error("Profiles menu approach failed, falling back to shell script:", error);
  }

  // Fallback: use shell script to open Chrome with profile directory
  const fallbackUrl = action === "focus" ? "about:blank" : url || "about:blank";
  const escapedProfileDirectory = escapeAppleScriptString(profile.directory);
  const escapedFallbackUrl = escapeAppleScriptString(fallbackUrl);
  const fallbackScript = `
    set theAppPath to quoted form of "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    set theProfile to quoted form of "${escapedProfileDirectory}"
    set theLink to quoted form of "${escapedFallbackUrl}"
    do shell script theAppPath & " --profile-directory=" & theProfile & " " & theLink
  `;

  try {
    await willOpen();
    await runAppleScript(fallbackScript);
  } catch (error) {
    // Handle errors silently
  }
};
