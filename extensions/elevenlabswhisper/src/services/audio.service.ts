import { spawn, type ChildProcessWithoutNullStreams, exec } from "node:child_process";
import { getPreferenceValues } from "@raycast/api";
import path from "node:path";
import type { Preferences } from "../types/preferences";

export class SoxError extends Error {
  constructor(
    message: string,
    public code?: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "SoxError";
  }
}

type CandidateSource = "homebrew-opt" | "homebrew-usr" | "path";

export const WAV_HEADER_SIZE = 44;

export type StartRecordingResult = {
  proc: ChildProcessWithoutNullStreams;
  outputPath: string;
};

const SOX_ARG_SEGMENTS: ReadonlyArray<readonly string[]> = [
  ["--no-show-progress"],
  ["-d"],
  ["-t", "wav"],
  ["--channels", "1"],
  ["--rate", "16000"],
  ["--encoding", "signed-integer"],
  ["--bits", "16"],
];

const SOX_BASE_ARGS = SOX_ARG_SEGMENTS.flatMap((segment) => [...segment]);

const SOX_PROCESS_MATCH_ARGS = SOX_ARG_SEGMENTS.map((segment) => segment.join(" "));

class AudioService {
  private soxPath: string | null = null;

  private async _checkSoxAvailable(pathOrCmd: string, timeoutMs = 1200): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(pathOrCmd, ["--version"]);
      const timer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          /* ignore */
        }
        reject(new SoxError("SoX check timed out", "SOX_CHECK_TIMEOUT"));
      }, timeoutMs);

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(new SoxError("Failed to spawn SoX.", "SOX_SPAWN_FAILED", err));
      });

      child.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new SoxError("SoX is not executable or returned a non-zero exit code.", "SOX_NOT_EXECUTABLE"));
      });
    });
  }

  private async _resolveSoxPath(): Promise<string> {
    if (this.soxPath) return this.soxPath;

    const prefs = getPreferenceValues<Preferences>();
    const prefPath = prefs?.soxExecutablePath?.trim();
    if (prefPath) {
      if (!path.isAbsolute(prefPath)) {
        throw new SoxError("Preference 'soxExecutablePath' must be an absolute path", "PREF_NOT_ABSOLUTE");
      }
      await this._checkSoxAvailable(prefPath);
      this.soxPath = prefPath;
      return prefPath;
    }

    const candidates: CandidateSource[] = ["homebrew-opt", "homebrew-usr", "path"];
    const candidatePaths: Record<CandidateSource, string> = {
      "homebrew-opt": "/opt/homebrew/bin/sox",
      "homebrew-usr": "/usr/local/bin/sox",
      path: "sox",
    };

    for (const c of candidates) {
      try {
        const soxCandPath = candidatePaths[c];
        await this._checkSoxAvailable(soxCandPath);
        this.soxPath = soxCandPath;
        return soxCandPath;
      } catch {
        // try next
      }
    }

    throw new SoxError(
      "SoX not found in common locations or PATH. Please install SoX or configure its path in preferences.",
      "SOX_NOT_FOUND",
    );
  }

  // Ensures SoX can be resolved and cached for future executions.
  async ensureSoxAvailable(): Promise<void> {
    await this._resolveSoxPath();
  }

  private async _cleanupOldSoxProcesses(): Promise<void> {
    try {
      const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        exec("pgrep -fl sox", (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve({ stdout, stderr });
        });
      });

      const processes = stdout.split("\n").filter(Boolean);
      let killedCount = 0;

      for (const processLine of processes) {
        if (this._isOurSoxProcess(processLine)) {
          const pid = Number.parseInt(processLine.split(" ")[0]);
          if (!Number.isNaN(pid)) {
            try {
              process.kill(pid, "SIGTERM");
              await new Promise((resolve) => setTimeout(resolve, 100));

              try {
                process.kill(pid, "SIGKILL");
                console.log(`Cleaned up orphaned SoX processes, pid=${pid}`);
              } catch {
                // Process already exited
              }
              killedCount++;
            } catch (error) {
              console.warn(`Failed to kill process ${pid}:`, error);
            }
          }
        }
      }

      if (killedCount > 0) {
        console.log(`Cleaned up ${killedCount} orphaned SoX processes`);
      }
    } catch (error) {
      // It's expected when pgrep doesn't find a sox process
      if (
        error instanceof Error &&
        (error.message.includes("No such process") || error.message.includes("no process found"))
      ) {
        return;
      }
      console.warn("Error cleaning up old sox processes:", error);
    }
  }

  private _isOurSoxProcess(processLine: string): boolean {
    return SOX_PROCESS_MATCH_ARGS.every((arg) => processLine.includes(arg));
  }

  async start(options: { outputPath: string }): Promise<StartRecordingResult> {
    // Clean up old SoX processes first
    await this._cleanupOldSoxProcesses();

    const { outputPath } = options;

    const args = [...SOX_BASE_ARGS, outputPath];

    const sox = await this._resolveSoxPath();
    const proc = spawn(sox, args, { detached: true });
    // Sox prints to stderr often; keep for debugging
    proc.stderr.on("data", (data) => console.log(`sox stderr: ${data}`));
    return { proc, outputPath };
  }

  private killChildGracefully(proc: ChildProcessWithoutNullStreams, timeoutMs = 800): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      proc.once("close", () => finish());
      // Try TERM to allow WAV header/footer to flush
      try {
        proc.kill("SIGTERM");
      } catch {
        /* ignore */
      }

      setTimeout(() => {
        if (done) return;
        try {
          proc.kill("SIGKILL");
        } catch {
          /* ignore */
        }
        // give a little time after SIGKILL
        setTimeout(() => finish(), 100);
      }, timeoutMs);
    });
  }

  async stop(proc: ChildProcessWithoutNullStreams): Promise<void> {
    await this.killChildGracefully(proc);
  }

  async cancel(proc: ChildProcessWithoutNullStreams): Promise<void> {
    await this.killChildGracefully(proc, 300);
  }
}

export const audioService = new AudioService();
