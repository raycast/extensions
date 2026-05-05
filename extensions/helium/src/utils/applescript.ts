import { runAppleScript } from "@raycast/utils";

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
export interface HeliumTabRef {
  heliumId: string;
  url: string;
  title: string;
}

/**
 * Enumerate every open tab in Helium and return its AppleScript `id` along
 * with its URL and title. Helium's scripting dictionary exposes
 * `tab > property id` as a unique, stable-per-session string (see `sdef
 * /Applications/Helium.app`), so we can use it as a durable handle for
 * subsequent switch/close operations instead of matching by URL (which breaks
 * on duplicates).
 *
 * Output is one record per line in the form
 * `heliumId<TAB>url<TAB>title`. We build the separator outside the
 * `tell application "Helium"` block because inside that block the identifier
 * `tab` resolves to Helium's tab class rather than the ASCII tab constant,
 * which silently breaks the script.
 */
export async function listHeliumTabs(): Promise<HeliumTabRef[]> {
  const script = `
    set sep to character id 9
    tell application "Helium"
      if not running then return ""
      set output to {}
      repeat with w in windows
        repeat with t in tabs of w
          try
            set tId to id of t as text
            set tUrl to URL of t as text
            set tTitle to title of t as text
            set end of output to tId & sep & tUrl & sep & tTitle
          end try
        end repeat
      end repeat
      set AppleScript's text item delimiters to linefeed
      set s to output as text
      set AppleScript's text item delimiters to ""
      return s
    end tell
  `;

  const raw = await runAppleScript(script, { timeout: 5000 });
  if (!raw || raw.trim() === "") return [];
  return raw
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((parts) => parts.length >= 2)
    .map(([heliumId, url, title = ""]) => ({ heliumId, url, title }));
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
      else
        activate
      end if

      tell window 1
        set newTab to make new tab with properties {URL:"${escapedUrl}"}
      end tell
    end tell
    return true
  `;

  await runAppleScript(script);
}

/**
 * Get all bookmarks from Helium using AppleScript
 * @returns Array of bookmark data as strings in format "name|url|id|folder"
 */
export async function getHeliumBookmarks(): Promise<string[]> {
  const script = `
    tell application "Helium"
      set allBookmarks to {}

      -- Get bookmarks from bookmarks bar
      try
        tell bookmarks bar
          -- Direct bookmarks (no folder)
          repeat with bm in bookmark items
            try
              set bmName to name of bm
              set bmURL to URL of bm
              set bmId to id of bm
              set end of allBookmarks to (bmName & "|" & bmURL & "|" & bmId & "|")
            end try
          end repeat

          -- Bookmarks in folders
          try
            repeat with folder in bookmark folders
              set folderName to name of folder
              tell folder
                repeat with bm in bookmark items
                  try
                    set bmName to name of bm
                    set bmURL to URL of bm
                    set bmId to id of bm
                    set end of allBookmarks to (bmName & "|" & bmURL & "|" & bmId & "|" & folderName)
                  end try
                end repeat

                -- One more level deep for nested folders
                try
                  repeat with subFolder in bookmark folders
                    set subFolderName to name of subFolder
                    tell subFolder
                      repeat with bm in bookmark items
                        try
                          set bmName to name of bm
                          set bmURL to URL of bm
                          set bmId to id of bm
                          set end of allBookmarks to (bmName & "|" & bmURL & "|" & bmId & "|" & folderName & " > " & subFolderName)
                        end try
                      end repeat
                    end tell
                  end repeat
                end try
              end tell
            end repeat
          end try
        end tell
      end try

      -- Get bookmarks from other bookmarks
      try
        tell other bookmarks
          -- Direct bookmarks (no folder)
          repeat with bm in bookmark items
            try
              set bmName to name of bm
              set bmURL to URL of bm
              set bmId to id of bm
              set end of allBookmarks to (bmName & "|" & bmURL & "|" & bmId & "|")
            end try
          end repeat

          -- Bookmarks in folders
          try
            repeat with folder in bookmark folders
              set folderName to name of folder
              tell folder
                repeat with bm in bookmark items
                  try
                    set bmName to name of bm
                    set bmURL to URL of bm
                    set bmId to id of bm
                    set end of allBookmarks to (bmName & "|" & bmURL & "|" & bmId & "|" & folderName)
                  end try
                end repeat

                -- One more level deep for nested folders
                try
                  repeat with subFolder in bookmark folders
                    set subFolderName to name of subFolder
                    tell subFolder
                      repeat with bm in bookmark items
                        try
                          set bmName to name of bm
                          set bmURL to URL of bm
                          set bmId to id of bm
                          set end of allBookmarks to (bmName & "|" & bmURL & "|" & bmId & "|" & folderName & " > " & subFolderName)
                        end try
                      end repeat
                    end tell
                  end repeat
                end try
              end tell
            end repeat
          end try
        end tell
      end try

      -- Convert list to newline-delimited string to avoid issues with commas in bookmark data
      set AppleScript's text item delimiters to linefeed
      set bookmarkString to allBookmarks as text
      set AppleScript's text item delimiters to ""
      return bookmarkString
    end tell
  `;

  const result = await runAppleScript(script);

  // Parse the result - now newline-delimited instead of comma-separated
  if (!result || result.trim() === "") {
    return [];
  }

  // Split by newline - much more robust than comma-space
  const bookmarkStrings = result.split("\n").filter((s) => s.trim() !== "");
  return bookmarkStrings;
}
