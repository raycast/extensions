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
 * Get current tab URL for browsers built by The Browser Company (Arc, Dia).
 *
 * Their scripting dictionaries reject the flat `active tab of front window`
 * form that the default script uses (`-1700` coercion error) and require the
 * nested `tell front window` form instead.
 *
 * @returns Google Meet url i.e `https://meet.google.com/pen-adzt-swz`
 */
export function getOpenedUrlForBrowserCompany(browserName: "Arc" | "Dia") {
  return `
    tell application "${browserName}"
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

export function getSwitchToPreviousAppScript(): string {
  return `
    tell application "System Events"
      keystroke tab using {command down}
    end tell
  `;
}

export const supportedBrowsers = [
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
  "Zen",
  "Dia",
] as const;

// Identify which browser the meet link landed in by asking System Events for
// the frontmost application. The previous `lsappinfo metainfo | grep | head -1`
// approach returned the first supported-browser name found anywhere in the
// metadata dump — including background Chrome helper processes and Electron
// apps whose bundle paths contain "Google Chrome Framework" — which
// misidentified the actual frontmost browser on machines running any
// Chromium-based browser that wasn't the default.
export const getOpenedBrowserScript = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
    end tell
    return frontApp
`;

export type SupportedBrowsers = (typeof supportedBrowsers)[number];
