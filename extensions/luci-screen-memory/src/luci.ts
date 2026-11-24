import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type LuciRecordingStatus =
  "recording" | "paused" | "unknown" | "offline";

export interface LuciState {
  running: boolean;
  status: LuciRecordingStatus;
  recording: boolean;
  description: string;
}

const GET_STATUS_SCRIPT = `
tell application "System Events"
  if not (exists process "Luci") then return "NOT_RUNNING"
  
  if (count of windows of process "Luci") is 0 then
    do shell script "open -g -a Luci"
    repeat 20 times
      delay 0.05
      if (count of windows of process "Luci") > 0 then exit repeat
    end repeat
    try
      set visible of process "Luci" to false
    end try
  end if

  tell process "Luci"
    if (count of windows) is 0 then return "WINDOW_ABSENT"
    tell window 1
      set allElements to entire contents of UI element 1
      repeat with el in allElements
        try
          if role of el is "AXButton" then
            set d to description of el
            if d starts with "Recording" or d contains "Screen Memory" then
              set isRec to (d starts with "Recording")
              return (isRec as string) & "::" & d
            end if
          end if
        end try
      end repeat
    end tell
  end tell
  return "BUTTON_NOT_FOUND"
end tell
`;

const TOGGLE_SCRIPT = `
tell application "System Events"
  if not (exists process "Luci") then return "NOT_RUNNING"
  
  if (count of windows of process "Luci") is 0 then
    do shell script "open -g -a Luci"
    repeat 20 times
      delay 0.05
      if (count of windows of process "Luci") > 0 then exit repeat
    end repeat
    try
      set visible of process "Luci" to false
    end try
  end if
  
  tell process "Luci"
    if (count of windows) is 0 then return "WINDOW_OPEN_FAILED"
    
    tell window 1
      set targetEl to missing value
      repeat 20 times
        try
          set allElements to entire contents of UI element 1
          repeat with el in allElements
            try
              if role of el is "AXButton" then
                set d to description of el
                if d contains "Recording" or d contains "Screen Memory" then
                  set targetEl to el
                  exit repeat
                end if
              end if
            end try
          end repeat
        end try
        if targetEl is not missing value then exit repeat
        delay 0.05
      end repeat
      
      if targetEl is missing value then return "BUTTON_NOT_FOUND"
      
      set initialDesc to description of targetEl
      perform action "AXPress" of targetEl
      
      set newDesc to initialDesc
      repeat 25 times
        delay 0.05
        try
          set allElementsAfter to entire contents of UI element 1
          repeat with el2 in allElementsAfter
            try
              if role of el2 is "AXButton" then
                set d2 to description of el2
                if (d2 starts with "Recording" or d2 contains "Screen Memory") and d2 is not initialDesc then
                  set newDesc to d2
                  exit repeat
                end if
              end if
            end try
          end repeat
        end try
        if newDesc is not initialDesc then exit repeat
      end repeat
      
      if newDesc is initialDesc then return "TOGGLE_UNCONFIRMED"
      
      set isRecordingNow to (newDesc starts with "Recording")
      return (isRecordingNow as string) & "::" & newDesc
    end tell
  end tell
end tell
`;

export async function getLuciStatus(): Promise<LuciState> {
  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      GET_STATUS_SCRIPT,
    ]);
    const trimmed = stdout.trim();

    if (trimmed === "NOT_RUNNING") {
      return {
        running: false,
        status: "offline",
        recording: false,
        description: "Luci is not running",
      };
    }

    if (trimmed === "WINDOW_ABSENT" || trimmed === "BUTTON_NOT_FOUND") {
      return {
        running: true,
        status: "unknown",
        recording: false,
        description:
          trimmed === "WINDOW_ABSENT"
            ? "Window not open"
            : "Controls not accessible",
      };
    }

    const [recStr, desc] = trimmed.split("::");
    const isRecording = recStr === "true";
    return {
      running: true,
      status: isRecording ? "recording" : "paused",
      recording: isRecording,
      description: desc,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errMsgLower = errMsg.toLowerCase();
    const isPermError =
      errMsg.includes("-1743") ||
      errMsg.includes("-25211") ||
      errMsg.includes("(-1728)") ||
      errMsgLower.includes("assistive") ||
      errMsgLower.includes("not allowed to send keystrokes") ||
      errMsgLower.includes("not authorized") ||
      errMsgLower.includes("not permitted");

    return {
      running: true,
      status: "unknown",
      recording: false,
      description: isPermError
        ? "Accessibility permission needed"
        : "Execution error",
    };
  }
}

export async function toggleLuciRecording(): Promise<{
  success: boolean;
  recording?: boolean;
  error?: string;
}> {
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", TOGGLE_SCRIPT]);
    const trimmed = stdout.trim();

    if (trimmed === "NOT_RUNNING")
      return { success: false, error: "Luci is not running" };
    if (trimmed === "WINDOW_OPEN_FAILED")
      return { success: false, error: "Could not initialize Luci window" };
    if (trimmed === "BUTTON_NOT_FOUND")
      return { success: false, error: "Toggle button not located" };
    if (trimmed === "TOGGLE_UNCONFIRMED") {
      return {
        success: false,
        error: "Toggle state unconfirmed — Luci did not update in time",
      };
    }

    const [recStr] = trimmed.split("::");
    return { success: true, recording: recStr === "true" };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errMsgLower = errMsg.toLowerCase();
    if (
      errMsg.includes("-1743") ||
      errMsg.includes("-25211") ||
      errMsgLower.includes("assistive") ||
      errMsgLower.includes("not authorized") ||
      errMsgLower.includes("not permitted")
    ) {
      return {
        success: false,
        error:
          "Accessibility permission needed for System Events in macOS System Settings",
      };
    }
    return {
      success: false,
      error: errMsg,
    };
  }
}

export async function openLuciApp(): Promise<void> {
  await execFileAsync("open", ["-a", "Luci"]);
}
