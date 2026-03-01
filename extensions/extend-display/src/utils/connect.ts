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

// AppleScript using AXPress action instead of click
// AXPress is a different accessibility action that may work better for AirPlay
const connectScript = `
do shell script "open -b com.apple.systempreferences /System/Library/PreferencePanes/Displays.prefPane"

set device to (system attribute "Device_Name")
set mirrorSectionName to (system attribute "Mirror_Section_Name")

tell application "System Events"
  repeat until (exists window 1 of application process "System Settings")
    delay 0.1
  end repeat

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
      error "Could not find display menu button after " & maxAttempts & " attempts"
    end if

    -- Click to open the menu
    click popUpButton
    delay 0.3
    
    repeat until exists menu 1 of popUpButton
      delay 0.1
    end repeat

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
        key code 53 -- Escape
        error "Display '" & device & "' not found in menu"
      end if
      
      -- Use AXPress action instead of click
      perform action "AXPress" of targetItem
    end tell
    
    -- Wait for connection to initiate
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
    // Check if the display name appears in the connected displays output
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
  // 1. Get current audio source BEFORE connecting
  let currentAudio = "";
  try {
    currentAudio = await getCurrentAudioSource();
  } catch (e) {
    console.error("Failed to get audio source", e);
  }

  // 2. Get initial display state
  const initialState = await getDisplayState(displayName);

  // 3. Connect via System Settings AppleScript and immediately lock audio
  // Start both simultaneously to prevent audio from switching
  try {
    const connectPromise = execFileAsync("osascript", ["-e", connectScript], {
      env: {
        ...process.env,
        Device_Name: displayName,
        Mirror_Section_Name: MIRROR_SECTION_NAME,
      },
    });

    // 4. Start force-locking audio immediately (don't wait for AppleScript)
    let audioReverted = false;
    if (currentAudio) {
      // Start aggressive audio lock immediately
      const audioLockPromise = forceAudioLock(currentAudio, 2000);

      // Wait for connection script
      await connectPromise;

      // Fire optimistic callback after menu click completes
      onProgress?.({
        phase: "clicked",
        success: true,
        connected: !initialState,
      });

      // Continue watching and reverting
      audioReverted = await watchAndRevertAudio(currentAudio);

      if (audioReverted) {
        console.log("Audio was reverted to original source");
      }

      await audioLockPromise;
    } else {
      await connectPromise;

      // Fire optimistic callback after menu click completes
      onProgress?.({
        phase: "clicked",
        success: true,
        connected: !initialState,
      });
    }

    // 5. Check final display state
    const newState = await getDisplayState(displayName);
    const connected = newState !== initialState ? newState : !initialState;

    // Return the new state for feedback purposes
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
