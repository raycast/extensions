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
		    set setting to "🔴 No change"
			set soundWindowIndex to -1
			try
				set menuBar to (first menu bar item whose description is "${soundLoc}") of menu bar 1
				tell menuBar to click
				delay 0.1
				set btMenu to (scroll area 1 of group 1 of window "${ccLoc}")
			on error
				set menuBar to (first menu bar item whose description is "${ccLoc}") of menu bar 1
				tell menuBar to click
				delay 0.1
				set ccMenuElements to entire contents of window "${ccLoc}"
				repeat with i from 1 to length of ccMenuElements
					set currentItem to properties of item i of ccMenuElements
					if value of currentItem is equal to "${soundLoc}" then
						set soundWindowIndex to i
						exit repeat
					end if
				end repeat
				if soundWindowIndex is equal to -1 then
					tell menuBar to click
					return "⚠️ Error: Sound not found in Control Center (check localization)"
				end if
				set soundWindowButtonIndex to soundWindowIndex + 2
				set soundWindowButton to item soundWindowButtonIndex of ccMenuElements
				tell soundWindowButton to click
				delay 1
				set btMenu to (scroll area 1 of group 1 of window "${ccLoc}")
			end try
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
					set setting to "🟢 Transparency"
				else
					click checkbox ANCIndex of btMenu
					set setting to "🔵 Noise Cancellation"
				end if
			else
				tell menuBar to click
				if soundWindowIndex is not equal to -1 then
					tell menuBar to click
				end if
				return "⚠️ Error: AirPods not connected"
			end if
			tell menuBar to click
			if soundWindowIndex is not equal to -1 then
				tell menuBar to click
			end if
			return setting
		on error
			return "⚠️ Error: Control Center not found (check localization)"
		end try
	end tell
end tell
`;

export function runScript(): Promise<string> {
  const preferences = getPreferenceValues<Prefs>();
  const script = getScript(preferences);
  return runAppleScript(script);
}
