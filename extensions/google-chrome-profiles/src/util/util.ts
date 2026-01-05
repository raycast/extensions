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
    iconURL: `https://www.google.com/s2/favicons?domain=${urlOrigin}&sz=${32}`,
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
 * Uses `URL` API.
 * @param urlString
 * @returns `true` if the `URL` constructor succeeds to create the URL. Note that `raycast.com` returns `false` because the protocol ("http" / "https") is missing).
 */
export const isValidUrl = (urlString: string) => {
  try {
    new URL(urlString);
    return true;
  } catch (err) {
    return false;
  }
};

export const formatAsUrl = (str: string) => {
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  } else {
    return `https://${str}`;
  }
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

  // Use menu bar item 8 for Profiles menu (language-independent position)
  // Chrome menu bar: 1=Apple, 2=Chrome, 3=File, 4=Edit, 5=View, 6=History, 7=Bookmarks, 8=Profiles, 9=Tab, 10=Window, 11=Help
  const script = `
    tell application "Google Chrome" to activate
    tell application "System Events"
      tell process "Google Chrome"
        -- Focus the profile window via Profiles menu (menu bar item 8, language-independent)
        set profileMenu to menu 1 of menu bar item 8 of menu bar 1
        set menuItems to name of menu items of profileMenu

        if "${profile.name}" is in menuItems then
          click menu item "${profile.name}" of profileMenu
        else
          set foundMatch to false
          repeat with menuItemName in menuItems
            if menuItemName is not missing value then
              if menuItemName contains "${profile.name}" then
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
      url
        ? `
    tell application "Google Chrome"
      set targetURL to "${url}"
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
  const fallbackScript = `
    set theAppPath to quoted form of "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    set theProfile to quoted form of "${profile.directory}"
    set theLink to quoted form of "${fallbackUrl}"
    do shell script theAppPath & " --profile-directory=" & theProfile & " " & theLink
  `;

  try {
    await willOpen();
    await runAppleScript(fallbackScript);
  } catch (error) {
    // Handle errors silently
  }
};
