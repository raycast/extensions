import { environment } from "@raycast/api";
import { runAppleScript } from "run-applescript";

function sliceIntoChunks(arr: Array<string>, chunkSize: number): Array<Array<string>> {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}

export async function getOutputDevices() {
  const stringList = await runAppleScript(`
    set devices to {}

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
  `);

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
  await runAppleScript(`
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
  `);
}

/**
 * Create a deep link to this extension.
 * */
export const createDeepLink = function <T>(command: string, context?: T) {
  const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
  const deeplink = `${protocol}extensions/benvp/audio-device/${command}`;

  if (context) {
    const payload = encodeURIComponent(JSON.stringify(context));
    return `${deeplink}?context=${payload}`;
  }

  return deeplink;
};
