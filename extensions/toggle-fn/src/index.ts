import { runAppleScript } from "@raycast/utils";
import { showHUD } from "@raycast/api";

export default async function () {
  try {
    // Execute AppleScript to toggle settings
    const result = await runAppleScript(
      `
      use AppleScript version "2.4"
      use scripting additions

      set osver to system version of (system info)

      considering numeric strings
          -- [Branch 1] Newer macOS (e.g., macOS 26 Tahoe or later)
          -- Uses direct 'defaults write' + 'activateSettings' instead of slow UI scripting
          if osver >= "26.0" then
              try
                  set currentState to do shell script "defaults read -g com.apple.keyboard.fnState"
              on error
                  set currentState to "0"
              end try

              if currentState is "1" then
                  -- Currently Standard F-Keys -> Switch to Media Keys
                  do shell script "defaults write -g com.apple.keyboard.fnState -bool false"
                  set resultMsg to "MEDIA"
              else
                  -- Currently Media Keys -> Switch to Standard F-Keys
                  do shell script "defaults write -g com.apple.keyboard.fnState -bool true"
                  set resultMsg to "STANDARD"
              end if
              
              -- CRITICAL STEP: Refresh system settings to make changes take effect immediately
              do shell script "/System/Library/PrivateFrameworks/SystemAdministration.framework/Resources/activateSettings -u"
              
              return resultMsg
              
          -- [Branch 2] macOS Ventura / Sonoma / Sequoia (macOS 13 - 15)
          -- Uses UI Scripting to click through System Settings
          else if osver >= "13.0" then
              open location "x-apple.systempreferences:com.apple.Keyboard-Settings.extension"
              delay 1 -- Wait for the settings to open
              
              if osver >= "14.0" then
                  tell application "System Settings"
                      reveal anchor "FunctionKeys" of pane id "com.apple.Keyboard-Settings.extension"
                  end tell
              else
                  tell application "System Events" to tell process "System Settings"
                      repeat until window begins with "Keyboard" exists
                          delay 0.5
                      end repeat
                      
                      -- Wait for UI to settle
                      repeat until exists of (1st window whose value of attribute "AXMain" is true)
                          delay 0.5
                      end repeat
                      
                      repeat until exists group 1 of group 2 of splitter group 1 of group 1 of window 1
                          delay 0.5
                      end repeat
                      
                      -- Attempt to find the correct button
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
              
              -- Perform the toggle click
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
              return "LEGACY_TOGGLED"
              
          -- [Branch 3] Older macOS (< 13.0)
          -- Uses internal System Preferences scripting
          else if osver < "13.0" then
              tell application "System Preferences"
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
                      tell application "System Preferences" to quit
                      return "LEGACY_TOGGLED"
                  else
                      tell application "System Preferences"
                          activate
                          set current pane to pane "com.apple.preference.security"
                          display dialog "UI element scripting is not enabled. Please activate this app under Privacy -> Accessibility so it can access the settings it needs."
                      end tell
                  end if
              end tell
          end if
      end considering
      `,
    );

    // --- HUD Style Optimization ---

    if (result && result.includes("STANDARD")) {
      // Logic for New macOS: Switched to F1, F2...
      await showHUD("⌨️ Standard F-Keys Active");
    } else if (result && result.includes("MEDIA")) {
      // Logic for New macOS: Switched to Volume, Brightness...
      await showHUD("🔈 Media Controls Active");
    } else {
      // Logic for Old macOS or fallback
      await showHUD("⚙️ Fn State Toggled");
    }
  } catch (error) {
    console.error(error);
    await showHUD("❌ Failed to toggle Fn keys");
  }
}
