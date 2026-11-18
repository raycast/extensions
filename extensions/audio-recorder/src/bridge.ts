import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { startRecorder, recorderCommand } from "swift:../swift/audio-recorder";
import { readWorkerStatus, commandResult } from "./status";
import type { Mode, RecorderStatus } from "./status";
export { idle } from "./status";
export type { Mode, State, RecorderStatus } from "./status";
export const modes: { value: Mode; title: string }[] = [
  { value: "both", title: "Microphone + System Audio" },
  { value: "system", title: "System Audio" },
  { value: "microphone", title: "Microphone" },
];
export function preferences() {
  const values = getPreferenceValues<Preferences>();
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
  return readWorkerStatus(stateRoot);
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
  const response = commandResult(stdout);
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
