import { runAppleScript, showFailureToast } from "@raycast/utils";
import { Prefs } from "./type";
import { updateCommandMetadata } from "@raycast/api";
import { isSequoiaOrLater } from "./utils";

export async function execAirPodsMenu(
  { airpodsIndex, airpodsType, soundLoc, optionOne, optionTwo }: Prefs,
  toggleOption = "",
): Promise<string | null> {
  const useControlCenter = isSequoiaOrLater();
  const isAirPodsMax = airpodsType === "max";

  // Script for macOS Sequoia and later (uses ControlCenter process)
  const controlCenterScript = `
set AirPodsIndex to ${airpodsIndex}
set ToggleOption to "${toggleOption}"
set isAirPodsMax to ${isAirPodsMax}

-- Get option index for AirPods Max (has Off, Transparency, Noise Cancellation)
on getMaxOptionIndex(Opt)
	if Opt is equal to "Off" then
		return 1
	else if Opt is equal to "Transparency" then
		return 2
	else if Opt is equal to "Noise Cancellation" then
		return 3
	else
		return 1
	end if
end getMaxOptionIndex

-- Get option index for AirPods Pro (has Transparency, Adaptive, Noise Cancellation)
on getProOptionIndex(Opt)
	if Opt is equal to "Transparency" then
		return 1
	else if Opt is equal to "Adaptive" then
		return 2
	else if Opt is equal to "Noise Cancellation" then
		return 3
	else
		return 1
	end if
end getProOptionIndex

-- Calculate indices based on user preferences and AirPods type
if ToggleOption is "noise-control"
	set OptionOne to "${optionOne}"
	set OptionTwo to "${optionTwo}"

	if isAirPodsMax then
		-- Validate that Adaptive is not selected for AirPods Max
		if OptionOne is equal to "Adaptive" or OptionTwo is equal to "Adaptive" then
			return "adaptive-not-supported-on-max"
		end if
		set IndexOne to AirPodsIndex + getMaxOptionIndex(OptionOne)
		set IndexTwo to AirPodsIndex + getMaxOptionIndex(OptionTwo)
	else
		set IndexOne to AirPodsIndex + getProOptionIndex(OptionOne)
		set IndexTwo to AirPodsIndex + getProOptionIndex(OptionTwo)
	end if
else
	set OptionOne to "Off"
	set OptionTwo to "On"
	-- Conversation Awareness: Off at +4, On at +5 (Pro only)
	set IndexOne to AirPodsIndex + 4
	set IndexTwo to AirPodsIndex + 5
end if

tell application "System Events"
	tell application process "ControlCenter"
		try
			set output to "🔴 No Change"

			-- Find and click the Sound menu bar item
			set soundMenu to missing value
			set menuBarItems to menu bar items of menu bar 1

			repeat with menuItem in menuBarItems
				try
					if description of menuItem is "${soundLoc}" then
						set soundMenu to menuItem
						exit repeat
					end if
				end try
			end repeat

			if soundMenu is missing value then
				return "sound-menu-not-found"
			end if

			click soundMenu
			delay 0.15

			-- Get entire contents of the first window and find scroll areas
			set allElements to entire contents of window 1
			set scrollArea to missing value

			repeat with elem in allElements
				try
					if role of elem is "AXScrollArea" then
						set scrollArea to elem
						exit repeat
					end if
				end try
			end repeat

			if scrollArea is missing value then
				key code 53 -- ESC
				return "sound-menu-not-found"
			end if

			-- Get checkboxes from scroll area
			set allCheckboxes to checkboxes of scrollArea
			set cbCount to count of allCheckboxes

			-- Check if AirPods checkbox exists and is selected
			if AirPodsIndex > cbCount then
				key code 53 -- ESC
				return "airpods-not-connected"
			end if

			set airpodsCheckbox to checkbox AirPodsIndex of scrollArea
			set airpodsSelected to value of airpodsCheckbox as boolean

			if airpodsSelected is false then
				key code 53 -- ESC
				return "airpods-not-connected"
			end if

			-- Find and click the expand toggle (disclosure triangle) for the AirPods item
			-- We need to find the disclosure triangle associated with the AirPods checkbox,
			-- not just any disclosure triangle in the scroll area
			set allElements to entire contents of scrollArea
			set airpodsElementIndex to -1

			-- Find the position of the AirPods checkbox in the element list
			repeat with i from 1 to count of allElements
				if item i of allElements is equal to airpodsCheckbox then
					set airpodsElementIndex to i
					exit repeat
				end if
			end repeat

			-- Look for a disclosure triangle near the AirPods checkbox (within next few elements)
			if airpodsElementIndex > 0 then
				repeat with j from (airpodsElementIndex + 1) to (airpodsElementIndex + 3)
					if j > (count of allElements) then exit repeat
					try
						set elem to item j of allElements
						if role of elem is "AXDisclosureTriangle" then
							set isExpanded to value of elem as boolean
							if isExpanded is false then
								click elem
								delay 0.1
							end if
							exit repeat
						end if
					end try
				end repeat
			end if

			-- Re-get checkboxes after potential expansion
			set allCheckboxes to checkboxes of scrollArea

			if ToggleOption is "noise-control" then
				-- Toggle between user-configured options
				set currentModeOne to value of checkbox IndexOne of scrollArea as boolean

				if currentModeOne is true then
					click checkbox IndexTwo of scrollArea
					set output to "🟢 " & OptionTwo
				else
					click checkbox IndexOne of scrollArea
					set output to "🔵 " & OptionOne
				end if
			else
				-- Conversation Awareness toggle
				if isAirPodsMax then
					key code 53 -- ESC
					return "conversation-awareness-not-supported"
				else
					set isCAOff to value of checkbox IndexOne of scrollArea as boolean

					if isCAOff then
						click checkbox IndexTwo of scrollArea
						set output to "🟢 On"
					else
						click checkbox IndexOne of scrollArea
						set output to "🔵 Off"
					end if
				end if
			end if

			key code 53 -- ESC
			return output

		on error errMsg
			try
				key code 53 -- ESC
			end try
			return "sound-menu-not-found"
		end try
	end tell
end tell
  `;

  // Legacy script for pre-Sequoia macOS (uses SystemUIServer)
  const legacyScript = `
set AirPodsIndex to ${airpodsIndex}
set ToggleOption to "${toggleOption}"
set isAirPodsMax to ${isAirPodsMax}

-- Get option index for AirPods Max (has Off, Transparency, Noise Cancellation)
on getMaxOptionIndex(Opt)
	if Opt is equal to "Off" then
		return 1
	else if Opt is equal to "Transparency" then
		return 2
	else if Opt is equal to "Noise Cancellation" then
		return 3
	else
		return 1
	end if
end getMaxOptionIndex

-- Get option index for AirPods Pro (has Transparency, Adaptive, Noise Cancellation)
on getProOptionIndex(Opt)
	if Opt is equal to "Transparency" then
		return 1
	else if Opt is equal to "Adaptive" then
		return 2
	else if Opt is equal to "Noise Cancellation" then
		return 3
	else
		return 1
	end if
end getProOptionIndex

-- Calculate indices based on user preferences and AirPods type
if ToggleOption is "noise-control"
	set OptionOne to "${optionOne}"
	set OptionTwo to "${optionTwo}"

	if isAirPodsMax then
		-- Validate that Adaptive is not selected for AirPods Max
		if OptionOne is equal to "Adaptive" or OptionTwo is equal to "Adaptive" then
			return "adaptive-not-supported-on-max"
		end if
		set IndexOne to AirPodsIndex + getMaxOptionIndex(OptionOne)
		set IndexTwo to AirPodsIndex + getMaxOptionIndex(OptionTwo)
	else
		set IndexOne to AirPodsIndex + getProOptionIndex(OptionOne)
		set IndexTwo to AirPodsIndex + getProOptionIndex(OptionTwo)
	end if
else
	-- Conversation Awareness (Pro only)
	if isAirPodsMax then
		return "conversation-awareness-not-supported"
	end if
	set OptionOne to "Off"
	set OptionTwo to "On"
	-- CA Off at +4, CA On at +5 (after the 3 listening mode options)
	set IndexOne to AirPodsIndex + 4
	set IndexTwo to AirPodsIndex + 5
end if

tell application "System Events"
	tell application process "SystemUIServer"
		try
			set output to "🔴 No Change"
			set menuBar to (first menu bar item whose description is "${soundLoc}") of menu bar 1
			tell menuBar to click
			delay 0.1
			set soundMenu to menu 1 of menuBar
			set menuElements to entire contents of soundMenu
			set btCheckbox to (checkbox AirPodsIndex of soundMenu)
			set btCheckboxValue to value of btCheckbox as boolean

			if btCheckboxValue is true then
				repeat with i from 1 to length of menuElements
					set currentItem to item i of menuElements
					if currentItem is equal to btCheckbox then
						set givenIndex to i
						exit repeat
					end if
				end repeat

				set expandToggle to item (i - 1) of menuElements
				set expandToggleExpanded to value of expandToggle as boolean
				if expandToggleExpanded is false then
					click expandToggle
					delay 0.1
				end if

				set currentMode to value of checkbox IndexOne of soundMenu as boolean
				if currentMode is true then
					click checkbox IndexTwo of soundMenu
					set output to "🟢 " & OptionTwo
				else
					click checkbox IndexOne of soundMenu
					set output to "🔵 " & OptionOne
				end if
			else
				tell menuBar to click
				return "airpods-not-connected"
			end if

			tell menuBar to click
			return output
		on error errMsg
			try
				tell menuBar to click
			end try
			return "sound-menu-not-found"
		end try
	end tell
end tell
  `;

  const script = useControlCenter ? controlCenterScript : legacyScript;

  try {
    const result = await runAppleScript<string>(script);

    switch (result) {
      case "sound-menu-not-found": {
        await showFailureToast("", {
          title: "Sound menu not found. Check Localization!",
        });

        return null;
      }
      case "airpods-not-connected": {
        await showFailureToast("", { title: "AirPods not connected!" });

        return null;
      }
      case "conversation-awareness-not-supported": {
        await showFailureToast("", {
          title: "Conversation Awareness not supported on AirPods Max",
        });

        return null;
      }
      case "adaptive-not-supported-on-max": {
        await showFailureToast("", {
          title: "Adaptive mode not available on AirPods Max",
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
