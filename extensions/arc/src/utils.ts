import { runAppleScript } from "run-applescript";
import { HistoryEntry, Tab } from "./types";

export function getDomain(url: string) {
  try {
    const urlObj = new URL(url);
    return {
      value: urlObj.hostname.replace("www.", ""),
      tooltip: url,
    };
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export function getLastVisitedAt(entry: HistoryEntry) {
  const date = new Date(entry.lastVisitedAt);
  return { date, tooltip: `Last visited: ${date.toLocaleString()}` };
}

let promiseInFlight: Promise<Tab[]> | undefined;
let openTabs: Tab[] | undefined;

export function getOpenTabs() {
  if (openTabs) {
    return Promise.resolve(openTabs);
  }

  if (promiseInFlight) {
    return promiseInFlight;
  }

  promiseInFlight = runAppleScript(`
      set _output to ""

      tell application "Arc"
        set _window_index to 1
        
        repeat with _window in windows
          set _tab_index to 1
          
          repeat with _tab in tabs of _window
            set _title to get title of _tab
            set _url to get URL of _tab
            
            set _output to (_output & "{ \\"title\\": \\"" & _title & "\\", \\"url\\": \\"" & _url & "\\", \\"windowId\\": " & _window_index & ", \\"tabId\\": " & _tab_index & " }")
            
            if _tab_index < (count tabs of _window) and _window_index < 3 then
              set _output to (_output & ",\\n")
            else
              set _output to (_output & "\\n")
            end if
            
            set _tab_index to _tab_index + 1
          end repeat
          
          set _window_index to _window_index + 1
        end repeat
      end tell
      
      return "[\\n" & _output & "\\n]"
    `)
    .then((res) => JSON.parse(res))
    .then((res) => {
      openTabs = res;
      return res;
    })
    .finally(() => (promiseInFlight = undefined));

  return promiseInFlight;
}

export async function setActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Arc"
      activate
      set index of window (${tab.windowId} as number) to (${tab.windowId} as number)
      set active tab index of window (${tab.windowId} as number) to (${tab.tabId} as number)
    end tell
  `);
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export const isPermissionError = (error: unknown) => {
  return error instanceof Error && error.name === "PermissionError";
};

export async function createNewArcWindow() {
  await runAppleScript(`
    tell application "Arc"
      make new window
      activate
    end tell
  `);
}
