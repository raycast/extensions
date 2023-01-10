import { runAppleScript } from "run-applescript";
import { Tab } from "./types";

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
      tell window (${tab.windowId} as number)
        tell tab (${tab.tabId} as number) to select
      end tell

      activate
    end tell
  `);
}

export async function findOpenTab(link: string) {
  const response = await runAppleScript(`
    set _output to ""

    tell application "Arc"
      set _window_index to 1

      repeat with _window in windows
          set _tab_index to 1
          
          repeat with _tab in tabs of _window
            set _url to get URL of _tab

            if _url is equal "${link}" then
              set _title to get title of _tab
            
              set _output to (_output & "{ \\"title\\": \\"" & _title & "\\", \\"url\\": \\"" & _url & "\\", \\"windowId\\": " & _window_index & ", \\"tabId\\": " & _tab_index & " }")
            
              return _output
            end if

            set _tab_index to _tab_index + 1
          end repeat
          
          set _window_index to _window_index + 1
      end repeat
    end tell

    return _output
  `);

  return response ? (JSON.parse(response) as Tab) : undefined;
}
