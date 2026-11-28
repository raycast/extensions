import { open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import {
  ensureWisprFlowInstalled,
  openWisprFlow,
  WISPR_FLOW_BUNDLE_ID,
} from "./db";

export const NOTETAKER_URL = "wispr-flow://open/notetaker";

// Wispr Flow has no deep link that starts a recording, so press ⌘N on the Notetaker page once Wispr Flow is in front.
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
        if (class of e as text) is "button" and (description of e as text) is "Stop listening" then
          perform action "AXPress" of e
          return "stopped"
        end if
      end try
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
  await openWisprFlow(NOTETAKER_URL);
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
    await showToast({
      style: Toast.Style.Failure,
      title: "Notetaker command failed",
      message: String(error instanceof Error ? error.message : error),
    });
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
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
  if (!(await ensureWisprFlowInstalled())) return;
  try {
    await action();
  } catch (error) {
    await showNotetakerError(error);
  }
}
