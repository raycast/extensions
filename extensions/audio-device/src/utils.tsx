import { runAppleScript } from "run-applescript";
import { isGreaterThanOrEqualTo } from "macos-version";

const isVentura = isGreaterThanOrEqualTo("13");

/* This file is mostly a duplicate of some of the functionality of helpers.tsx.
 * We do it this way in order to support AirPlay, which don't show up when
 * using helpers.tsx.
 *
 * In Ventura (macOS 13), the settings menu was redesigned, so we have two scripts to
 * do the same thing based on the version.
 *
 * (Note: Currently the Ventura version visually opens up the Settings. I'm not sure if there's
 * a way around it, or if there's no way around it.)
 */

function sliceIntoChunks(arr: Array<string>, chunkSize: number): Array<Array<string>> {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}

export async function getOutputDevices() {
  const stringList = await runAppleScript(
    isVentura
      ? `
    set devices to {}

    tell application "System Settings"
      activate
      tell application "System Events" to tell application process "System Settings"
        repeat until exists window 1
          delay 0.3
        end repeat
        set selected of row 9 of outline 1 of scroll area 1 of group 1 of splitter group 1 of group 1 of window 1 to true
        repeat until exists window "Sound"
          delay 0.3
        end repeat
        if value of radio button 1 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound" is not 1 then
          click radio button 1 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"
          repeat until value of radio button 1 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound" is 1
            delay 0.3
          end repeat
        end if

        tell table 1 of scroll area 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"
          set selected_row to (first UI element whose selected is true)
          set currentOutput to value of static text of group 1 of UI element 1 of selected_row as text
        end tell

        set theRows to rows of table 1 of scroll area 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"

        repeat with r in theRows
          try
				    set deviceName to value of static text of group 1 of UI element 1 of r as text
				    set deviceType to value of static text of group 1 of UI element 2 of r as text
            set end of devices to { deviceName, deviceType }
          end try
        end repeat
      end tell
    end tell

    if application "System Settings" is running then
      tell application "System Settings" to quit
    end if

    return [ devices, "currentOutput", currentOutput ]
    `
      : `set devices to {}

    tell application "System Preferences"
      reveal pane id "com.apple.preference.sound"
    end tell
    tell application "System Events"
      tell application process "System Preferences"
        repeat until exists tab group 1 of window "Sound"
        end repeat
        tell tab group 1 of window "Sound"
          click radio button "Output"
          tell table 1 of scroll area 1
            set selected_row to (first UI element whose selected is true)
            set currentOutput to value of text field 1 of selected_row as text

            repeat with r in rows
              try
                set deviceName to value of text field 1 of r as text
                set deviceType to value of text field 2 of r as text
                set end of devices to { deviceName, deviceType }
              end try
            end repeat
          end tell
        end tell
      end tell
    end tell

    if application "System Preferences" is running then
      tell application "System Preferences" to quit
    end if

    return [ devices, "currentOutput", currentOutput ]
  `
  );

  const list = stringList.split(", ");

  const currentOutputSeparator = list.indexOf("currentOutput");
  const currentOutput = list[currentOutputSeparator + 1];

  return sliceIntoChunks(list.slice(0, currentOutputSeparator), 2).map(([name, type]) => ({
    name,
    type,
    selected: name === currentOutput,
  }));
}

export async function setOutputDevice(item: string) {
  await runAppleScript(
    isVentura
      ? `
    tell application "System Settings"
      activate
      set visible of application process "System Settings" to false
      tell application "System Events" to tell application process "System Settings"
        repeat until exists window 1
          delay 0.3
        end repeat
        set selected of row 9 of outline 1 of scroll area 1 of group 1 of splitter group 1 of group 1 of window 1 to true
        repeat until exists window "Sound"
          delay 0.3
        end repeat
        if value of radio button 1 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound" is not 1 then
          click radio button 1 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"
          repeat until value of radio button 1 of tab group 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound" is 1
            delay 0.3
          end repeat
        end if
        set theRows to rows of table 1 of scroll area 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of window "Sound"
        repeat with r in theRows
          if (value of static text of group 1 of UI element 1 of r as string) is "${item}" then
            set selected of r to true
            exit repeat
          end if
        end repeat
      end tell
    end tell

    if application "System Settings" is running then
      tell application "System Settings" to quit
    end if`
      : `
    tell application "System Preferences"
      reveal pane id "com.apple.preference.sound"
    end tell
    tell application "System Events"
      tell application process "System Preferences"
        repeat until exists tab group 1 of window "Sound"
        end repeat
        tell tab group 1 of window "Sound"
          click radio button "Output"
          tell table 1 of scroll area 1
            select (row 1 where value of text field 1 is "${item}")
          end tell
        end tell
      end tell
    end tell

    if application "System Preferences" is running then
      tell application "System Preferences" to quit
    end if
  `
  );
}
