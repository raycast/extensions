import { LocalStorage, environment } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface Display {
  name: string;
  type: "display" | "ipad" | "mac";
  lastConnected?: number;
}

const STORAGE_KEY = "known_displays";
const MIRROR_SECTION_NAME = "Mirror or extend to";

// AppleScript to scan available displays from System Settings dropdown
const scanScript = `
set mirrorSectionName to (system attribute "Mirror_Section_Name")

do shell script "open -b com.apple.systempreferences /System/Library/PreferencePanes/Displays.prefPane"

set deviceNames to {}

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
      tell application "System Settings" to quit
      return ""
    end if

    -- Click to open the menu
    click popUpButton
    delay 0.3
    
    repeat until exists menu 1 of popUpButton
      delay 0.1
    end repeat

    tell menu 1 of popUpButton
      set mirrorFound to false
      repeat with i from 1 to count of menu items
        set currentItem to menu item i
        set itemName to name of currentItem
        if mirrorFound then
          if itemName is not missing value and itemName is not "" then
            set end of deviceNames to itemName
          end if
        else
          if itemName contains mirrorSectionName then
            set mirrorFound to true
          end if
        end if
      end repeat
    end tell

    -- Press escape to close dropdown
    key code 53
  end tell
end tell

tell application "System Settings" to quit
do shell script "open '" & (system attribute "Raycast_Deeplink") & "'"

set AppleScript's text item delimiters to "|||"
return deviceNames as string
`;

// Scan displays from System Settings dropdown
export async function scanDisplaysFromSystem(): Promise<Display[]> {
  try {
    const deeplink = `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/connect-to-display`;
    const { stdout } = await execFileAsync("osascript", ["-e", scanScript], {
      env: {
        ...process.env,
        Mirror_Section_Name: MIRROR_SECTION_NAME,
        Raycast_Deeplink: deeplink,
      },
    });

    if (!stdout || stdout.trim() === "") return [];

    const displays = stdout
      .split("|||")
      .filter((name) => name.trim() !== "")
      .map((name) => ({
        name: name.trim(),
        type: "display" as const,
        lastConnected: undefined,
      }));

    // Merge with stored displays to preserve lastConnected times
    const stored = await getStoredDisplays();
    return displays.map((d) => {
      const existing = stored.find((s) => s.name === d.name);
      return existing ? { ...d, lastConnected: existing.lastConnected } : d;
    });
  } catch (e) {
    console.error("Failed to scan displays:", e);
    return [];
  }
}

// Get stored displays from local storage
async function getStoredDisplays(): Promise<Display[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load displays:", e);
  }
  return [];
}

// Get known displays from local storage (for display list)
export async function getAvailableDisplays(): Promise<Display[]> {
  return getStoredDisplays();
}

// Save a display to known list
export async function saveDisplay(display: Display): Promise<void> {
  const displays = await getAvailableDisplays();
  const existingIndex = displays.findIndex((d) => d.name === display.name);

  if (existingIndex >= 0) {
    displays[existingIndex] = { ...display, lastConnected: Date.now() };
  } else {
    displays.push({ ...display, lastConnected: Date.now() });
  }

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(displays));
}

// Remove a display from known list
export async function removeDisplay(name: string): Promise<void> {
  const displays = await getAvailableDisplays();
  const filtered = displays.filter((d) => d.name !== name);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

// Update last connected time
export async function markDisplayConnected(name: string): Promise<void> {
  const displays = await getAvailableDisplays();
  const display = displays.find((d) => d.name === name);
  if (display) {
    display.lastConnected = Date.now();
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(displays));
  }
}
