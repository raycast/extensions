import { runAppleScript, showFailureToast } from "@raycast/utils";
import { Prefs } from "./type";
import { updateCommandMetadata } from "@raycast/api";
import { isSequoia } from "./utils";

export async function execAirPodsMenu(
  { airpodsIndex, soundLoc, ccLoc, optionOne, optionTwo }: Prefs,
  toggleOption = "",
): Promise<string | null> {
  const expandToggleIndex = isSequoia() ? "(i + 1)" : "(i - 1)";
  const script = `
set AirPodsIndex to ${airpodsIndex}
set ToggleOption to "${toggleOption}"

on getOptionIndex(Opt)
	if Opt is equal to "Transparency" then
		return 1
	else if Opt is equal to "Adaptive" then
		return 2
	else if Opt is equal to "Noise Cancellation" then
		return 3
	else
		return 0
	end if
end getOptionIndex

if ToggleOption is "noise-control"
	set OptionOne to "${optionOne}"
	set OptionTwo to "${optionTwo}"

	set IndexOne to AirPodsIndex + getOptionIndex(OptionOne)
	set IndexTwo to AirPodsIndex + getOptionIndex(OptionTwo)
else
	set OptionOne to "Off"
	set OptionTwo to "On"

	set IndexOne to AirPodsIndex + 5
	set IndexTwo to AirPodsIndex + 6
end if

tell application "System Events"
	tell application process "ControlCenter"
		try
			set output to "🔴 No Change"
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
					return "sound-not-found"
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
				set expandToggle to item ${expandToggleIndex} of btMenuElements
				set expandToggleExpanded to value of expandToggle as boolean
				if expandToggleExpanded is false then
					click expandToggle
					delay 1
				end if
				set currentMode to value of checkbox IndexOne of btMenu as boolean
				if currentMode is true then
					click checkbox IndexTwo of btMenu
					set output to "🟢 " & OptionTwo
				else
					click checkbox IndexOne of btMenu
					set output to "🔵 " & OptionOne
				end if
			else
				tell menuBar to click
				if soundWindowIndex is not equal to -1 then
					tell menuBar to click
				end if
				return "airpods-not-connected"
			end if
			tell menuBar to click
			if soundWindowIndex is not equal to -1 then
				tell menuBar to click
			end if
			return output
		on error
			tell menuBar to click
			if soundWindowIndex is not equal to -1 then
				tell menuBar to click
			end if
			return "control-center-not-found"
		end try
	end tell
end tell
  `;

  try {
    const result = await runAppleScript<string>(script);

    switch (result) {
      case "sound-not-found": {
        await showFailureToast("", {
          title: "Sound not found. Check Localization!",
        });

        return null;
      }
      case "control-center-not-found": {
        await showFailureToast("", {
          title: "Control Center not found. Check Localization!",
        });

        return null;
      }
      case "airpods-not-connected": {
        await showFailureToast("", { title: "AirPods not connected!" });

        return null;
      }
      default: {
        await updateCommandMetadata({ subtitle: `Mode: ${result}` });

        return result;
      }
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could not run AppleScript" });

    return null;
  }
}
