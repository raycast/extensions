import { Cache, getApplications, getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

interface Preferences {
  primaryTodoSource: "string";
  splitRatio: "string";
}

type WindowBound = [number, number, number, number];

interface WindowState {
  todoApp: WindowBound;
  calendar: WindowBound;
  calendarViewState: string;
}

const { primaryTodoSource, splitRatio } = getPreferenceValues<Preferences>();

const appNameAndCommand = {
  reminders: {
    name: "Reminders",
    command:
      'tell application "System Events" to tell process "Reminders" to click menu item 1 of menu of menu item 3 of menu 5 of menu bar 1',
  },
  things: { name: "Things3", command: 'show list "Today"' },
  todoist: { name: "Todoist", command: "" },
};

const app = appNameAndCommand[primaryTodoSource as "reminders" | "things" | "todoist"];

// Use `mouseLocation` to determine the main screen since `NSScreen's mainScreen` doesn't work when run via Raycast.
// The app windows may not shrink down to the calculated widths if they're smaller than certain values, especially when
// `splitRatio` is 1:2 or 2:1.
//
// For "Calendar", `activate` seems redundant since `view calendar` brings up a new window if there isn't one, but it is
// kept just in case. Also, `view calendar` is the most reliable way to bring up a window when no windows are visible,
// since "front window" may refer to the Availability Panel window or one of the invisible windows in edge cases.
const splitScript = `use framework "AppKit"
use scripting additions

set {x1, y1, x2, y2} to getMainScreenBounds()
set ratio to ${splitRatio}
set x_divider to x1 + (x2 - x1) * ratio

tell application "Calendar"
  activate
  view calendar at current date
  set calendarBounds to bounds of front window
  set bounds of front window to {x_divider, y1, x2, y2}
  set calendarViewState to my getCurrentCalendarView()
  switch view to day view
  reload calendars
end tell

tell application "${app.name}"
  activate
  ${app.command}
  set todoAppBounds to bounds of front window
  set bounds of front window to {x1, y1, x_divider, y2}
end tell

return stringify({todoApp:todoAppBounds, calendar:calendarBounds, calendarViewState:calendarViewState })

on getMainScreenBounds()
  set curApp to current application
  set theScreens to curApp's NSScreen's screens
  set mouseLocation to curApp's NSEvent's mouseLocation
  set originScreenHeight to missing value
  set mouseScreen to missing value
  repeat with s in theScreens
    set {{x, y}, {w, h}} to s's frame()
    if x = 0 and y = 0 then set originScreenHeight to h
    set hasMouse to curApp's NSMouseInRect(mouseLocation, s's frame, false)
    if hasMouse then set mouseScreen to s
    if originScreenHeight is not missing value and mouseScreen is not missing value then exit repeat
  end repeat

  set {{x, y}, {w, h}} to mouseScreen's visibleFrame()
  set y_flipped to originScreenHeight - (y + h)
  return {x, y_flipped, x + w, y_flipped + h}
end getMainScreenBounds

on getCurrentCalendarView()
  tell application "System Events" to tell process "Calendar"
    if exists front window then
      set toolbarGroups to front window's toolbar 1's groups
      repeat with g in toolbarGroups
        repeat with rg in g's radio groups
          set selectedButton to rg's value
          set buttonCount to count of rg's radio buttons
          if selectedButton's class is radio button and buttonCount > 2 then
            -- Use index instead of selectedButton's description, which may change depending on language settings.
            repeat with i from 1 to buttonCount
              if rg's radio button i = selectedButton then
                if i = 1 then return "day view"
                if i = 2 then return "week view"
                -- "year view" is not supported by iCal's "switch view" command
                return "month view"
              end if
            end repeat
          end if
        end repeat
      end repeat
    end if
    -- Default to week view if no Calendar windows are open or Calendar app UI element structure changes.
    return "week view"
  end tell
end getCurrentCalendarView

on stringify(theObject)
  set curApp to current application
  set {theData, theError} to curApp's NSJSONSerialization's dataWithJSONObject:theObject options:0 |error|:(reference)
  if theData is missing value then error (theError's localizedDescription() as text) number -10000
  set theString to curApp's NSString's alloc()'s initWithData:theData encoding:(curApp's NSUTF8StringEncoding)
  return theString as text
end stringify`;

const toAppleScriptList = (numbers: number[]) => "{" + numbers.map((number) => number.toString()).join(", ") + "}";

const getRestoreScript = ({ todoApp, calendar, calendarViewState }: WindowState) => `
tell application "${app.name}"
  if running and (front window exists) then set bounds of front window to ${toAppleScriptList(todoApp)}
end tell

tell application "Calendar"
  if running and (front window exists) then
    set bounds of front window to ${toAppleScriptList(calendar)}
    switch view to ${calendarViewState}
  end if
end tell

return ""`;

const cache = new Cache();
const key = "windowArrangementState";

function getCachedState(): WindowState | undefined {
  const cachedStateStr = cache.get(key);
  if (cachedStateStr) {
    try {
      const cachedState = JSON.parse(cachedStateStr) as WindowState;
      return cachedState;
    } catch (error) {
      console.error("Failed to parse cached window state", error);
    }
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function Command() {
  const cachedState = getCachedState();
  const script = cachedState ? getRestoreScript(cachedState) : splitScript;
  try {
    const state = await runAppleScript(script);
    cache.set(key, state);
    if (cachedState) {
      await showHUD(
        `✅ ${capitalize(primaryTodoSource)} and Calendar app windows restored to original positions and sizes`
      );
    }
  } catch (error) {
    const installedApplications = await getApplications();
    // If installed, Things's name appears as "Things", not "Things3".
    if (installedApplications.every(({ name }) => name.toLowerCase() !== primaryTodoSource)) {
      await showHUD(`❌ ${capitalize(primaryTodoSource)} not installed`);
    } else if (error instanceof Error) {
      await showHUD(`❌ ${error.message}`);
    } else {
      throw error;
    }
  }
}
