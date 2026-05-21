import { execFile, exec } from "child_process";
import { promisify } from "util";
import {
  getCurrentAudioSource,
  watchAndRevertAudio,
  forceAudioLock,
} from "./audio";
import {
  listSidecarDevices,
  setSidecarConnection,
  normalizeName,
} from "./sidecar";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const MIRROR_SECTION_NAME = "Mirror or extend to";

const connectScript = `
do shell script "open 'x-apple.systempreferences:com.apple.Displays-Settings.extension'"

set device to (system attribute "Device_Name")
set mirrorSectionName to (system attribute "Mirror_Section_Name")

on cleanup()
  try
    tell application "System Settings" to quit
  end try
  do shell script "open raycast://"
  delay 0.3
end cleanup

on normalizeDisplayName(displayName)
  set originalDelimiters to AppleScript's text item delimiters
  set AppleScript's text item delimiters to character id 8217
  set displayNameParts to text items of (displayName as string)
  set AppleScript's text item delimiters to "'"
  set normalizedDisplayName to displayNameParts as string
  set AppleScript's text item delimiters to originalDelimiters
  return normalizedDisplayName
end normalizeDisplayName

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
        -- Tahoe (macOS 26+); "get role" forces evaluation so a missing element errors
        set popUpButton to menu button 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1
        get role of popUpButton
      on error
        try
          -- Pre-Tahoe
          set popUpButton to pop up button 1 of group 1 of group 2 of splitter group 1 of group 1 of window 1
          get role of popUpButton
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
      set normalizedDevice to my normalizeDisplayName(device)
      repeat with i from 1 to count of menu items
        set currentItem to menu item i
        set itemName to name of currentItem
        if mirrorFound then
          if itemName is not missing value and my normalizeDisplayName(itemName) contains normalizedDevice then
            set targetItem to currentItem
            exit repeat
          end if
        else
          if itemName is not missing value and itemName contains mirrorSectionName then
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
 * Best-effort connection check for the System Settings backend.
 *
 * Heuristic only: a Sidecar display reports as "Sidecar Display" in
 * system_profiler rather than by the iPad's name, so the SidecarCore
 * backend does not rely on this and uses connectedDevices instead.
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

/**
 * Return the matching SidecarCore device name, or null when the target is not
 * a Sidecar device (or SidecarCore is unavailable). Used to pick a backend.
 */
async function matchSidecarDevice(displayName: string): Promise<string | null> {
  const { devices } = await listSidecarDevices();
  const target = normalizeName(displayName);
  return (
    devices.find((d) => normalizeName(d) === target) ??
    devices.find((d) => normalizeName(d).includes(target)) ??
    null
  );
}

/**
 * Legacy backend: toggle a display through the System Settings
 * "Mirror or extend to" menu. Covers non-Sidecar targets (e.g. AirPlay Macs).
 */
async function connectViaSystemSettings(
  displayName: string,
): Promise<{ connected: boolean }> {
  const initialState = await getDisplayState(displayName);

  await execFileAsync("osascript", ["-e", connectScript], {
    timeout: 15000,
    env: {
      ...process.env,
      Device_Name: displayName,
      Mirror_Section_Name: MIRROR_SECTION_NAME,
    },
  });

  const newState = await getDisplayState(displayName);
  return { connected: newState !== initialState ? newState : !initialState };
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

  // prefer the SidecarCore backend when the target is a Sidecar device,
  // otherwise fall back to the System Settings menu flow
  const sidecarName = await matchSidecarDevice(displayName);

  try {
    const connectPromise: Promise<{ connected: boolean }> = sidecarName
      ? setSidecarConnection(sidecarName, "toggle")
      : connectViaSystemSettings(displayName);

    let audioReverted = false;
    let result: { connected: boolean };

    if (currentAudio) {
      const audioLockPromise = forceAudioLock(currentAudio, 2000);

      result = await connectPromise;

      onProgress?.({
        phase: "clicked",
        success: true,
        connected: result.connected,
      });

      audioReverted = await watchAndRevertAudio(currentAudio);

      if (audioReverted) {
        console.log("Audio was reverted to original source");
      }

      await audioLockPromise;
    } else {
      result = await connectPromise;

      onProgress?.({
        phase: "clicked",
        success: true,
        connected: result.connected,
      });
    }

    return {
      success: true,
      connected: result.connected,
      audioReverted,
      phase: "verified" as const,
    };
  } catch (e) {
    console.error("Connection failed:", e);
    throw e;
  }
}
