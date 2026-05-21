import { LocalStorage, environment } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { listSidecarDevices, normalizeName } from "./sidecar";

const execFileAsync = promisify(execFile);

export interface Display {
  name: string;
  type: "display" | "ipad" | "mac";
  lastConnected?: number;
}

const STORAGE_KEY = "known_displays";
const QUICK_CONNECT_KEY = "quick_connect_display";
const MIRROR_SECTION_NAME = "Mirror or extend to";

// AppleScript to scan available displays from System Settings dropdown
const scanScript = `
set mirrorSectionName to (system attribute "Mirror_Section_Name")

do shell script "open 'x-apple.systempreferences:com.apple.Displays-Settings.extension'"

set deviceNames to {}

on cleanup()
  try
    tell application "System Settings" to quit
  end try
  do shell script "open '" & (system attribute "Raycast_Deeplink") & "'"
end cleanup

tell application "System Events"
  set windowWait to 0
  repeat until (exists window 1 of application process "System Settings") or windowWait >= 50
    delay 0.1
    set windowWait to windowWait + 1
  end repeat
  if windowWait >= 50 then
    my cleanup()
    return ""
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
      return ""
    end if

    -- Click to open the menu
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
      return ""
    end if

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
          if itemName is not missing value and itemName contains mirrorSectionName then
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

// legacy scan: read every "Mirror or extend to" entry from the System
// Settings dropdown; covers non-Sidecar targets (e.g. AirPlay Macs)
async function scanViaSystemSettings(): Promise<string[]> {
  const deeplink = `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/connect-to-display`;
  const { stdout } = await execFileAsync("osascript", ["-e", scanScript], {
    timeout: 15000,
    env: {
      ...process.env,
      Mirror_Section_Name: MIRROR_SECTION_NAME,
      Raycast_Deeplink: deeplink,
    },
  });

  if (!stdout || stdout.trim() === "") return [];

  return stdout
    .split("|||")
    .map((name) => name.trim())
    .filter((name) => name !== "");
}

// scan displays from both SidecarCore (iPads) and the System Settings
// "Mirror or extend to" menu (other targets), de-duplicated by name
export async function scanDisplaysFromSystem(): Promise<Display[]> {
  const [sidecarResult, menuResult] = await Promise.allSettled([
    listSidecarDevices(),
    scanViaSystemSettings(),
  ]);

  // de-dupe by normalized name; SidecarCore entries take precedence
  const byKey = new Map<string, Display>();

  if (sidecarResult.status === "fulfilled") {
    for (const name of sidecarResult.value.devices) {
      byKey.set(normalizeName(name), { name, type: "ipad" });
    }
  } else {
    console.error("SidecarCore scan failed:", sidecarResult.reason);
  }

  if (menuResult.status === "fulfilled") {
    for (const name of menuResult.value) {
      const key = normalizeName(name);
      if (!byKey.has(key)) byKey.set(key, { name, type: "display" });
    }
  } else {
    console.error("System Settings scan failed:", menuResult.reason);
  }

  const scanned = [...byKey.values()];

  // merge with stored displays to preserve lastConnected times
  const stored = await getStoredDisplays();
  return scanned.map((d) => {
    const existing = stored.find(
      (s) => normalizeName(s.name) === normalizeName(d.name),
    );
    return existing ? { ...d, lastConnected: existing.lastConnected } : d;
  });
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

// --- Quick Connect ---

export async function getQuickConnectDisplay(): Promise<string | undefined> {
  const stored = await LocalStorage.getItem<string>(QUICK_CONNECT_KEY);
  return stored || undefined;
}

export async function setQuickConnectDisplay(name: string): Promise<void> {
  await LocalStorage.setItem(QUICK_CONNECT_KEY, name);
}

export async function clearQuickConnectDisplay(): Promise<void> {
  await LocalStorage.removeItem(QUICK_CONNECT_KEY);
}
