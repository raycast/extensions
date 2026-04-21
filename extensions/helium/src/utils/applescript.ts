import { runAppleScript } from "@raycast/utils";
import { open, getPreferenceValues } from "@raycast/api";

/**
 * Switch to a specific tab in Helium browser by its URL
 *
 * WORKAROUND FOR SPACE SWITCHING:
 * External AppleScript cannot reliably force macOS Space switching. The only method that
 * consistently works is Raycast's open() API with the bundle ID. We exploit this by:
 * 1. Opening a temporary new tab (forces Space switch via Raycast's open() API)
 * 2. Polling until the temp tab is ready (checking its URL)
 * 3. Closing that temporary tab
 * 4. Switching to the actual target tab
 *
 * This avoids race conditions by actively polling rather than using arbitrary delays.
 * Arc doesn't need this workaround because their 'select' command handles Space switching
 * internally in their application code.
 *
 * @param tabUrl - The URL of the tab to switch to
 * @returns true if tab was found and switched to, false otherwise
 */
export async function switchToHeliumTab(tabUrl: string): Promise<boolean> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const escapedUrl = tabUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    // Check if experimental Space switching is enabled
    if (preferences.enableSpaceSwitching) {
      // EXPERIMENTAL WORKAROUND: Open-then-close method to force Space switching
      return await switchToHeliumTabWithSpaceSwitching(escapedUrl);
    } else {
      // DEFAULT: Simple tab switching (only works within current Space)
      return await switchToHeliumTabSimple(escapedUrl);
    }
  } catch (error) {
    console.error("AppleScript error:", error);
    return false;
  }
}

/**
 * Simple tab switching without Space switching workaround (default behavior)
 */
async function switchToHeliumTabSimple(escapedUrl: string): Promise<boolean> {
  const script = `
    tell application "Helium"
      if not running then
        return "not_running"
      end if

      set foundTab to false
      repeat with w in windows
        set tabIndex to 1
        repeat with t in tabs of w
          if URL of t is "${escapedUrl}" then
            set active tab index of w to tabIndex
            activate
            set foundTab to true
            exit repeat
          end if
          set tabIndex to tabIndex + 1
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
}

/**
 * Experimental tab switching with Space switching workaround
 * Opens a temporary tab to force Space switch, then closes it and switches to target
 */
async function switchToHeliumTabWithSpaceSwitching(escapedUrl: string): Promise<boolean> {
  // STEP 1: Verify the target tab exists
  const findScript = `
    tell application "Helium"
      if not running then
        return "not_running"
      end if

      set foundTab to false
      repeat with w in windows
        repeat with t in tabs of w
          if URL of t is "${escapedUrl}" then
            set foundTab to true
            exit repeat
          end if
        end repeat
        if foundTab then exit repeat
      end repeat

      if foundTab then
        return "found"
      else
        return "not_found"
      end if
    end tell
  `;

  const findResult = await runAppleScript(findScript);
  if (findResult.trim() === "not_running" || findResult.trim() === "not_found") {
    return false;
  }

  // STEP 2: Open temporary new tab using Raycast's open() API
  // This is THE ONLY reliable way to force macOS to switch Spaces to Helium
  await open("chrome://new-tab-page/", "net.imput.helium");

  // STEP 3: Wait for temp tab, close it, and switch to target - all in AppleScript
  // AppleScript is synchronous and will wait for operations to complete naturally
  const switchScript = `
    tell application "Helium"
      -- Wait for the new tab to appear (polling with timeout)
      set maxAttempts to 20
      set attemptCount to 0
      set tempTabReady to false

      repeat while attemptCount < maxAttempts
        try
          -- Check if window 1 exists and has an active tab with chrome://new-tab-page
          if (count of windows) > 0 then
            set activeTabURL to URL of active tab of window 1
            if activeTabURL contains "chrome://new-tab-page" then
              set tempTabReady to true
              exit repeat
            end if
          end if
        end try
        set attemptCount to attemptCount + 1
      end repeat

      -- Close the temporary tab if we found it
      if tempTabReady then
        try
          close active tab of window 1
        end try
      end if

      -- Find and switch to the target tab
      set foundTab to false
      repeat with w in windows
        set tabIndex to 1
        repeat with t in tabs of w
          if URL of t is "${escapedUrl}" then
            set active tab index of w to tabIndex
            set foundTab to true
            exit repeat
          end if
          set tabIndex to tabIndex + 1
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

  const result = await runAppleScript(switchScript);
  return result.trim() === "success";
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
