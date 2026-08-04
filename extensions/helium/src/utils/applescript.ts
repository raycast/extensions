import { runAppleScript } from "@raycast/utils";
import { parseHeliumTabs, type HeliumTabRef } from "./applescript-parser";

/**
 * This function escapes tab url
 */
function escapeForAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * An entry returned by {@link listHeliumTabs}, mapping a tab's stable Helium
 * AppleScript `id` (per the app's scripting dictionary) to its current URL and
 * title. The traversal order matches AppleScript's `windows` × `tabs` order.
 */
/**
 * Enumerate every open tab in Helium and return its AppleScript `id` along
 * with its URL and title. Helium's scripting dictionary exposes
 * `tab > property id` as a unique, stable-per-session string (see `sdef
 * /Applications/Helium.app`), so we can use it as a durable handle for
 * subsequent switch/close operations instead of matching by URL (which breaks
 * on duplicates).
 *
 * Output is separated with ASCII record/field separators so tabs with odd
 * titles cannot break parsing. Reads are batched per property list to avoid
 * one AppleEvent per tab property at 20-50+ tabs.
 */
export async function listHeliumTabs(): Promise<HeliumTabRef[]> {
  const script = `
    set fieldSep to character id 31
    set recordSep to character id 30
    tell application "Helium"
      if not running then return ""
      set output to {}
      repeat with w in windows
        try
          set tabIds to id of tabs of w
          set tabUrls to URL of tabs of w
          set tabTitles to title of tabs of w
          repeat with i from 1 to count of tabIds
            set end of output to (item i of tabIds as text) & fieldSep & (item i of tabUrls as text) & fieldSep & (item i of tabTitles as text)
          end repeat
        end try
      end repeat
      set AppleScript's text item delimiters to recordSep
      set s to output as text
      set AppleScript's text item delimiters to ""
      return s
    end tell
  `;

  const raw = await runAppleScript(script, { timeout: 5000 });
  return parseHeliumTabs(raw);
}

/**
 * Switch to a specific tab in Helium browser by its Helium AppleScript id.
 *
 * Uses the `select` AppleScript command on tabs, added upstream in
 * imputnet/helium-macos#126. `select` is space-aware: it raises the Helium
 * window on whichever macOS Space it currently lives on and focuses the tab.
 *
 * @param heliumId - The Helium AS tab id (obtained from {@link listHeliumTabs})
 * @returns true if tab was found and switched to, false otherwise
 */
export async function switchToHeliumTabById(heliumId: string): Promise<boolean> {
  const escapedId = escapeForAppleScript(heliumId);
  const script = `
    tell application "Helium"
      if not running then return "not_running"
      set foundTab to false
      repeat with w in windows
        repeat with t in tabs of w
          try
            if (id of t as text) is "${escapedId}" then
              select t
              set foundTab to true
              exit repeat
            end if
          end try
        end repeat
        if foundTab then exit repeat
      end repeat
      if foundTab then
        return "success"
      else
        return "not_found"
      end if
    end tell
  `;

  try {
    const result = await runAppleScript(script, { timeout: 5000 });
    return result.trim() === "success";
  } catch (error) {
    console.error("switchToHeliumTabById error:", error);
    return false;
  }
}

/**
 * Close a specific tab in Helium browser by its Helium AppleScript id.
 */
export async function closeHeliumTabById(heliumId: string): Promise<boolean> {
  const escapedId = escapeForAppleScript(heliumId);
  const script = `
    tell application "Helium"
      if not running then return "not_running"
      set foundTab to false
      repeat with w in windows
        repeat with t in tabs of w
          try
            if (id of t as text) is "${escapedId}" then
              close t
              set foundTab to true
              exit repeat
            end if
          end try
        end repeat
        if foundTab then exit repeat
      end repeat
      if foundTab then
        return "success"
      else
        return "not_found"
      end if
    end tell
  `;

  try {
    const result = await runAppleScript(script, { timeout: 5000 });
    return result.trim() === "success";
  } catch (error) {
    console.error("closeHeliumTabById error:", error);
    return false;
  }
}

/**
 * Switch to a specific tab in Helium browser by its URL.
 *
 * Uses the `select` AppleScript command on tabs, added upstream in
 * imputnet/helium-macos#126. Unlike `set active tab index` + `activate`,
 * `select` is space-aware: it will raise the Helium window on whichever
 * macOS Space it currently lives on and focus the matching tab.
 *
 * Prefer {@link switchToHeliumTabById} when you have a Helium tab id handy
 * (via {@link listHeliumTabs}); this URL-based path cannot disambiguate
 * between multiple tabs sharing the same URL.
 *
 * @param tabUrl - The URL of the tab to switch to
 * @returns true if tab was found and switched to, false otherwise
 */
export async function switchToHeliumTab(tabUrl: string): Promise<boolean> {
  try {
    const escapedUrl = escapeForAppleScript(tabUrl);
    return await switchToTab(escapedUrl);
  } catch (error) {
    console.error("AppleScript error:", error);
    return false;
  }
}

/**
 * Space-aware tab switching using the `select` command (helium-macos#126).
 */
export async function switchToTab(escapedUrl: string): Promise<boolean> {
  const script = `
        tell application "Helium"
            if not running then return "not_running"

            set foundTab to false
            repeat with w in windows
                repeat with t in tabs of w
                    try
                        if (URL of t as text) is "${escapedUrl}" then
                            select t
                            set foundTab to true
                            exit repeat
                        end if
                    end try
                end repeat
                if foundTab then exit repeat
            end repeat

            if foundTab then
                return "success"
            else
                return "not_found"
            end if
        end tell
    `;

  try {
    const result = await runAppleScript(script, { timeout: 5000 });
    return result.trim() === "success";
  } catch (error) {
    console.error("switchToHeliumTab error:", error);
    return false;
  }
}

/**
 * Close a specific tab in Helium browser by its URL
 * @param tabUrl - The URL of the tab to close
 * @returns true if tab was found and closed, false otherwise
 */
export async function closeHeliumTab(tabUrl: string): Promise<boolean> {
  try {
    // Escape quotes in URL for AppleScript
    const escapedUrl = tabUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const script = `
      tell application "Helium"
        if not running then
          return "not_running"
        end if

        set foundTab to false
        repeat with w in windows
          repeat with t in tabs of w
            if URL of t is "${escapedUrl}" then
              close t
              set foundTab to true
              exit repeat
            end if
          end repeat
          if foundTab then exit repeat
        end repeat

        if foundTab then
          return "success"
        else
          return "not_found"
        end if
      end tell
    `;

    const result = await runAppleScript(script);
    return result.trim() === "success";
  } catch (error) {
    console.error("AppleScript error closing tab:", error);
    throw error;
  }
}

/**
 * Create a new window in Helium browser
 */
export async function createNewWindow(): Promise<void> {
  const script = `
    tell application "Helium"
      make new window
      activate
    end tell
    return true
  `;

  await runAppleScript(script);
}

/**
 * Create a new incognito window in Helium browser
 */
export async function createNewIncognitoWindow(): Promise<void> {
  // Try AppleScript first with properties
  try {
    const script = `
      tell application "Helium"
        make new window with properties {mode:"incognito"}
        activate
      end tell
      return true
    `;

    await runAppleScript(script);
  } catch {
    // Fallback to command line if AppleScript doesn't support mode property
    const fallbackScript = `
      do shell script "open -na 'Helium' --args --incognito"
    `;

    await runAppleScript(fallbackScript);
  }
}

/**
 * Open a URL in Helium browser
 * @param url - The URL to open
 */
export async function openUrlInHelium(url: string): Promise<void> {
  const escapedUrl = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const script = `
    tell application "Helium"
      if not running then
        activate
        delay 1
      end if

      set winExists to false
      repeat with w in every window
        if index of w is 1 then
          set winExists to true
          exit repeat
        end if
      end repeat

      if not winExists then
        make new window
        activate
        try
          set URL of active tab of window 1 to "${escapedUrl}"
        on error
          tell window 1
            set newTab to make new tab with properties {URL:"${escapedUrl}"}
          end tell
        end try
      else
        activate

        tell window 1
          set newTab to make new tab with properties {URL:"${escapedUrl}"}
        end tell
      end if
    end tell
    return true
  `;

  await runAppleScript(script);
}
