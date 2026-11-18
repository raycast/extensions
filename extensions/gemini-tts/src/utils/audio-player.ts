import { spawn, ChildProcess } from "child_process";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { execSync } from "child_process";
import { hasActiveSession } from "./session-lock";

const PID_FILE = join(tmpdir(), "gemini-tts.pid");
const STOP_FILE = join(tmpdir(), "gemini-tts.stop");

export interface PlayableAudio {
  wavPath: string;
  /** When true, the player deletes the file after playback (legacy temp). When false, the file is owned by the cache. */
  managed: boolean;
}

export class AudioPlayer {
  private currentProcess: ChildProcess | null = null;
  private tempFiles: string[] = [];
  private stopped = false;

  /**
   * Play a wav file. Accepts either a SynthesisResult-like object
   * ({wavPath, managed}) or a legacy base64 string for backward
   * compatibility with any callers that still produce raw audio.
   */
  async playAudio(audio: PlayableAudio | string, speed = 1): Promise<void> {
    const { path, managed } = this.resolveAudioSource(audio);

    return new Promise<void>((resolve, reject) => {
      const args = Number.isFinite(speed) && speed !== 1 ? ["-r", String(speed), path] : [path];
      const proc = spawn("afplay", args);
      this.currentProcess = proc;
      const myPid = proc.pid;

      writePidFile(myPid);

      proc.on("close", (code, signal) => {
        this.currentProcess = null;
        removePidFileIfMatch(myPid);
        if (managed) {
          this.cleanupFile(path);
        }

        // External stop (SIGTERM via stopExternalPlayback) leaves a STOP_FILE
        // behind. Treat that as a graceful stop instead of throwing, so the
        // outer command doesn't surface a confusing "afplay exited with code N".
        const externallyStopped = signal === "SIGTERM" || existsSync(STOP_FILE);

        if (this.stopped || code === 0 || code === null || externallyStopped) {
          resolve();
        } else {
          reject(new Error(`afplay exited with code ${code}`));
        }
      });

      proc.on("error", (err) => {
        this.currentProcess = null;
        removePidFileIfMatch(myPid);
        if (managed) {
          this.cleanupFile(path);
        }
        reject(err);
      });
    });
  }

  private resolveAudioSource(audio: PlayableAudio | string): { path: string; managed: boolean } {
    if (typeof audio === "string") {
      // Legacy base64 path — write a managed temp file.
      return { path: this.saveTempFile(audio), managed: true };
    }
    if (audio.managed) {
      this.tempFiles.push(audio.wavPath);
    }
    return { path: audio.wavPath, managed: audio.managed };
  }

  /**
   * Whether playback has been stopped.
   */
  isStopped(): boolean {
    return this.stopped;
  }

  /**
   * Stop the current playback.
   */
  stopPlayback(): void {
    this.stopped = true;
    if (this.currentProcess) {
      const proc = this.currentProcess;
      this.currentProcess = null;
      try {
        proc.kill("SIGTERM");
      } catch {
        // Process may already be dead
      }
    }
    removePidFile();
  }

  /**
   * Clean up all temp files and stop playback.
   */
  cleanup(): void {
    this.stopPlayback();
    for (const f of [...this.tempFiles]) {
      this.cleanupFile(f);
    }
    this.tempFiles = [];
  }

  private saveTempFile(base64Audio: string): string {
    const buffer = Buffer.from(base64Audio, "base64");
    if (buffer.length === 0) {
      throw new Error("Decoded audio data is empty");
    }
    const fileName = `gemini-tts-${randomUUID()}.wav`;
    const filePath = join(tmpdir(), fileName);
    writeFileSync(filePath, new Uint8Array(buffer));
    this.tempFiles.push(filePath);
    return filePath;
  }

  private cleanupFile(filePath: string): void {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {
      // ignore cleanup errors
    }
    this.tempFiles = this.tempFiles.filter((f) => f !== filePath);
  }
}

// ---- PID file helpers for cross-command stop ----

function writePidFile(pid: number | undefined): void {
  if (pid === undefined) return;
  try {
    writeFileSync(PID_FILE, String(pid), "utf8");
  } catch {
    // ignore
  }
}

function removePidFile(): void {
  try {
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
  } catch {
    // ignore
  }
}

/**
 * Remove the PID file only if it still contains the expected PID.
 * Prevents a race where process B writes a new PID after process A finishes.
 */
function removePidFileIfMatch(expectedPid: number | undefined): void {
  if (expectedPid === undefined) return;
  try {
    if (!existsSync(PID_FILE)) return;
    const current = parseInt(readFileSync(PID_FILE, "utf8").trim(), 10);
    if (current === expectedPid) {
      unlinkSync(PID_FILE);
    }
  } catch {
    // ignore
  }
}

/**
 * Stop any in-flight reading. Returns true if a stop signal was
 * delivered (either an afplay process was killed, or a mid-synthesis
 * session was asked to abort), false if nothing was running.
 *
 * Two cases the caller must distinguish:
 * 1. afplay is running → kill it with SIGTERM and write STOP_FILE.
 * 2. synthesis is running but no afplay yet → write STOP_FILE; the
 *    running session's loop will see hasExternalStopRequest() at the
 *    next chunk boundary and exit cleanly.
 *
 * Without case (2), pressing Quick Read during the lead chunk's
 * synthesis would launch a parallel reading instead of stopping.
 */
export function stopExternalPlayback(): boolean {
  // Case 1: afplay is running.
  if (existsSync(PID_FILE)) {
    try {
      writeStopRequest();
      const pidStr = readFileSync(PID_FILE, "utf8").trim();
      const pid = parseInt(pidStr, 10);
      if (isNaN(pid)) {
        removePidFile();
      } else {
        try {
          const comm = execSync(`ps -p ${pid} -o comm=`, { encoding: "utf8" }).trim();
          if (comm.includes("afplay")) {
            process.kill(pid, "SIGTERM");
            removePidFile();
            return true;
          }
        } catch {
          // PID gone — fall through to session-lock check
        }
        removePidFile();
      }
    } catch {
      removePidFile();
    }
  }

  // Case 2: synthesis-only window — no afplay yet, but a session lock
  // signals an active reader. Write STOP_FILE; the reader's chunk-
  // boundary check will pick it up and exit.
  if (hasActiveSession()) {
    writeStopRequest();
    return true;
  }

  return false;
}

export function clearExternalStopRequest(): void {
  try {
    if (existsSync(STOP_FILE)) {
      unlinkSync(STOP_FILE);
    }
  } catch {
    // ignore
  }
}

export function hasExternalStopRequest(): boolean {
  return existsSync(STOP_FILE);
}

function writeStopRequest(): void {
  try {
    writeFileSync(STOP_FILE, String(Date.now()), "utf8");
  } catch {
    // ignore
  }
}
