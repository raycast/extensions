import { runAppleScript, showFailureToast } from "@raycast/utils";
import { updateCommandMetadata } from "@raycast/api";

interface ExecPrefs {
  airpodsIndex: number;
  airpodsType: "pro" | "max";
  soundLoc: string;
  optionOne: string;
  optionTwo: string;
  showHudNC: boolean;
  showHudCA: boolean;
}

export async function execAirPodsMenu(
  { airpodsIndex, airpodsType, soundLoc, optionOne, optionTwo }: ExecPrefs,
  toggleOption = "",
): Promise<string | null> {
  const isAirPodsMax = airpodsType === "max";

  // Fast script: Try to access Sound menu bar item directly via ControlCenter
  // This works on some Sequoia/Tahoe systems where Sound is a separate menu bar item
  const soundMenuScript = `
set AirPodsIndex to ${airpodsIndex}
set ToggleOption to "${toggleOption}"
set isAirPodsMax to ${isAirPodsMax}
set OptionOne to "${optionOne}"
set OptionTwo to "${optionTwo}"

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

			if AirPodsIndex > cbCount then
				key code 53 -- ESC
				return "airpods-not-found"
			end if

			set airpodsCheckbox to item AirPodsIndex of allCheckboxes
			set airpodsConnected to value of airpodsCheckbox as boolean

			if airpodsConnected is false then
				key code 53 -- ESC
				return "airpods-not-connected"
			end if

			-- Find and expand disclosure triangle
			set allElements to UI elements of scrollArea
			set checkboxIndex to -1

			repeat with i from 1 to count of allElements
				try
					if item i of allElements is equal to airpodsCheckbox then
						set checkboxIndex to i
						exit repeat
					end if
				end try
			end repeat

			-- Look for disclosure triangle after the checkbox
			if checkboxIndex > 0 then
				repeat with j from (checkboxIndex + 1) to (checkboxIndex + 5)
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

			delay 0.1
			set allCheckboxes to checkboxes of scrollArea

			-- Re-find our AirPods checkbox index
			set deviceCheckboxIndex to -1
			repeat with i from 1 to count of allCheckboxes
				try
					if item i of allCheckboxes is equal to airpodsCheckbox then
						set deviceCheckboxIndex to i
						exit repeat
					end if
				end try
			end repeat

			if deviceCheckboxIndex is -1 then
				key code 53 -- ESC
				return "error-airpods-checkbox-lost"
			end if

			-- Get mode checkboxes after the device
			set modeCandidates to {}
			set maxCandidates to 10
			repeat with k from (deviceCheckboxIndex + 1) to (deviceCheckboxIndex + maxCandidates)
				if k <= (count of allCheckboxes) then
					set end of modeCandidates to item k of allCheckboxes
				end if
			end repeat

			set candidateCount to count of modeCandidates

			if candidateCount < 3 then
				key code 53 -- ESC
				return "error-insufficient-mode-checkboxes"
			end if

			-- Determine layout type
			set layoutType to "3-mode"
			if isAirPodsMax is false then
				set layoutType to "4-mode"
			end if
			if candidateCount >= 6 then
				set layoutType to "4-mode"
			end if

			-- Toggle between modes
			if ToggleOption is "noise-control" then
				set activeIndex to -1
				repeat with m from 1 to candidateCount
					try
						if value of (item m of modeCandidates) as boolean is true then
							set activeIndex to m
							exit repeat
						end if
					end try
				end repeat

				set idxOne to 1
				set idxTwo to 1

				if layoutType is "4-mode" then
					if OptionOne is "Off" then set idxOne to 1
					if OptionOne is "Transparency" then set idxOne to 2
					if OptionOne is "Adaptive" then set idxOne to 3
					if OptionOne is "Noise Cancellation" then set idxOne to 4

					if OptionTwo is "Off" then set idxTwo to 1
					if OptionTwo is "Transparency" then set idxTwo to 2
					if OptionTwo is "Adaptive" then set idxTwo to 3
					if OptionTwo is "Noise Cancellation" then set idxTwo to 4
				else
					if OptionOne is "Off" then set idxOne to 1
					if OptionOne is "Transparency" then set idxOne to 2
					if OptionOne is "Noise Cancellation" then set idxOne to 3

					if OptionTwo is "Off" then set idxTwo to 1
					if OptionTwo is "Transparency" then set idxTwo to 2
					if OptionTwo is "Noise Cancellation" then set idxTwo to 3
				end if

				if activeIndex is equal to idxOne then
					if idxTwo <= candidateCount then
						click item idxTwo of modeCandidates
						set output to "🟢 " & OptionTwo
					end if
				else
					if idxOne <= candidateCount then
						click item idxOne of modeCandidates
						set output to "🔵 " & OptionOne
					end if
				end if
			else
				-- Conversation Awareness Toggle
				set caOffset to 5 -- After Off, Trans, NC, SpatialAudio (for 3-mode)
				if layoutType is "4-mode" then
					set caOffset to 6 -- After Off, Trans, Adaptive, NC, SpatialAudio
				end if

				if candidateCount >= (caOffset + 1) then
					set caOffCheckbox to item caOffset of modeCandidates
					set caOnCheckbox to item (caOffset + 1) of modeCandidates

					set caOnSelected to value of caOnCheckbox as boolean

					if caOnSelected is true then
						click caOffCheckbox
						delay 0.2
						set output to "🔵 Off"
					else
						click caOnCheckbox
						delay 0.2
						set output to "🟢 On"
					end if
				else
					key code 53 -- ESC
					return "conversation-awareness-not-supported"
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

  // Script for macOS Sequoia and later (uses ControlCenter process)
  const controlCenterScript = `
set AirPodsIndex to ${airpodsIndex}
set ToggleOption to "${toggleOption}"
set isAirPodsMax to ${isAirPodsMax}
set OptionOne to "${optionOne}"
set OptionTwo to "${optionTwo}"

tell application "System Events"
	tell application process "ControlCenter"
		try
			set output to "🔴 No Change"

			-- STEP 1: Open Control Center
			set ccMenu to missing value
			set menuBarItems to menu bar items of menu bar 1

			repeat with menuItem in menuBarItems
				try
					set menuDesc to description of menuItem
					if menuDesc is "Control Center" then
						set ccMenu to menuItem
						exit repeat
					end if
				end try
			end repeat

			if ccMenu is missing value then
				return "error-control-center-not-found"
			end if

			-- Strategy: Ensure Control Center is open with retry logic
			set win to missing value
			set maxAttempts to 2

			repeat with attempt from 1 to maxAttempts
				-- First, try to get existing window
				try
					set win to window 1
					if win is not missing value then exit repeat
				end try

				-- Click to open (no preemptive ESC to avoid alert sounds)
				click ccMenu
				delay 0.5

				-- Check if it opened
				try
					set win to window 1
					if win is not missing value then exit repeat
				end try
			end repeat

			if win is missing value then
				return "error-control-center-window-not-found"
			end if

			-- STEP 2: Find Sound Module (group containing slider with "volume")
			set topGroup to UI element 1 of win
			set topChildren to UI elements of topGroup

			set soundModule to missing value
			repeat with child in topChildren
				try
					if role of child is "AXGroup" then
						set groupChildren to UI elements of child
						repeat with grandchild in groupChildren
							try
								if role of grandchild is "AXSlider" then
									set sliderDesc to description of grandchild
									if sliderDesc contains "volume" or sliderDesc contains "sound" then
										set soundModule to child
										exit repeat
									end if
								end if
							end try
						end repeat
					end if
				end try
				if soundModule is not missing value then exit repeat
			end repeat

			if soundModule is missing value then
				key code 53 -- ESC
				return "error-sound-module-not-found"
			end if

			-- STEP 3: Click Sound Module to expand
			click soundModule
			delay 0.3

			-- STEP 4: Find Scroll Area (with retry)
			set scrollArea to missing value
			repeat 5 times
				try
					set win to window 1
					set winElements to UI elements of win

					-- Check Level 1
					repeat with elem in winElements
						if role of elem is "AXScrollArea" then
							set scrollArea to elem
							exit repeat
						end if
					end repeat

					if scrollArea is not missing value then exit repeat

					-- Check Level 2 (inside groups)
					repeat with elem in winElements
						if role of elem is "AXGroup" then
							try
								set groupElems to UI elements of elem
								repeat with subElem in groupElems
									if role of subElem is "AXScrollArea" then
										set scrollArea to subElem
										exit repeat
									end if
								end repeat
							end try
						end if
						if scrollArea is not missing value then exit repeat
					end repeat

					if scrollArea is not missing value then exit repeat
				end try
				delay 0.2
			end repeat

			if scrollArea is missing value then
				key code 53 -- ESC
				return "error-scroll-area-not-found"
			end if

			-- STEP 5: Get all checkboxes BEFORE expansion
			set allCheckboxes to checkboxes of scrollArea
			set cbCount to count of allCheckboxes

			if AirPodsIndex > cbCount then
				key code 53 -- ESC
				return "airpods-not-found"
			end if

			set airpodsCheckbox to item AirPodsIndex of allCheckboxes
			set airpodsConnected to value of airpodsCheckbox as boolean

			if airpodsConnected is false then
				key code 53 -- ESC
				return "airpods-not-connected"
			end if

			-- STEP 6: Find and expand disclosure triangle for AirPods
			set allElements to UI elements of scrollArea
			set checkboxIndex to -1

			-- Find index of our checkbox in all elements
			repeat with i from 1 to count of allElements
				try
					if item i of allElements is equal to airpodsCheckbox then
						set checkboxIndex to i
						exit repeat
					end if
				end try
			end repeat

			-- Look for disclosure triangle after the checkbox
			if checkboxIndex > 0 then
				repeat with j from (checkboxIndex + 1) to (checkboxIndex + 5)
					if j > (count of allElements) then exit repeat
					try
						set elem to item j of allElements
						if role of elem is "AXDisclosureTriangle" then
							set triangleExpanded to value of elem as boolean
							if triangleExpanded is false then
								click elem
								delay 0.2
							end if
							exit repeat
						end if
					end try
				end repeat
			end if

			-- STEP 7: Re-fetch checkboxes AFTER expansion
			delay 0.1
			set allCheckboxes to checkboxes of scrollArea

			-- Re-find our AirPods checkbox index
			set deviceCheckboxIndex to -1
			repeat with i from 1 to count of allCheckboxes
				try
					if item i of allCheckboxes is equal to airpodsCheckbox then
						set deviceCheckboxIndex to i
						exit repeat
					end if
				end try
			end repeat

			if deviceCheckboxIndex is -1 then
				key code 53 -- ESC
				return "error-airpods-checkbox-lost"
			end if

			-- STEP 8: Get checkboxes after the device (these are the modes)
			set modeCandidates to {}
			set maxCandidates to 10 -- Get up to 10 checkboxes after device
			repeat with k from (deviceCheckboxIndex + 1) to (deviceCheckboxIndex + maxCandidates)
				if k <= (count of allCheckboxes) then
					set end of modeCandidates to item k of allCheckboxes
				end if
			end repeat

			set candidateCount to count of modeCandidates

			if candidateCount < 3 then
				key code 53 -- ESC
				return "error-insufficient-mode-checkboxes"
			end if

			-- STEP 9: Determine layout (3-mode for Max, 4-mode for Pro)
			set layoutType to "3-mode" -- Default for Max

			if isAirPodsMax is false then
				set layoutType to "4-mode" -- Pro has Off, Transparency, Adaptive, NC
			end if

			-- Override detection: if we have 6+ candidates, likely 4-mode + CA
			if candidateCount >= 6 then
				set layoutType to "4-mode"
			end if

			-- STEP 10: Toggle between modes
			if ToggleOption is "noise-control" then
				-- Detect current active mode
				set activeIndex to -1
				repeat with m from 1 to candidateCount
					try
						if value of (item m of modeCandidates) as boolean is true then
							set activeIndex to m
							exit repeat
						end if
					end try
				end repeat

				-- Map option names to indices
				set idxOne to 1
				set idxTwo to 1

				if layoutType is "4-mode" then
					-- 1:Off, 2:Transparency, 3:Adaptive, 4:NC
					if OptionOne is "Off" then set idxOne to 1
					if OptionOne is "Transparency" then set idxOne to 2
					if OptionOne is "Adaptive" then set idxOne to 3
					if OptionOne is "Noise Cancellation" then set idxOne to 4

					if OptionTwo is "Off" then set idxTwo to 1
					if OptionTwo is "Transparency" then set idxTwo to 2
					if OptionTwo is "Adaptive" then set idxTwo to 3
					if OptionTwo is "Noise Cancellation" then set idxTwo to 4
				else
					-- 3-mode: 1:Off, 2:Transparency, 3:NC
					if OptionOne is "Off" then set idxOne to 1
					if OptionOne is "Transparency" then set idxOne to 2
					if OptionOne is "Noise Cancellation" then set idxOne to 3

					if OptionTwo is "Off" then set idxTwo to 1
					if OptionTwo is "Transparency" then set idxTwo to 2
					if OptionTwo is "Noise Cancellation" then set idxTwo to 3
				end if

				-- Toggle logic
				if activeIndex is equal to idxOne then
					if idxTwo <= candidateCount then
						click item idxTwo of modeCandidates
						set output to "🟢 " & OptionTwo
					end if
				else
					if idxOne <= candidateCount then
						click item idxOne of modeCandidates
						set output to "🔵 " & OptionOne
					end if
				end if
			else
				-- Conversation Awareness Toggle
				set caOffset to 5 -- After Off, Trans, NC, SpatialAudio (for 3-mode)
				if layoutType is "4-mode" then
					set caOffset to 6 -- After Off, Trans, Adaptive, NC, SpatialAudio
				end if

				if candidateCount >= (caOffset + 1) then
					set caOffCheckbox to item caOffset of modeCandidates
					set caOnCheckbox to item (caOffset + 1) of modeCandidates

					set caOnSelected to value of caOnCheckbox as boolean

					if caOnSelected is true then
						click caOffCheckbox
						delay 0.2
						set output to "🔵 Off"
					else
						click caOnCheckbox
						delay 0.2
						set output to "🟢 On"
					end if
				else
					key code 53 -- ESC
					return "conversation-awareness-not-supported"
				end if
			end if

			-- Close and return
			key code 53 -- ESC
			return output

		on error errMsg
			try
				key code 53 -- ESC
			end try
			return "error: " & errMsg
		end try
	end tell
end tell
  `;

  // Try fast Sound menu bar script first (ControlCenter with direct Sound menu access)
  // Fallback to nested Control Center approach if not found
  let result: string;
  try {
    result = await runAppleScript<string>(soundMenuScript);

    // If Sound menu not found in menu bar, fallback to nested Control Center approach
    if (result === "sound-menu-not-found") {
      result = await runAppleScript<string>(controlCenterScript);
    }
  } catch (error) {
    // If Sound menu script fails entirely, try Control Center as fallback
    try {
      result = await runAppleScript<string>(controlCenterScript);
    } catch (controlCenterError) {
      // Both scripts failed
      await showFailureToast(controlCenterError, {
        title: "Could not run AppleScript",
      });
      return null;
    }
  }

  // Process the result from whichever script succeeded
  switch (result) {
    case "sound-menu-not-found": {
      await showFailureToast("", {
        title: "Sound menu not found. Check Localization!",
      });
      return null;
    }
    case "error-control-center-not-found": {
      await showFailureToast("", {
        title: "Control Center not found in menu bar",
      });
      return null;
    }
    case "error-control-center-window-not-found": {
      await showFailureToast("", {
        title: "Control Center window did not open",
      });
      return null;
    }
    case "error-sound-module-not-found": {
      await showFailureToast("", {
        title: "Sound module not found in Control Center",
      });
      return null;
    }
    case "error-scroll-area-not-found": {
      await showFailureToast("", {
        title: "Could not open sound device list",
      });
      return null;
    }
    case "airpods-not-found": {
      await showFailureToast("", {
        title:
          "AirPods not found. Check if they're connected or verify your AirPods List Position setting.",
      });
      return null;
    }
    case "airpods-not-connected": {
      await showFailureToast("", { title: "AirPods not connected!" });
      return null;
    }
    case "error-airpods-checkbox-lost": {
      await showFailureToast("", {
        title: "Lost track of AirPods after expansion",
      });
      return null;
    }
    case "error-insufficient-mode-checkboxes": {
      await showFailureToast("", {
        title: "Could not find noise control modes",
      });
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
      // Handle generic errors that start with "error:"
      if (result.startsWith("error:")) {
        await showFailureToast("", {
          title: result.replace("error:", "").trim(),
        });
        return null;
      }

      // Success - update metadata with result
      await updateCommandMetadata({ subtitle: `Mode: ${result}` });
      return result;
    }
  }
}
