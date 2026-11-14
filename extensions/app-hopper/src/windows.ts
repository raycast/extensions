import { homedir } from "node:os";
import path from "node:path";
import { execBinary, OSA_TIMEOUT_MS, runAppleScript } from "./helpers/applescript";
import { runNativeHelper } from "./helpers/native-helper";
import { BaseWindow, WindowState, sortWindows } from "./helpers/window-utils";

export interface Window extends BaseWindow {
  "has-ax-reference"?: boolean;
  subrole?: string;
  documentUrl?: string;
  bundlePath?: string;
  localizedName?: string;
}

export interface AXWindow extends WindowState {
  pid: number;
  /** Position in System Events' complete window collection (1-based). */
  index: number;
  title: string;
  subrole: string;
  /** Duplicate title/subrole in the original snapshot cannot be safely raised by index. */
  isAmbiguous?: boolean;
}

export interface RunningAppMetadata {
  pid: number;
  bundlePath?: string;
  localizedName?: string;
  isHidden?: boolean;
}

export interface AppGroup {
  id: string;
  name: string;
  bundlePath?: string;
  pids: number[];
  isHidden?: boolean;
  windows: Window[];
}

const SUPPORT_DIR = path.join(homedir(), "Library/Application Support/raycast-app-hopper");
const FIELD_SEPARATOR = "\u001f";
const RECORD_SEPARATOR = "\u001e";

export function sameWindow(a: Window, b: Window): boolean {
  return a.id === b.id && a.pid === b.pid && a.app === b.app;
}

export async function focusNativeWindowById(id: number, pid?: number): Promise<void> {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid window ID");
  }
  const args = ["focus", String(id)];
  if (pid !== undefined && Number.isSafeInteger(pid) && pid > 0) {
    args.push(String(pid));
  }
  await runNativeHelper("macos-windows", SUPPORT_DIR, args);
}

/** Activates an existing process without reopening it or choosing one of its windows. */
export async function activateRunningApplication(pid: number): Promise<void> {
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("Invalid application PID");
  await runAppleScript(
    `
      ObjC.import("AppKit");
      var app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(${pid});
      if (!app || app.terminated) throw new Error("Application is no longer running. Refresh the list.");
      if (app.hidden) app.unhide;
      app.activateWithOptions($.NSApplicationActivateIgnoringOtherApps);
      var deadline = $.NSProcessInfo.processInfo.systemUptime + 1.5;
      while (!app.active && $.NSProcessInfo.processInfo.systemUptime < deadline) {
        $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.03));
      }
      if (!app.active) throw new Error("Application did not become focused. Try again.");
    `,
    "JavaScript",
  );
}

/**
 * Fetches the native macOS window snapshot via CoreGraphics + Accessibility.
 * Windows without an Accessibility reference are marked with `has-ax-reference: false`.
 */
export async function queryWindows(): Promise<Window[]> {
  const stdout = await runNativeHelper("macos-windows", SUPPORT_DIR, ["list"]);
  const data: unknown = JSON.parse(stdout || "[]");
  if (!Array.isArray(data)) {
    throw new Error("Invalid native window response");
  }
  return sortWindows(data as Window[]);
}

/** Regular running apps remain selectable even after their last window is closed. */
export async function getRunningApplications(): Promise<RunningAppMetadata[]> {
  const stdout = await runNativeHelper("macos-windows", SUPPORT_DIR, ["applications"]);
  const data: unknown = JSON.parse(stdout || "[]");
  if (!Array.isArray(data)) throw new Error("Invalid running application response");
  return data.filter(
    (app): app is RunningAppMetadata =>
      app && Number.isSafeInteger(app.pid) && app.pid > 0 && typeof app.localizedName === "string",
  );
}

/**
 * Resolves app metadata for all PIDs in one JXA process.
 * Bundle paths distinguish nested apps reliably.
 */
export async function getRunningApplicationMetadata(pids: number[]): Promise<Record<number, RunningAppMetadata>> {
  const validPids = pids.filter((pid) => Number.isSafeInteger(pid) && pid > 0);
  if (validPids.length === 0) return {};

  const script = `
    ObjC.import("AppKit");

    function toString(value) {
      if (value === null || value === undefined) return null;
      try {
        var text = ObjC.unwrap(value);
        return typeof text === "string" ? text : null;
      } catch (error) {
        return null;
      }
    }

    function run() {
      var pids = ${JSON.stringify(validPids)};
      var result = [];

      for (var i = 0; i < pids.length; i++) {
        var pid = pids[i];
        try {
          var app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(pid);
          if (!app) continue;

          var url = app.bundleURL;
          result.push({
            pid: pid,
            bundlePath: url ? toString(url.path) : null,
            localizedName: toString(app.localizedName)
          });
        } catch (error) {
          // One missing process must not break the entire query.
        }
      }

      return JSON.stringify(result);
    }
  `;

  const stdout = await runAppleScript(script, "JavaScript");
  const parsed: unknown = JSON.parse(stdout);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid application metadata response");
  }

  const metadata: Record<number, RunningAppMetadata> = {};
  for (const value of parsed) {
    if (!value || typeof value !== "object") continue;

    const item = value as Partial<RunningAppMetadata>;
    if (typeof item.pid !== "number" || !Number.isSafeInteger(item.pid)) continue;

    metadata[item.pid] = {
      pid: item.pid,
      bundlePath: typeof item.bundlePath === "string" ? item.bundlePath : undefined,
      localizedName: typeof item.localizedName === "string" ? item.localizedName : undefined,
    };
  }

  return metadata;
}

/**
 * Reads real AXWindow objects from System Events.
 * Used as a fallback when a process has windows without direct AX references.
 */
export async function queryAXWindows(pid: number): Promise<AXWindow[]> {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new Error("Invalid application PID");
  }

  const script = `
    tell application "System Events"
      set targetProcess to first application process whose unix id is ${pid}

      tell targetProcess
        set allWindows to every window
        set outputText to ""
        set hiddenFlag to ""
        try
          set hiddenFlag to ((not (visible of targetProcess)) as text)
        end try

        repeat with i from 1 to (count of allWindows)
          set targetWindow to item i of allWindows
          set windowRole to ""
          set windowSubrole to ""
          set windowTitle to ""
          set minimizedFlag to ""

          try
            set windowRole to (role of targetWindow) as text
          end try
          try
            set windowSubrole to (subrole of targetWindow) as text
          end try
          try
            set windowTitle to (name of targetWindow) as text
          end try
          try
            set minimizedFlag to ((value of attribute "AXMinimized" of targetWindow) as text)
          end try

          if windowRole is "AXWindow" then
            set outputText to outputText & "v2" & (ASCII character 31) & (i as text) & (ASCII character 31) & windowSubrole & (ASCII character 31) & minimizedFlag & (ASCII character 31) & hiddenFlag & (ASCII character 31) & windowTitle & (ASCII character 30)
          end if
        end repeat

        return outputText
      end tell
    end tell
  `;

  const stdout = await runAppleScript(script);
  if (!stdout) return [];

  const windows = stdout
    .split(RECORD_SEPARATOR)
    .filter(Boolean)
    .map((record) => {
      const rawFields = record.split(FIELD_SEPARATOR);
      const hasState = rawFields[0] === "v2";
      const fields = hasState ? rawFields.slice(1) : rawFields;
      if (fields.length < (hasState ? 5 : 3)) {
        throw new Error("Invalid Accessibility window response");
      }

      const index = Number(fields[0]);
      if (!Number.isSafeInteger(index) || index <= 0) {
        throw new Error("Invalid Accessibility window index");
      }

      return {
        pid,
        index,
        subrole: fields[1],
        title: fields.slice(hasState ? 4 : 2).join(FIELD_SEPARATOR),
        ...(hasState
          ? {
              isMinimized: fields[2] === "true" ? true : fields[2] === "false" ? false : undefined,
              isHidden: fields[3] === "true" ? true : fields[3] === "false" ? false : undefined,
            }
          : {}),
      };
    });
  return windows.map((window) => ({
    ...window,
    isAmbiguous: windows.filter((other) => other.title === window.title && other.subrole === window.subrole).length > 1,
  }));
}

/**
 * Raises an existing AXWindow; this never calls `open -a` and does not
 * recreate a Tauri WebView. A stale index/title causes a safe failure.
 */
export async function raiseAXWindow(target: AXWindow): Promise<void> {
  if (
    !Number.isSafeInteger(target.pid) ||
    target.pid <= 0 ||
    !Number.isSafeInteger(target.index) ||
    target.index <= 0
  ) {
    throw new Error("Invalid Accessibility window target");
  }

  if (target.isAmbiguous || !target.title) {
    throw new Error("Window identity is ambiguous. Refresh the list.");
  }

  const latest = await queryAXWindows(target.pid);
  const stillExists = latest.some(
    (window) =>
      !window.isAmbiguous &&
      window.index === target.index &&
      window.title === target.title &&
      window.subrole === target.subrole,
  );

  if (!stillExists) {
    throw new Error("Window changed or closed. Refresh the list.");
  }

  const script = `
    tell application "System Events"
      set targetProcess to first application process whose unix id is ${target.pid}
      tell targetProcess
        set allWindows to every window
        if (count of allWindows) < ${target.index} then
          error "Window no longer exists"
        end if

        set matchingWindows to every window whose name is ${JSON.stringify(target.title)} and subrole is ${JSON.stringify(target.subrole)}
        if (count of matchingWindows) is not 1 then
          error "Window identity is ambiguous. Refresh the list."
        end if
        set targetWindow to item ${target.index} of allWindows
        if (name of targetWindow) is not ${JSON.stringify(target.title)} or (subrole of targetWindow) is not ${JSON.stringify(target.subrole)} then
          error "Window changed or closed. Refresh the list."
        end if
        try
          if (value of attribute "AXMinimized" of targetWindow) is true then
            set value of attribute "AXMinimized" of targetWindow to false
          end if
        end try
        set frontmost to true
        perform action "AXRaise" of targetWindow
      end tell
    end tell
  `;

  await runAppleScript(script);
}

/**
 * Requests the existing app to restore or open its UI through Launch Services.
 * Call only after confirming that no accessible window can be raised.
 */
export async function requestApplicationWindow(app: AppGroup): Promise<void> {
  const appTarget = app.bundlePath || app.name;
  if (!appTarget) {
    throw new Error("Application bundle could not be resolved");
  }

  await execBinary("/usr/bin/open", ["-a", appTarget], {
    timeout: OSA_TIMEOUT_MS,
  });
}
