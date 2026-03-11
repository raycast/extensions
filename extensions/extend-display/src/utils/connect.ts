import { execFile, exec } from "child_process";
import { promisify } from "util";
import {
  getCurrentAudioSource,
  watchAndRevertAudio,
  forceAudioLock,
} from "./audio";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const MIRROR_SECTION_NAME = "Mirror or extend to";

const connectScript = `
do shell script "open -b com.apple.systempreferences /System/Library/PreferencePanes/Displays.prefPane"

set device to (system attribute "Device_Name")
set mirrorSectionName to (system attribute "Mirror_Section_Name")

on cleanup()
  try
    tell application "System Settings" to quit
  end try
  do shell script "open raycast://"
  delay 0.3
end cleanup

tell application "System Events"
  set windowWait to 0
  repeat until (exists window 1 of application process "System Settings") or windowWait >= 50
    delay 0.1
    set windowWait to windowWait + 1
  end repeat
  if windowWait >= 50 then
    my cleanup()
    error "System Settings did not open in time"
  end if

  tell process "System Settings"
    set frontmost to true
    delay 0.5
    
    set popUpButton to missing value
    set loopCount to 0
    set maxAttempts to 30
    
    repeat until popUpButton is not missing value or loopCount >= maxAttempts
      try
        -- Tahoe (macOS 26+)
        set popUpButton to menu button 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1
      on error
        try
          -- Pre-Tahoe
          set popUpButton to pop up button 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
        on error
          set popUpButton to missing value
        end try
      end try
      delay 0.1
      set loopCount to loopCount + 1
    end repeat
    
    if popUpButton is missing value then
      my cleanup()
      error "Could not find display menu button after " & maxAttempts & " attempts"
    end if

    click popUpButton
    delay 0.3
    
    -- Use try-based check instead of "exists" which throws -1700 on AXMenuButton
    set menuWait to 0
    set menuReady to false
    repeat until menuReady or menuWait >= 30
      try
        set menuItemCount to count of menu items of menu 1 of popUpButton
        if menuItemCount > 0 then set menuReady to true
      end try
      if not menuReady then
        delay 0.1
        set menuWait to menuWait + 1
      end if
    end repeat
    if not menuReady then
      key code 53
      my cleanup()
      error "Display menu did not appear"
    end if

    tell menu 1 of popUpButton
      set targetItem to missing value
      set mirrorFound to false
      repeat with i from 1 to count of menu items
        set currentItem to menu item i
        set itemName to name of currentItem
        if mirrorFound then
          if itemName contains device then
            set targetItem to currentItem
            exit repeat
          end if
        else
          if itemName contains mirrorSectionName then
            set mirrorFound to true
          end if
        end if
      end repeat

      if targetItem is missing value then
        key code 53
        my cleanup()
        error "Display '" & device & "' not found in menu"
      end if
      
      perform action "AXPress" of targetItem
    end tell
    
    delay 2
  end tell
end tell

tell application "System Settings" to quit
do shell script "open raycast://"
delay 0.3
return "success"
`;

/**
 * Check if a display is currently connected by examining system profiler output
 */
export async function getDisplayState(displayName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      "/usr/sbin/system_profiler SPDisplaysDataType",
      { shell: "/bin/zsh" },
    );
    return stdout.toLowerCase().includes(displayName.toLowerCase());
  } catch (e) {
    console.error("Failed to get display state:", e);
    return false;
  }
}

export interface ConnectionProgress {
  phase: "clicked" | "verified";
  success: boolean;
  connected?: boolean;
  audioReverted?: boolean;
}

export async function connectToDisplay(
  displayName: string,
  onProgress?: (progress: ConnectionProgress) => void,
) {
  let currentAudio = "";
  try {
    currentAudio = await getCurrentAudioSource();
  } catch (e) {
    console.error("Failed to get audio source", e);
  }

  const initialState = await getDisplayState(displayName);

  try {
    const connectPromise = execFileAsync("osascript", ["-e", connectScript], {
      timeout: 15000,
      env: {
        ...process.env,
        Device_Name: displayName,
        Mirror_Section_Name: MIRROR_SECTION_NAME,
      },
    });

    let audioReverted = false;
    if (currentAudio) {
      const audioLockPromise = forceAudioLock(currentAudio, 2000);

      await connectPromise;

      onProgress?.({
        phase: "clicked",
        success: true,
        connected: !initialState,
      });

      audioReverted = await watchAndRevertAudio(currentAudio);

      if (audioReverted) {
        console.log("Audio was reverted to original source");
      }

      await audioLockPromise;
    } else {
      await connectPromise;

      onProgress?.({
        phase: "clicked",
        success: true,
        connected: !initialState,
      });
    }

    const newState = await getDisplayState(displayName);
    const connected = newState !== initialState ? newState : !initialState;

    return {
      success: true,
      connected,
      audioReverted,
      phase: "verified" as const,
    };
  } catch (e) {
    console.error("Connection failed:", e);
    throw e;
  }
}
