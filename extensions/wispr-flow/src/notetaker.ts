import { open, showToast, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import {
  ensureWisprFlowInstalled,
  getDbPath,
  openWisprFlow,
  WISPR_FLOW_BUNDLE_ID,
} from "./db";

export const NOTETAKER_URL = "wispr-flow://open/notetaker";

const MEETING_SHORTCUT_ACTION = "open_meeting_recorder";
// Wispr Flow reads fn from the keyboard hardware, so a posted fn press never reaches it.
const FN_KEY_CODE = 63;

// Event flags for each modifier key code Wispr Flow stores: the shared mask plus the left or right device bit.
const MODIFIER_FLAGS: Record<number, number> = {
  55: 0x100008,
  54: 0x100010,
  56: 0x20002,
  60: 0x20004,
  58: 0x80020,
  61: 0x80040,
  59: 0x40001,
  62: 0x42000,
};

interface MeetingShortcut {
  modifiers: number[];
  key: number;
}

interface WisprFlowConfig {
  prefs?: {
    user?: {
      shortcuts?: Record<string, string>;
      meetingRecorderShortcutRemoved?: boolean;
    };
  };
}

// Wispr Flow saves its "Join meeting / start Notetaker" shortcut as key codes, such as "46+58" for Option+M.
function readMeetingShortcut(): MeetingShortcut | null {
  try {
    const configPath = join(dirname(getDbPath()), "config.json");
    const config = JSON.parse(
      readFileSync(configPath, "utf8"),
    ) as WisprFlowConfig;
    const user = config.prefs?.user;
    if (!user?.shortcuts || user.meetingRecorderShortcutRemoved) return null;
    const binding = Object.entries(user.shortcuts).find(
      ([, action]) => action === MEETING_SHORTCUT_ACTION,
    )?.[0];
    if (!binding) return null;
    const codes = binding.split("+").map(Number);
    if (!codes.every(Number.isInteger) || codes.includes(FN_KEY_CODE)) {
      return null;
    }
    const modifiers = codes.filter((code) => code in MODIFIER_FLAGS);
    const keys = codes.filter((code) => !(code in MODIFIER_FLAGS));
    return keys.length === 1 ? { modifiers, key: keys[0] } : null;
  } catch {
    return null;
  }
}

// Wispr Flow ignores System Events keystrokes because it tracks each modifier press, so post every key as its own event.
// Secure input (a password field, some VPN clients) hides keys from Wispr Flow, so skip the shortcut then.
function pressShortcutScript({ modifiers, key }: MeetingShortcut): string {
  return `
ObjC.import("AppKit");
ObjC.import("Carbon");
ObjC.import("CoreGraphics");
ObjC.bindFunction("CGPreflightPostEventAccess", ["bool", []]);
(() => {
  const HID_SYSTEM_STATE = 1;
  const FLAGS_CHANGED = 12;
  const HID_EVENT_TAP = 0;
  const modifiers = ${JSON.stringify(modifiers)};
  const flagsFor = ${JSON.stringify(MODIFIER_FLAGS)};
  if ($.NSRunningApplication.runningApplicationsWithBundleIdentifier("${WISPR_FLOW_BUNDLE_ID}").count === 0) return "not running";
  if ($.IsSecureEventInputEnabled()) return "secure input";
  // macOS drops posted keys without Accessibility access, so raise the error showNotetakerError turns into the permission toast.
  if (!$.CGPreflightPostEventAccess()) throw new Error("Not allowed to send keystrokes");
  const source = $.CGEventSourceCreate(HID_SYSTEM_STATE);
  let flags = 0;
  const post = (code, down, isModifier) => {
    const event = $.CGEventCreateKeyboardEvent(source, code, down);
    if (isModifier) $.CGEventSetType(event, FLAGS_CHANGED);
    $.CGEventSetFlags(event, flags);
    $.CGEventPost(HID_EVENT_TAP, event);
    delay(0.03);
  };
  for (const code of modifiers) {
    flags |= flagsFor[code];
    post(code, true, true);
  }
  post(${key}, true, false);
  post(${key}, false, false);
  for (const code of [...modifiers].reverse()) {
    flags &= ~flagsFor[code];
    post(code, false, true);
  }
  return "pressed";
})();
`;
}

// Returns false when the shortcut is off, Wispr Flow is not running, or secure input is on.
async function pressMeetingShortcut(): Promise<boolean> {
  const shortcut = readMeetingShortcut();
  if (!shortcut) return false;
  const result = await runAppleScript(pressShortcutScript(shortcut), {
    language: "JavaScript",
  });
  return result.trim() === "pressed";
}

// Fallback when the meeting shortcut can't be pressed: press ⌘N on the Notetaker page once Wispr Flow is in front.
const START_SCRIPT = `
tell application "System Events"
  repeat 50 times
    if exists (application process "Wispr Flow") then
      if frontmost of application process "Wispr Flow" then
        delay 0.5
        keystroke "n" using command down
        return "started"
      end if
    end if
    delay 0.2
  end repeat
end tell
return "timeout"
`;

// Electron keeps window contents out of the accessibility tree until a client asks for them.
const ENABLE_ACCESSIBILITY_SCRIPT = `
ObjC.import("AppKit");
ObjC.import("ApplicationServices");
const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier("${WISPR_FLOW_BUNDLE_ID}");
if (apps.count > 0) {
  const app = $.AXUIElementCreateApplication(apps.objectAtIndex(0).processIdentifier);
  $.AXUIElementSetAttributeValue(app, $("AXManualAccessibility"), $.kCFBooleanTrue);
}
"ok";
`;

// Wispr Flow has no deep link that stops a recording, so find the recorder's Stop button by its accessibility label.
const STOP_BUTTON_SCRIPT = `
tell application "System Events"
  if not (exists application process "Wispr Flow") then return "idle"
  tell application process "Wispr Flow"
    if not (exists window "Meeting Recorder") then return "idle"
    set els to entire contents of window "Meeting Recorder"
    repeat with i from 1 to (count of els)
      try
        set e to item i of els
        set isStopButton to (class of e as text) is "button" and (description of e as text) is "Stop listening"
      on error
        set isStopButton to false
      end try
      if isStopButton then
        perform action "AXPress" of e
        return "stopped"
      end if
    end repeat
  end tell
end tell
return "idle"
`;

async function enableAccessibilityTree(): Promise<void> {
  try {
    await runAppleScript(ENABLE_ACCESSIBILITY_SCRIPT, {
      language: "JavaScript",
    });
  } catch {
    // The tree may already be exposed, so still look for the button.
  }
}

// Returns false when no recording is in progress.
async function pressStopButton(): Promise<boolean> {
  await enableAccessibilityTree();
  const result = await runAppleScript(STOP_BUTTON_SCRIPT, { timeout: 15000 });
  return result.trim() === "stopped";
}

async function showWindowsFallback(message: string): Promise<void> {
  if (!(await openWisprFlow(NOTETAKER_URL))) return;
  await showToast({
    style: Toast.Style.Success,
    title: "Notetaker opened",
    message,
  });
}

export async function startNotetaker(): Promise<void> {
  if (process.platform === "win32") {
    await showWindowsFallback("Press Ctrl+N to start a recording");
    return;
  }
  if (await pressMeetingShortcut()) {
    await showToast({ style: Toast.Style.Success, title: "Notetaker started" });
    return;
  }
  await openWisprFlow(NOTETAKER_URL);
  const result = await runAppleScript(START_SCRIPT, { timeout: 15000 });
  if (result.trim() !== "started") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Wispr Flow did not come to the front",
      message: "Press ⌘N on the Notetaker page to start a recording",
    });
    return;
  }
  await showToast({ style: Toast.Style.Success, title: "Notetaker started" });
}

export async function stopNotetaker(): Promise<void> {
  if (process.platform === "win32") {
    await showWindowsFallback("Stop the recording in Wispr Flow");
    return;
  }
  if (await pressStopButton()) {
    await showToast({ style: Toast.Style.Success, title: "Notetaker stopped" });
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "No Notetaker recording found",
    message: "If one is running, stop it in Wispr Flow",
  });
}

export async function toggleNotetaker(): Promise<void> {
  if (process.platform === "win32") {
    await showWindowsFallback(
      "Press Ctrl+N to start, or stop the recording in Wispr Flow",
    );
    return;
  }
  if (await pressStopButton()) {
    await showToast({ style: Toast.Style.Success, title: "Notetaker stopped" });
    return;
  }
  await startNotetaker();
}

type MissingPermission = "accessibility" | "automation";

function getMissingPermission(error: unknown): MissingPermission | null {
  const message = String(error instanceof Error ? error.message : error);
  if (/-1743|not authori[sz]ed to send apple events/i.test(message)) {
    return "automation";
  }
  if (
    /-25211|-1719|\(1002\)|assistive access|not allowed to send keystrokes/i.test(
      message,
    )
  ) {
    return "accessibility";
  }
  return null;
}

const PRIVACY_SETTINGS_URLS: Record<MissingPermission, string> = {
  accessibility:
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  automation:
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
};

async function showNotetakerError(error: unknown): Promise<void> {
  const permission = getMissingPermission(error);
  if (!permission) {
    await showFailureToast(error, { title: "Notetaker command failed" });
    return;
  }
  await showFailureToast(error, {
    title:
      permission === "accessibility"
        ? "Raycast needs Accessibility access"
        : "Raycast needs permission to control System Events",
    message: "Allow it in System Settings, then try again",
    primaryAction: {
      title: "Open System Settings",
      onAction: async (toast) => {
        await open(PRIVACY_SETTINGS_URLS[permission]);
        await toast.hide();
      },
    },
  });
}

export async function runNotetakerCommand(
  action: () => Promise<void>,
): Promise<void> {
  try {
    if (!(await ensureWisprFlowInstalled())) return;
    await action();
  } catch (error) {
    await showNotetakerError(error);
  }
}
