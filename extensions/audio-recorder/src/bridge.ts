import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { startRecorder, recorderCommand } from "swift:../swift/audio-recorder";
export type Mode = "both" | "microphone" | "system";
export type State = "idle" | "starting" | "recording" | "paused" | "finalizing" | "error";
export interface RecorderStatus {
  state: State;
  mode: Mode;
  format: "m4a" | "wav";
  duration: number;
  peak: number;
  maximumPeak?: number;
  waveform?: number[];
  microphonePeak?: number;
  systemPeak?: number;
  microphoneName?: string;
  warning?: string;
  microphoneBuffers: number;
  systemBuffers: number;
  lateFrames: number;
  rejectedFrames: number;
  recoveryAvailable: boolean;
  updatedAt: number;
  pid: number;
  file?: string;
  error?: string;
}
export const idle: RecorderStatus = {
  state: "idle",
  mode: "both",
  format: "m4a",
  duration: 0,
  peak: 0,
  microphoneBuffers: 0,
  systemBuffers: 0,
  lateFrames: 0,
  rejectedFrames: 0,
  recoveryAvailable: false,
  updatedAt: 0,
  pid: 0,
};
export const modes: { value: Mode; title: string }[] = [
  { value: "both", title: "Microphone + System Audio" },
  { value: "system", title: "System Audio" },
  { value: "microphone", title: "Microphone" },
];
export function preferences() {
  const values = getPreferenceValues<{
    mode: Mode;
    format: "m4a" | "wav";
    outputFolder?: string;
    microphoneSource?: "default" | "built-in";
  }>();
  let folder = values.outputFolder || path.join(os.homedir(), "Documents", "Recordings");
  if (folder === "~" || folder.startsWith("~/")) folder = path.join(os.homedir(), folder.slice(2));
  return {
    mode: values.mode || "both",
    format: values.format || "m4a",
    microphoneSource: values.microphoneSource || "default",
    outputFolder: folder,
  };
}
const stateRoot = path.join(os.homedir(), "Library", "Application Support", "Audio Recorder");
export async function readStatus(): Promise<RecorderStatus> {
  try {
    const status = JSON.parse(await readFile(path.join(stateRoot, "status.json"), "utf8")) as RecorderStatus;
    if (!Number.isInteger(status.pid) || status.pid <= 0) return idle;
    try {
      process.kill(status.pid, 0);
    } catch {
      return { ...idle, recoveryAvailable: true };
    }
    if (Date.now() / 1000 - status.updatedAt > 10)
      return {
        ...status,
        state: "error",
        error: "Recorder is not responding. Check the helper before starting another recording.",
      };
    return status;
  } catch {
    return idle;
  }
}
export async function control(action: string, mode?: Mode): Promise<RecorderStatus> {
  if (process.arch !== "arm64") throw new Error("Audio Recorder currently supports Apple Silicon Macs only.");
  const status = await readStatus();
  if (status.pid === 0) {
    await mkdir(stateRoot, { recursive: true, mode: 0o700 });
    await startRecorder(stateRoot);
  }
  const prefs = preferences();
  const request = { action, ...(action === "start" ? { ...prefs, mode: mode || prefs.mode } : {}) };
  const stdout = await recorderCommand(stateRoot, JSON.stringify(request));
  const response = JSON.parse(stdout) as RecorderStatus;
  if (
    response.error &&
    response.state !== "finalizing" &&
    action !== "status" &&
    action !== "quit" &&
    action !== "monitor"
  )
    throw new Error(response.error);
  if (action === "start") {
    const folders = await knownFolders();
    await LocalStorage.setItem("recordingFolders", JSON.stringify([...new Set([prefs.outputFolder, ...folders])]));
  }
  return response;
}
export async function knownFolders(): Promise<string[]> {
  const saved = await LocalStorage.getItem<string>("recordingFolders");
  try {
    const parsed: unknown = JSON.parse(saved || "[]");
    return [
      ...new Set([
        preferences().outputFolder,
        ...(Array.isArray(parsed)
          ? parsed.filter((x): x is string => typeof x === "string" && path.isAbsolute(x))
          : []),
      ]),
    ];
  } catch {
    return [preferences().outputFolder];
  }
}
export function duration(seconds: number): string {
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, Math.floor(seconds) % 60]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
}
