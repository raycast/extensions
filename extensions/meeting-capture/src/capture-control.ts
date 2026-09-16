import {
  closeMainWindow,
  environment,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { DEFAULT_RECORDING_DIRECTORY } from "./constants.js";

const execFileAsync = promisify(execFile);
type Preferences = {
  outputDirectory: string;
  transcriptLanguage:
    "vietnamese" | "english" | "vietnamese-english" | "system-default";
};
type Phase =
  | "starting"
  | "recording"
  | "paused"
  | "finalizing"
  | "transcribing"
  | "stopped"
  | "permissionRequired"
  | "failed";
type State = {
  phase: Phase;
  pid: number;
  outputPath?: string;
  transcriptPath?: string;
  message?: string;
  requestID?: string;
  elapsedSeconds?: number;
};
export type CaptureAction = "start" | "pause" | "continue" | "stop" | "toggle";

function expandHome(value: string): string {
  if (value === "~") return process.env.HOME ?? value;
  return value.startsWith("~/")
    ? path.join(process.env.HOME ?? "", value.slice(2))
    : value;
}
async function readState(file: string): Promise<State | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as State;
  } catch {
    return undefined;
  }
}
async function alive(pid: number): Promise<boolean> {
  if (!Number.isSafeInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function waitFor(
  file: string,
  predicate: (state: State) => boolean,
  timeout = 15_000,
): Promise<State> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readState(file);
    if (state && predicate(state)) return state;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Meeting Capture did not acknowledge the command in time.");
}

export async function runCaptureAction(action: CaptureAction) {
  const preferences = getPreferenceValues<Preferences>();
  await closeMainWindow();
  const helperApp = path.join(
    environment.assetsPath,
    "MeetingCaptureHelper.app",
  );
  const helper = path.join(
    helperApp,
    "Contents",
    "MacOS",
    "MeetingCaptureHelper",
  );
  const stateFile = path.join(environment.supportPath, "capture-state.json");
  const controlDirectory = path.join(
    environment.supportPath,
    "control-requests",
  );
  const launchLock = path.join(environment.supportPath, "start.lock");
  try {
    await access(helper, constants.X_OK);
    await mkdir(environment.supportPath, { recursive: true });
    const current = await readState(stateFile);
    const active = current ? await alive(current.pid) : false;
    const effectiveAction: CaptureAction =
      action === "toggle"
        ? active &&
          (current?.phase === "recording" || current?.phase === "paused")
          ? "stop"
          : "start"
        : action;

    if (effectiveAction === "start") {
      if (
        active &&
        current &&
        [
          "starting",
          "recording",
          "paused",
          "finalizing",
          "transcribing",
        ].includes(current.phase)
      ) {
        await showHUD(`Meeting Capture is already ${current.phase}.`);
        return;
      }
      try {
        await mkdir(launchLock);
      } catch {
        await showHUD("Meeting Capture is already starting.");
        return;
      }
      try {
        await rm(controlDirectory, { recursive: true, force: true });
        await mkdir(controlDirectory, { recursive: true });
        await rm(stateFile, { force: true });
        await execFileAsync("/usr/bin/open", [
          "-n",
          helperApp,
          "--args",
          "record",
          "--output-directory",
          expandHome(
            preferences.outputDirectory.trim() || DEFAULT_RECORDING_DIRECTORY,
          ),
          "--state",
          stateFile,
          "--control-directory",
          controlDirectory,
          "--transcript-language",
          preferences.transcriptLanguage ?? "system-default",
        ]);
        const started = await waitFor(stateFile, (state) =>
          ["recording", "permissionRequired", "failed"].includes(state.phase),
        );
        if (started.phase !== "recording")
          throw new Error(started.message ?? "Recording did not start.");
        await showHUD("🔴 Meeting Capture started — system audio + microphone");
        return;
      } finally {
        await rm(launchLock, { recursive: true, force: true });
      }
    }

    if (!active || !current) {
      await showHUD(`Nothing to ${effectiveAction}; Meeting Capture is idle.`);
      return;
    }
    const allowed: Record<"pause" | "continue" | "stop", Phase[]> = {
      pause: ["recording"],
      continue: ["paused"],
      stop: ["recording", "paused"],
    };
    if (!allowed[effectiveAction].includes(current.phase)) {
      await showHUD(
        `${effectiveAction[0].toUpperCase()}${effectiveAction.slice(1)} is unavailable while ${current.phase}.`,
      );
      return;
    }
    const id = crypto.randomUUID();
    await writeFile(
      path.join(controlDirectory, `${Date.now()}-${id}.json`),
      JSON.stringify({ id, command: effectiveAction }),
      { flag: "wx" },
    );
    const acknowledged = await waitFor(
      stateFile,
      (state) => state.requestID === id || state.phase === "failed",
    );
    if (acknowledged.phase === "failed")
      throw new Error(acknowledged.message ?? "Meeting Capture failed.");
    const messages = {
      pause: "⏸ Meeting Capture paused",
      continue: "🔴 Meeting Capture continued",
      stop: "✅ MP3 finalizing — transcript will follow on-device",
    };
    await showHUD(messages[effectiveAction]);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Meeting Capture command failed",
      message: error instanceof Error ? error.message : String(error),
      primaryAction: {
        title: "Open Privacy Settings",
        onAction: () =>
          execFileAsync("/usr/bin/open", [
            "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
          ]),
      },
    });
  }
}
