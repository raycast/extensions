import { access, readFile } from "node:fs/promises";
import path from "node:path";

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
  commandError?: string;
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

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}

export async function readWorkerStatus(root: string, isAlive = processIsAlive): Promise<RecorderStatus> {
  async function inactive(): Promise<RecorderStatus> {
    try {
      await access(path.join(root, "session.json"));
      return { ...idle, recoveryAvailable: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return idle;
      throw error;
    }
  }
  let status: RecorderStatus;
  try {
    status = JSON.parse(await readFile(path.join(root, "status.json"), "utf8")) as RecorderStatus;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" || error instanceof SyntaxError) return inactive();
    throw error;
  }
  if (!Number.isInteger(status.pid) || status.pid <= 0 || !isAlive(status.pid)) return inactive();
  if (Date.now() / 1000 - status.updatedAt > 10) {
    return {
      ...status,
      state: "error",
      error: "Recorder is not responding. Check the helper before starting another recording.",
    };
  }
  return status;
}

/** Command rejection is independent of any warning/error retained by the recording. */
export function commandResult(stdout: string): RecorderStatus {
  const response = JSON.parse(stdout) as RecorderStatus;
  if (response.commandError) throw new Error(response.commandError);
  return response;
}
