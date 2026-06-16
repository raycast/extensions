import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

const SOX_CANDIDATES = ["/opt/homebrew/bin/sox", "/usr/local/bin/sox", "/usr/bin/sox", "sox"];
const MIN_AUDIO_BYTES = 8 * 1024;
const GRACEFUL_STOP_TIMEOUT_MS = 5_000;
const TERMINATE_TIMEOUT_MS = 2_000;
const KILL_TIMEOUT_MS = 1_000;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
let cachedSoxExecutable: string | undefined;

export interface AudioRecordingSession {
  process: ChildProcess;
  filePath: string;
  soxPath: string;
  startedAt: number;
  stopRequested: boolean;
  stderr: string;
}

export class AudioRecordingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioRecordingError";
  }
}

export async function startAudioRecording(parentDirectory: string): Promise<AudioRecordingSession> {
  const soxPath = await findSoxExecutable();
  if (!soxPath) {
    throw new AudioRecordingError("SoX is not installed. Install it with `brew install sox`.");
  }

  const recordingsDirectory = join(parentDirectory, "recordings");
  await mkdir(recordingsDirectory, { recursive: true });

  const filePath = join(recordingsDirectory, recordingFilename());
  const child = spawn(soxPath, buildSoxArguments(filePath), {
    stdio: ["ignore", "ignore", "pipe"],
  });
  const session: AudioRecordingSession = {
    process: child,
    filePath,
    soxPath,
    startedAt: Date.now(),
    stopRequested: false,
    stderr: "",
  };

  child.stderr?.on("data", (chunk: Buffer) => {
    session.stderr = `${session.stderr}${chunk.toString("utf8")}`.slice(-4_000);
  });

  try {
    await waitForSpawn(child);
    return session;
  } catch (error) {
    if (cachedSoxExecutable === soxPath) {
      cachedSoxExecutable = undefined;
    }
    await removeAudioFile(filePath);
    throw new AudioRecordingError(`Could not access the microphone: ${errorMessage(error)}`);
  }
}

export async function stopAudioRecording(session: AudioRecordingSession): Promise<string> {
  session.stopRequested = true;

  try {
    await terminateProcess(session.process, "SIGINT");
    await validateAudioFile(session.filePath, session.soxPath);
    return session.filePath;
  } catch (error) {
    await removeAudioFile(session.filePath);
    throw error;
  }
}

export async function cancelAudioRecording(session: AudioRecordingSession): Promise<void> {
  session.stopRequested = true;

  try {
    await terminateProcess(session.process, "SIGINT");
  } catch (error) {
    console.error("Failed to stop audio recording during cleanup", error);
  } finally {
    await removeAudioFile(session.filePath);
  }
}

export async function removeAudioFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (!isMissingFileError(error)) {
      console.error("Failed to remove temporary audio file", error);
    }
  }
}

export async function findSoxExecutable(): Promise<string | undefined> {
  if (cachedSoxExecutable) {
    return cachedSoxExecutable;
  }

  for (const candidate of SOX_CANDIDATES) {
    if (candidate.includes("/")) {
      try {
        await access(candidate);
      } catch {
        continue;
      }
    }

    if (await commandSucceeds(candidate, ["--version"])) {
      cachedSoxExecutable = candidate;
      return candidate;
    }
  }

  return undefined;
}

export function buildSoxArguments(filePath: string): string[] {
  return ["-q", "-d", "-t", "wav", "-r", "16000", "-c", "1", "-b", "16", filePath];
}

export function formatRecordingDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

async function validateAudioFile(filePath: string, soxPath: string): Promise<void> {
  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch {
    throw new AudioRecordingError("The audio file was not created.");
  }

  if (fileStats.size < MIN_AUDIO_BYTES) {
    throw new AudioRecordingError("The recording is too short. Record a little longer and try again.");
  }

  if (fileStats.size >= MAX_AUDIO_BYTES) {
    throw new AudioRecordingError("The recording reached the API's 25 MB limit.");
  }

  if (!(await commandSucceeds(soxPath, [filePath, "-n", "stat"]))) {
    throw new AudioRecordingError("The recorded audio file is invalid.");
  }
}

function recordingFilename(): string {
  return `voice-translation-${new Date().toISOString().replace(/[:.]/g, "-")}.wav`;
}

function waitForSpawn(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSpawn = () => {
      child.off("error", onError);
      resolve();
    };
    const onError = (error: Error) => {
      child.off("spawn", onSpawn);
      reject(error);
    };

    child.once("spawn", onSpawn);
    child.once("error", onError);
  });
}

function terminateProcess(child: ChildProcess, signal: NodeJS.Signals): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let terminateTimer: NodeJS.Timeout | undefined;
    let killTimer: NodeJS.Timeout | undefined;
    const gracefulTimer = setTimeout(() => {
      if (child.exitCode !== null || child.signalCode !== null) {
        finish();
        return;
      }

      child.kill("SIGTERM");
      terminateTimer = setTimeout(() => {
        if (child.exitCode !== null || child.signalCode !== null) {
          finish();
          return;
        }

        child.kill("SIGKILL");
        killTimer = setTimeout(() => {
          fail(new AudioRecordingError("The recording process did not stop correctly."));
        }, KILL_TIMEOUT_MS);
      }, TERMINATE_TIMEOUT_MS);
    }, GRACEFUL_STOP_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(gracefulTimer);
      if (terminateTimer) {
        clearTimeout(terminateTimer);
      }
      if (killTimer) {
        clearTimeout(killTimer);
      }
      child.off("close", finish);
      child.off("error", onError);
    };
    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };
    const fail = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    };
    const onError = (error: Error) => {
      fail(error);
    };

    child.once("close", finish);
    child.once("error", onError);

    if (!child.kill(signal)) {
      if (child.exitCode !== null || child.signalCode !== null) {
        finish();
      } else {
        fail(new AudioRecordingError("Could not stop the recording process."));
      }
    }
  });
}

function commandSucceeds(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "ignore",
    });
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish(false);
    }, 5_000);
    const finish = (succeeded: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      child.off("error", onError);
      child.off("close", onClose);
      resolve(succeeded);
    };
    const onError = () => finish(false);
    const onClose = (code: number | null) => finish(code === 0);

    child.once("error", onError);
    child.once("close", onClose);
  });
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
