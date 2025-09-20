import { runAppleScript } from "@raycast/utils";

export default async function () {
  runAppleScript(
    `
set osver to system version of (system info)
if osver ≥ 13.0 then
	open location "x-apple.systempreferences:com.apple.Keyboard-Settings.extension"
	delay 1 -- Wait for the settings to open
	
	if osver ≥ 14.0 then
		tell application "System Settings"
			reveal anchor "FunctionKeys" of pane id "com.apple.Keyboard-Settings.extension"
		end tell
	else
		tell application "System Events" to tell process "System Settings"
			repeat until window begins with "Keyboard" exists
				delay 0.5
			end repeat
			
			repeat until exists of (1st window whose value of attribute "AXMain" is true)
				delay 0.5
			end repeat
			
			repeat until exists group 1 of group 2 of splitter group 1 of group 1 of window 1
				delay 0.5
			end repeat
			
			set keyboardButton to 3
			try
				click button keyboardButton of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
			on error errorMessage number errorNumber
				if errorNumber is -1719 then
					set keyboardButton to 1
					click button keyboardButton of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
				end if
			end try
			
			repeat until sheet 1 of window 1 exists
				delay 0.5
			end repeat
			
			keystroke "f"
		end tell
	end if
	
	tell application "System Events" to tell process "System Settings"
		repeat until exists (checkbox 1 of group 1 of scroll area 1 of group 2 of splitter group 1 of group 1 of sheet 1 of window 1)
			delay 0.5
		end repeat
		
		click checkbox 1 of group 1 of scroll area 1 of group 2 of splitter group 1 of group 1 of sheet 1 of window 1
		
		click button 1 of group 2 of splitter group 1 of group 1 of sheet 1 of window 1

		repeat
			try
				repeat while sheet 1 of window 1 exists
					delay 0.5
				end repeat
				exit repeat
			end try
		end repeat
	end tell
	
	tell application "System Settings" to quit
else if osver < 13.0 then
	tell application "System Settings"
		set current pane to pane "com.apple.preference.keyboard"
	end tell
	
	tell application "System Events"
		if UI elements enabled then
			tell application process "System Preferences"
				repeat until exists tab group 1 of window "Keyboard"
					delay 0.5
				end repeat
				click radio button 1 of tab group 1 of window "Keyboard"
				try
					click checkbox 1 of tab group 1 of window "Keyboard"
				end try
				try
					click checkbox 2 of tab group 1 of window "Keyboard"
				end try
			end tell
			tell application "System Settings" to quit
		else
			tell application "System Settings"
				activate
				set current pane to pane "com.apple.preference.security"
				display dialog "UI element scripting is not enabled. Please activate this app under Privacy -> Accessibility so it can access the settings it needs."
			end tell
		end if
	end tell
end if
`,
  );
}
