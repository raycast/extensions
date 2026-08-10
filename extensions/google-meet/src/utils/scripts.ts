export const supportedBrowsers = [
  "Arc",
  // Brave installs as `Brave Browser.app`, so that is the name reported by both
  // `getDefaultApplication` and the frontmost-process lookup, and the one
  // AppleScript needs in `tell application`.
  "Brave Browser",
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

export type SupportedBrowsers = (typeof supportedBrowsers)[number];

/** Marks a window that couldn't be scripted for its active tab's URL (e.g. a Little Arc window). */
export const UNSCRIPTABLE_WINDOW_MARKER = "UNSCRIPTABLE_WINDOW";

/**
 * Both Safari and Chromium-family browsers expose `tabs of window` in their
 * AppleScript dictionaries, so every window and every tab can be enumerated
 * with one script shape instead of only reading the active tab of the front
 * window. Windows are returned frontmost-first; a window without tabs (rare,
 * but possible for utility/popup windows) is skipped rather than aborting
 * the whole script.
 */
export function getStandardTabsScript(appName: string): string {
  return `
    tell application "${appName}"
      set candidateList to {}
      repeat with w in windows
        try
          repeat with t in tabs of w
            try
              set end of candidateList to (URL of t)
            end try
          end repeat
        end try
      end repeat
      set AppleScript's text item delimiters to (ASCII character 31)
      set candidateString to candidateList as string
      set AppleScript's text item delimiters to ""
      return candidateString
    end tell
  `;
}

/**
 * Arc and Dia use a nested `tell window i` form to read the active tab of
 * every window. Only the active tab is read, never `tabs of window`: a user
 * can easily have a stale `meet.google.com/xxx-xxxx-xxx` tab open from an
 * earlier call, and enumerating tabs would return that old link instead of
 * the one just created.
 *
 * A window whose active tab can't be read is recorded with
 * {@link UNSCRIPTABLE_WINDOW_MARKER} rather than silently dropped, so callers
 * can tell "no meeting yet" apart from "couldn't read this window". Both the
 * error case and an empty/`missing value` URL use the marker, which keeps the
 * returned entry count equal to the window count Arc reported.
 *
 * This is a routine, transient state — not a Little Arc signature. Observed
 * live on Arc: `URL of active tab` raises `-1728` for a perfectly normal,
 * visible window (right after a tab opens, or when the active tab isn't a web
 * page) and returns a URL again milliseconds later. Callers must keep polling
 * rather than treating the marker as fatal.
 */
export function getArcFamilyTabsScript(appName: string): string {
  return `
    tell application "${appName}"
      set candidateList to {}
      set windowCount to count of windows
      repeat with i from 1 to windowCount
        try
          tell window i
            set candidateURL to URL of active tab
          end tell
          if candidateURL is missing value or candidateURL is "" then
            error "no readable URL"
          end if
          set end of candidateList to candidateURL
        on error
          set end of candidateList to "${UNSCRIPTABLE_WINDOW_MARKER}"
        end try
      end repeat
      set AppleScript's text item delimiters to (ASCII character 31)
      set candidateString to candidateList as string
      set AppleScript's text item delimiters to ""
      return candidateString
    end tell
  `;
}

/**
 * Counts actual on-screen windows for a process via System Events, bypassing
 * the app's own (possibly incomplete) AppleScript dictionary. Used to detect
 * windows — like Little Arc — that exist but aren't enumerated by
 * {@link getArcFamilyTabsScript}.
 */
export function getSystemEventsWindowCountScript(processName: string): string {
  return `
    tell application "System Events"
      if not (exists process "${processName}") then return "0"
      return (count of windows of process "${processName}") as string
    end tell
  `;
}

/**
 * Firefox-family browsers have little to no AppleScript support, so this
 * focuses the browser and drives the address bar with keystrokes:
 * 1. Focus the browser.
 * 2. `cmd + l` to select the address bar.
 * 3. `cmd + c` to copy its contents.
 * 4. `Escape` to release address bar focus.
 *
 * The copied value is read back via Raycast's Clipboard API by the caller,
 * not inside this script, so the caller can save/restore the user's
 * original clipboard contents around the whole polling loop.
 */
export function getFocusAddressBarScript(appName: string): string {
  return `
    tell application "${appName}"
      activate
    end tell

    delay 0.2

    tell application "System Events"
      keystroke "l" using {command down}
      delay 0.15
      keystroke "c" using {command down}
      delay 0.2
      key code 53
    end tell
  `;
}

/**
 * Identifies the frontmost application via System Events rather than
 * scanning `lsappinfo metainfo` output, which can surface a background
 * helper process or an Electron app whose bundle path merely contains a
 * supported browser's name.
 */
export const getOpenedBrowserScript = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
    end tell
    return frontApp
`;

export function getSwitchToPreviousAppScript(): string {
  return `
    tell application "System Events"
      keystroke tab using {command down}
    end tell
  `;
}
