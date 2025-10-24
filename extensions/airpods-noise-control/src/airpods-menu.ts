import { runAppleScript, showFailureToast } from "@raycast/utils";
import { Prefs } from "./type";
import { updateCommandMetadata } from "@raycast/api";
import { isSequoia } from "./utils";

/**
 * @param prefs - User preferences including AirPods index and localization
 * @param toggleOption - Type of toggle: "noise-control" or "conversation-awareness"
 * @returns Status message or null on error
 */
export async function execAirPodsMenu(
  { airpodsIndex, soundLoc, ccLoc, optionOne, optionTwo }: Prefs,
  toggleOption = "",
): Promise<string | null> {
  const isTahoe = isSequoia();
  const expandToggleIndex = isTahoe ? "(i + 1)" : "(i - 1)";

  const script = `
set AirPodsIndex to ${airpodsIndex}
set ToggleOption to "${toggleOption}"
set isTahoe to ${isTahoe ? "true" : "false"}

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

on getNoiseControlIndex(optName)
	if optName is "Transparency" then
		return 7
	else if optName is "Adaptive" then
		return 8
	else if optName is "Noise Cancellation" then
		return 9
	else
		return 0
	end if
end getNoiseControlIndex

on getConversationAwarenessIndex(optName)
	if optName is "Off" then
		return 15
	else if optName is "On" then
		return 16
	else
		return 0
	end if
end getConversationAwarenessIndex

if ToggleOption is "noise-control" then
	set OptionOne to "${optionOne}"
	set OptionTwo to "${optionTwo}"

	set IndexOne to AirPodsIndex + getOptionIndex(OptionOne)
	set IndexTwo to AirPodsIndex + getOptionIndex(OptionTwo)

	-- For Tahoe menu bar direct access
	set TahoeIdx1 to getNoiseControlIndex(OptionOne)
	set TahoeIdx2 to getNoiseControlIndex(OptionTwo)
else
	set OptionOne to "Off"
	set OptionTwo to "On"

	set IndexOne to AirPodsIndex + 5
	set IndexTwo to AirPodsIndex + 6

	-- For Tahoe menu bar direct access (Conversation Awareness)
	set TahoeIdx1 to getConversationAwarenessIndex(OptionOne)
	set TahoeIdx2 to getConversationAwarenessIndex(OptionTwo)
end if

tell application "System Events"
	tell application process "ControlCenter"
		try
			set output to "🔴 No Change"

			-- Use Control Center method (most reliable for Sequoia)
			try
				set menuBar to (first menu bar item whose description is "${ccLoc}") of menu bar 1
				tell menuBar to click
				delay 0.3 -- Optimized delay for Control Center to open

				if isTahoe then
					-- macOS Sequoia Control Center: Optimized path
					try
						set ccWindow to window "${ccLoc}"
						set allElements to entire contents of ccWindow

						-- Single-pass search: Find Sound text and group together
						set soundTextIndex to -1
						set soundGroup to missing value
						set elemCount to length of allElements

						repeat with i from 1 to elemCount
							try
								set elem to item i of allElements
								set elemClass to class of elem

								-- Find Sound text
								if soundTextIndex is -1 and elemClass is static text then
									if value of elem is "${soundLoc}" then
										set soundTextIndex to i
									end if
								end if

								-- Find Sound group (only check after finding text)
								if soundTextIndex is not -1 and soundGroup is missing value and elemClass is group then
									if i is greater than or equal to soundTextIndex and i is less than or equal to (soundTextIndex + 5) then
										try
											set groupActions to actions of elem
											if (count of groupActions) ≥ 2 then
												if description of item 2 of groupActions contains "show details" then
													set soundGroup to elem
													exit repeat -- Found both, exit early
												end if
											end if
										end try
									end if
								end if
							end try
						end repeat

						if soundTextIndex is -1 then
							key code 53
							return "sound-not-found"
						end if

						if soundGroup is missing value then
							key code 53
							return "sound-not-found"
						end if

						-- Open Sound detail view
						perform (item 2 of actions of soundGroup)
						delay 0.5 -- Optimized delay for detail view

						-- Access scroll area: window 1 -> UI element 1 -> scroll area
						set detailWindow to window 1
						set detailGroup to UI element 1 of detailWindow
						set scrollArea to missing value

						-- Find scroll area inside the group
						repeat with elem in (UI elements of detailGroup)
							if class of elem is scroll area then
								set scrollArea to elem
								exit repeat
							end if
						end repeat

						if scrollArea is missing value then
							key code 53
							return "sound-not-found"
						end if

						-- Get UI elements in the scroll area
						set scrollChildren to UI elements of scrollArea

						if TahoeIdx1 > 0 and TahoeIdx2 > 0 and TahoeIdx1 is less than or equal to (count of scrollChildren) and TahoeIdx2 is less than or equal to (count of scrollChildren) then
							set checkbox1 to item TahoeIdx1 of scrollChildren
							set checkbox2 to item TahoeIdx2 of scrollChildren

							-- Check current state and toggle
							if (value of checkbox1 as boolean) is true then
								click checkbox2
								set output to "🟢 " & OptionTwo
							else
								click checkbox1
								set output to "🔵 " & OptionOne
							end if

							-- Close Control Center using Escape key (more reliable)
							delay 0.1
							key code 53
							return output
						else
							key code 53
							return "invalid-option-index"
						end if
					on error ccErrMsg
						key code 53
						return "control-center-not-found"
					end try
				else
					-- Pre-Sequoia: Traditional Control Center method
					set ccMenuElements to entire contents of window "${ccLoc}"
					set soundWindowIndex to -1

					repeat with i from 1 to length of ccMenuElements
						set currentItem to properties of item i of ccMenuElements
						if value of currentItem is equal to "${soundLoc}" then
							set soundWindowIndex to i
							exit repeat
						end if
					end repeat

					if soundWindowIndex is equal to -1 then
						key code 53
						return "sound-not-found"
					end if

					-- Click Sound button to open detailed view
					set soundWindowButtonIndex to soundWindowIndex + 2
					set soundWindowButton to item soundWindowButtonIndex of ccMenuElements
					tell soundWindowButton to click
					delay 0.3 -- Optimized delay

					-- Access AirPods controls in the scroll area
					set btMenu to (scroll area 1 of group 1 of window "${ccLoc}")
					set btCheckbox to (checkbox AirPodsIndex of btMenu)
					set btCheckboxValue to value of btCheckbox as boolean

					if btCheckboxValue is true then
						-- Load elements only when AirPods are connected
						set btMenuElements to entire contents of btMenu

						-- Find the expand toggle relative to AirPods checkbox
						repeat with i from 1 to length of btMenuElements
							set currentItem to item i of btMenuElements
							if currentItem is equal to btCheckbox then
								set givenIndex to i
								exit repeat
							end if
						end repeat

						set expandToggle to item ${expandToggleIndex} of btMenuElements
						set expandToggleExpanded to value of expandToggle as boolean

						-- Expand options if not already expanded
						if expandToggleExpanded is false then
							click expandToggle
							delay 0.3 -- Required for expansion animation
						end if

						-- Toggle between the two options
						if (value of checkbox IndexOne of btMenu as boolean) is true then
							click checkbox IndexTwo of btMenu
							set output to "🟢 " & OptionTwo
						else
							click checkbox IndexOne of btMenu
							set output to "🔵 " & OptionOne
						end if

						-- Close Control Center using Escape key (more reliable)
						delay 0.1
						key code 53
						return output
					else
						key code 53
						return "airpods-not-connected"
					end if
				end if
			end try
		on error errMsg
			try
				key code 53
			end try
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
      case "airpods-not-found-in-menu": {
        await showFailureToast("", {
          title: "AirPods not found in Sound menu",
        });

        return null;
      }
      case "invalid-option-index": {
        await showFailureToast("", {
          title: "Invalid option configuration",
        });

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
