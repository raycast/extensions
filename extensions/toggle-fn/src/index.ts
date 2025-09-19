import { runAppleScript } from "@raycast/utils";

export default async function () {
  await runAppleScript(
    `
set osver to system version of (system info)

-- Read initial state for verification
set initialState to "unknown"
try
	set initialState to do shell script "defaults read -g com.apple.keyboard.fnState 2>/dev/null || echo '0'"
on error
	-- Continue without initial state
end try

-- Step 1: Open Function Keys settings directly
if osver ≥ 15.0 then
	-- For macOS 15+, try the most direct approach first
	try
		open location "x-apple.systempreferences:com.apple.Keyboard-Settings.extension?FunctionKeys"
		delay 1
	on error
		-- Fallback to general keyboard settings
		open location "x-apple.systempreferences:com.apple.Keyboard-Settings.extension"
		delay 1
	end try
else if osver ≥ 14.0 then
	-- For macOS 14.x
	try
		tell application "System Settings"
			reveal anchor "FunctionKeys" of pane id "com.apple.Keyboard-Settings.extension"
		end tell
		delay 1
	on error
		open location "x-apple.systempreferences:com.apple.Keyboard-Settings.extension"
		delay 1
	end try
else
	-- For macOS 13.x and below
	open location "x-apple.systempreferences:com.apple.Keyboard-Settings.extension"
	delay 1
end if

-- Step 2: Navigate to Function Keys dialog using UI automation
tell application "System Events" to tell process "System Settings"
	-- Wait for System Settings window
	repeat with i from 1 to 20
		if (count of windows) > 0 then exit repeat
		delay 0.5
	end repeat
	
	if (count of windows) = 0 then
		error "System Settings window not found"
	end if
	
	-- For macOS 15+, we need to click Function Keys button if not already in that dialog
	if osver ≥ 15.0 then
		-- Check if we're already in the Function Keys dialog (sheet exists)
		if not (exists sheet 1 of window 1) then
			-- Wait for main content to load
			delay 2
			
			-- Try to find Function Keys button by systematically checking buttons
			set functionKeysButtonFound to false
			repeat with buttonIndex from 1 to 15
				try
					set testButton to button buttonIndex of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
					if exists testButton then
						click testButton
						delay 1.5
						
						-- Check if Function Keys sheet appeared
						if exists sheet 1 of window 1 then
							set functionKeysButtonFound to true
							exit repeat
						end if
					end if
				on error
					-- Continue to next button
				end try
			end repeat
			
			if not functionKeysButtonFound then
				error "Could not find Function Keys button in macOS 15"
			end if
		end if
	else
		-- For macOS 14 and below, use the known working method
		-- Wait for main window to be ready
		repeat with i from 1 to 20
			if exists of (1st window whose value of attribute "AXMain" is true) then exit repeat
			delay 0.5
		end repeat
		
		-- Wait for UI elements
		repeat with i from 1 to 20
			if exists group 1 of group 2 of splitter group 1 of group 1 of window 1 then exit repeat
			delay 0.5
		end repeat
		
		-- Try the known button positions for Function Keys
		set buttonFound to false
		repeat with keyboardButton from 1 to 5
			try
				click button keyboardButton of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
				delay 1.5
				
				-- Check if Function Keys sheet appeared
				if exists sheet 1 of window 1 then
					set buttonFound to true
					exit repeat
				end if
			on error
				-- Continue to next button
			end try
		end repeat
		
		if not buttonFound then
			error "Could not find Function Keys button in macOS 13-14"
		end if
		
		-- Use keyboard shortcut to navigate to Function Keys
		keystroke "f"
		delay 1
	end if
	
	-- Step 3: Find and toggle the Function Keys checkbox
	-- Wait for checkbox to be available
	set checkboxFound to false
	repeat with attempt from 1 to 10
		try
			-- Try the most common checkbox location first
			if exists (checkbox 1 of group 1 of scroll area 1 of group 2 of splitter group 1 of group 1 of sheet 1 of window 1) then
				set targetCheckbox to checkbox 1 of group 1 of scroll area 1 of group 2 of splitter group 1 of group 1 of sheet 1 of window 1
				set checkboxFound to true
				exit repeat
			end if
			
			-- Try alternative locations
			if exists (checkbox 1 of scroll area 1 of group 1 of sheet 1 of window 1) then
				set targetCheckbox to checkbox 1 of scroll area 1 of group 1 of sheet 1 of window 1
				set checkboxFound to true
				exit repeat
			end if
			
			-- Try any checkbox in the sheet
			set allCheckboxes to every checkbox of sheet 1 of window 1
			if (count of allCheckboxes) > 0 then
				set targetCheckbox to item 1 of allCheckboxes
				set checkboxFound to true
				exit repeat
			end if
			
			delay 0.5
		on error
			delay 0.5
		end try
	end repeat
	
	if not checkboxFound then
		error "Function Keys checkbox not found in any expected location"
	end if
	
	-- Get the current checkbox state before clicking
	set checkboxState to "unknown"
	try
		set checkboxState to value of targetCheckbox
	end try
	
	-- Click the checkbox to toggle
	click targetCheckbox
	delay 1
	
	-- Verify the checkbox state changed
	try
		set newCheckboxState to value of targetCheckbox
		if checkboxState ≠ "unknown" and checkboxState = newCheckboxState then
			display notification "Warning: Function Keys setting may not have changed"
		end if
	end try
	
	-- Step 4: Close the Function Keys dialog
	-- Try multiple methods to close the dialog
	set dialogClosed to false
	
	-- Method 1: Try standard Done button locations
	repeat with btnIndex from 1 to 3
		try
			click button btnIndex of group 2 of splitter group 1 of group 1 of sheet 1 of window 1
			set dialogClosed to true
			exit repeat
		on error
			-- Continue trying
		end try
	end repeat
	
	-- Method 2: Try window-level buttons
	if not dialogClosed then
		repeat with btnIndex from 1 to 5
			try
				click button btnIndex of window 1
				set dialogClosed to true
				exit repeat
			on error
				-- Continue trying
			end try
		end repeat
	end if
	
	-- Method 3: Press Enter key
	if not dialogClosed then
		key code 36 -- Enter key
		set dialogClosed to true
	end if
	
	-- Wait for dialog to close
	delay 2
	
	-- Verify dialog closed
	if exists sheet 1 of window 1 then
		display notification "Warning: Function Keys dialog may still be open"
	end if
end tell

-- Close System Settings
tell application "System Settings" to quit
delay 1

-- Step 5: Verify the setting actually changed
try
	set finalState to do shell script "defaults read -g com.apple.keyboard.fnState 2>/dev/null || echo '0'"
	
	if initialState ≠ "unknown" and initialState = finalState then
		display notification "Warning: Function Keys setting may not have changed"
		error "Function Keys setting did not change from " & initialState
	else
		display notification "Function Keys toggled successfully"
	end if
on error e
	display notification "Function Keys toggle completed"
end try
`,
  );
}
