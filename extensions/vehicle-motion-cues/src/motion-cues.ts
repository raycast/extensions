import { environment, open, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
type Operation = "on" | "off" | "toggle" | "status";
type State = { enabled: boolean; mode: number; requested: boolean | null };

async function control(operation: Operation): Promise<State> {
  let output: string;
  try {
    const result = await execute(
      "/usr/bin/osascript",
      ["-l", "JavaScript", join(environment.assetsPath, "motion-cues.js"), operation],
      { timeout: 10000, maxBuffer: 64 * 1024, encoding: "utf8" },
    );
    output = result.stdout;
  } catch {
    throw new Error("macOS could not run its motion control. Check that Vehicle Motion Cues is available on your Mac.");
  }

  let state: unknown;
  try {
    state = JSON.parse(output);
  } catch {
    throw new Error("macOS returned an unexpected motion-cue response.");
  }
  if (state && typeof state === "object") {
    if ("error" in state && typeof state.error === "string") throw new Error(state.error);
    if (
      "enabled" in state &&
      typeof state.enabled === "boolean" &&
      "mode" in state &&
      typeof state.mode === "number" &&
      "requested" in state &&
      (state.requested === null || typeof state.requested === "boolean")
    ) {
      return { enabled: state.enabled, mode: state.mode, requested: state.requested };
    }
  }
  throw new Error("macOS returned an unexpected motion-cue response.");
}

export async function runMotionCues(operation: Exclude<Operation, "status">) {
  try {
    const requested = await control(operation);
    const expected = requested.requested;
    if (expected === null) throw new Error("macOS did not return a requested motion-cue state.");
    const expectedMode = expected ? 1 : 2;
    if (requested.enabled !== expected || requested.mode !== expectedMode) {
      throw new Error("macOS did not apply the requested motion-cue setting.");
    }
    // Check in a new process: the setter's process can see a cached state even
    // if macOS refused to persist the change (for example, in a sandbox).
    const saved = await control("status");
    if (saved.enabled !== expected || saved.mode !== expectedMode) {
      throw new Error("macOS did not save the change. Check Accessibility in System Settings.");
    }
    await showHUD(`Vehicle Motion Cues: ${saved.enabled ? "On" : "Off"}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Change Vehicle Motion Cues",
      message: error instanceof Error ? error.message : "An unexpected error occurred.",
      primaryAction: {
        title: "Open Accessibility Settings",
        onAction: () => open("x-apple.systempreferences:com.apple.Accessibility-Settings.extension"),
      },
    });
  }
}
