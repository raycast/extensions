import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export interface Prefs {
  airpodsIndex: number;
  soundLoc: string;
  ccLoc: string;
}

const getScript = ({ airpodsIndex, soundLoc, ccLoc }: Prefs) => `
set AirPodsIndex to ${airpodsIndex}
set ANCIndex to AirPodsIndex + 2
set TransparencyIndex to AirPodsIndex + 3

tell application "System Events"
  tell application process "ControlCenter"
    try
      set menuBar to (first menu bar item whose description is "${soundLoc}") of menu bar 1
      tell menuBar to click
      delay 0.1
      set btMenu to (scroll area 1 of group 1 of window "${ccLoc}")
      set btMenuElements to entire contents of btMenu
      set btCheckbox to (checkbox AirPodsIndex of btMenu)
      set btCheckboxValue to value of btCheckbox as boolean
      if btCheckboxValue is true then
        repeat with i from 1 to length of btMenuElements
          set currentItem to item i of btMenuElements
          if currentItem is equal to btCheckbox then
            set givenIndex to i -- store the index
            exit repeat -- exit the loop
          end if
        end repeat
        set expandToggle to item (i - 1) of btMenuElements
        set expandToggleExpanded to value of expandToggle as boolean
        if expandToggleExpanded is false then
          click expandToggle
          delay 1
        end if
        set currentMode to value of checkbox ANCIndex of btMenu as boolean
        if currentMode is true then
          click checkbox TransparencyIndex of btMenu
          set result to "Transparency"
        else
          click checkbox ANCIndex of btMenu
          set result to "Noise Cancellation"
        end if
      else
        set result to "Error: AirPods not connected"
      end if
      tell menuBar to click
    on error
      set result to "Error: Sound menu missing"
    end try
    return result
  end tell
end tell
`;

export function runScript(): Promise<string> {
  const preferences = getPreferenceValues<Prefs>();
  const script = getScript(preferences);
  return runAppleScript(script);
}