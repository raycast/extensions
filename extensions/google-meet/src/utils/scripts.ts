/**
 * Get current tab URL
 *
 * @param browserName selected browser name
 *
 * @returns Google Meet url i.e `https://meet.google.com/pen-adzt-swz`
 */
export function getOpenedUrlsScript(browserName: SupportedBrowsers): string {
  return `
    tell application "${browserName}"
      set currentTab to active tab of front window
      set tabURL to URL of currentTab
      return tabURL
    end tell
  `;
}

/**
 * Get current tab URL for Arc
 * @returns Google Meet url i.e `https://meet.google.com/pen-adzt-swz`
 */
export function getOpenedUrlForArc() {
  return `
    tell application "Arc"
      tell front window
        set activeTabURL to URL of active tab
        return activeTabURL
      end tell
    end tell
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
