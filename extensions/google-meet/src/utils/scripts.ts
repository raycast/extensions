/**
 * Get all tabs urls based on the browser
 *
 * @param browserName selected browser name
 *
 * @returns all tabs urls
 */
export function getOpenedUrlsScript(browserName: SupportedBrowsers): string {
  return `
    set titleString to ""

    tell application "${browserName}"
      set window_list to every window

      repeat with the_window in window_list
        set tab_list to every tab in the_window
        repeat with the_tab in tab_list
          set the_url to the URL of the_tab
          set titleString to titleString & the_url & ","
        end repeat
      end repeat

      return titleString

    end tell
  `;
}

/**
 * To get the tab list and filter on Arc is not that acessible as the others,
 * this script uses the native way to copy a url via Arc's shortcut and it's easier to deal with
 * than creating an Applescript to iterate over the tabs/spaces
 *
 * @returns Google Meet url i.e `https://meet.google.com/pen-adzt-swz`
 */
export function getOpenedUrlForArc() {
  return `
    tell application "Arc"
      activate
      delay 1

      tell application "System Events"
        keystroke "c" using {command down, shift down}
        delay 1
        set copiedURL to the clipboard as text
      end tell

    end tell

    return copiedURL
  `;
}

/**
 * Firefox has little to no support to Applescript, this a very hacky solution, but it works
 * 1. Focus the browser
 * 2. Use the `cmd + l` to focus on the URL bar
 * 3. Use `cmd + c` to copy to the clipboard
 * 4. Press `Escape` key to closes the URL bar focus
 * 5. Returns the copied URL
 *
 * @param browserName `Firefox | Firefox Developer Edition`
 *
 * @returns Google Meet url i.e `https://meet.google.com/pen-adzt-swz`
 */
export function getOpenedUrlForFirefox(browserName: string) {
  return `
    tell application "${browserName}"
      activate
      delay 0.5
      
      tell application "System Events"
        keystroke "l" using {command down}
        delay 0.2
        keystroke "c" using {command down}
        delay 0.5
        key code 53
      end tell
    end tell
      
    delay 0.5
    
    set copiedURL to do shell script "pbpaste"
    
    return copiedURL
  `;
}

const supportedBrowsers = [
  "Arc",
  "Brave",
  "Firefox",
  "Firefox Developer Edition",
  "Google Chrome",
  "Microsoft Edge",
  "Mozilla Firefox",
  "Opera",
  "QQ",
  "Safari",
  "Sogou Explorer",
  "Vivaldi",
  "Yandex",
] as const;

// Easy way to access the focused window when the meet link opens
export const getOpenedBrowserScript = `
    set cmd to "lsappinfo metainfo | grep -E -o '${supportedBrowsers.join("|")}' | head -1"

    set frontmostBrowser to do shell script cmd

    return frontmostBrowser
`;

export type SupportedBrowsers = (typeof supportedBrowsers)[number];
