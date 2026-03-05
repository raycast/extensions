import { spawn, ChildProcess } from "child_process";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { execSync } from "child_process";

const PID_FILE = join(tmpdir(), "doubao-tts.pid");

export class AudioPlayer {
  private currentProcess: ChildProcess | null = null;
  private tempFiles: string[] = [];
  private stopped = false;

  /**
   * Play a single base64-encoded audio chunk.
   */
  async playAudio(base64Audio: string): Promise<void> {
    const tempPath = this.saveTempFile(base64Audio);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("afplay", [tempPath]);
      this.currentProcess = proc;
      const myPid = proc.pid;

      writePidFile(myPid);

      proc.on("close", (code) => {
        this.currentProcess = null;
        removePidFileIfMatch(myPid);
        this.cleanupFile(tempPath);

        if (this.stopped || code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`afplay exited with code ${code}`));
        }
      });

      proc.on("error", (err) => {
        this.currentProcess = null;
        removePidFileIfMatch(myPid);
        this.cleanupFile(tempPath);
        reject(err);
      });
    });
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
    const fileName = `doubao-tts-${randomUUID()}.mp3`;
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
 * Read the PID from the PID file and kill the afplay process.
 * Validates the PID belongs to afplay before killing to avoid
 * killing unrelated processes (TOCTOU mitigation).
 */
export function stopExternalPlayback(): boolean {
  try {
    if (!existsSync(PID_FILE)) {
      return false;
    }
    const pidStr = readFileSync(PID_FILE, "utf8").trim();
    const pid = parseInt(pidStr, 10);
    if (isNaN(pid) || pid <= 0) {
      removePidFile();
      return false;
    }

    // Verify the PID belongs to afplay before killing
    try {
      const comm = execSync(`ps -p ${pid} -o comm=`, {
        encoding: "utf8",
        timeout: 1000, // 1 second timeout to prevent hanging
      }).trim();
      if (!comm.includes("afplay")) {
        removePidFile();
        return false;
      }
    } catch {
      // If ps fails (timeout, invalid PID, etc.), assume PID is invalid/stale
      removePidFile();
      return false;
    }

    process.kill(pid, "SIGTERM");
    removePidFile();
    return true;
  } catch {
    removePidFile();
    return false;
  }
}
