import { spawn, ChildProcess } from "child_process";
import { existsSync, unlinkSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";
import { getEnhancedEnv } from "./env-path";

export class AudioRecorder {
  private process: ChildProcess | null = null;
  private outputPath: string;
  private startTime: number = 0;
  private useSox: boolean = true;

  constructor(useSox: boolean = true) {
    this.useSox = useSox;
    // Create temp directory in extension support directory
    const tempDir = join(environment.supportPath, "temp");
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    this.outputPath = join(tempDir, `recording-${Date.now()}.wav`);
  }

  /**
   * Start audio recording
   */
  async start(sampleRate: number = 16000): Promise<void> {
    if (this.process) {
      throw new Error("Recording already in progress");
    }

    this.startTime = Date.now();

    if (this.useSox) {
      // SoX recording: rec -r 16000 -c 1 -b 16 output.wav
      this.process = spawn(
        "rec",
        ["-r", sampleRate.toString(), "-c", "1", "-b", "16", this.outputPath],
        {
          env: getEnhancedEnv(),
        },
      );
    } else {
      // FFmpeg recording: ffmpeg -f avfoundation -i ":0" -ar 16000 -ac 1 output.wav
      this.process = spawn(
        "ffmpeg",
        [
          "-f",
          "avfoundation",
          "-i",
          ":0",
          "-ar",
          sampleRate.toString(),
          "-ac",
          "1",
          "-y", // Overwrite if exists
          this.outputPath,
        ],
        {
          env: getEnhancedEnv(),
        },
      );
    }

    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error("Failed to start recording process"));
        return;
      }

      this.process.on("error", (error) => {
        reject(new Error(`Recording failed: ${error.message}`));
      });

      // Wait a bit to ensure recording started
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          resolve();
        } else {
          reject(new Error("Recording process terminated unexpectedly"));
        }
      }, 500);
    });
  }

  /**
   * Stop recording and return file path
   */
  async stop(): Promise<string> {
    if (!this.process) {
      throw new Error("No recording in progress");
    }

    return new Promise((resolve, reject) => {
      if (!this.process) {
        reject(new Error("No recording process"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Recording stop timeout"));
      }, 5000);

      this.process.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0 || code === null) {
          // Check if file was created
          if (existsSync(this.outputPath)) {
            resolve(this.outputPath);
          } else {
            reject(new Error("Recording file was not created"));
          }
        } else {
          reject(new Error(`Recording failed with code ${code}`));
        }
      });

      // Send SIGTERM to gracefully stop recording
      if (this.useSox) {
        this.process.kill("SIGTERM");
      } else {
        // FFmpeg requires 'q' to be sent to stdin for graceful stop
        this.process.stdin?.write("q");
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill("SIGTERM");
          }
        }, 1000);
      }

      this.process = null;
    });
  }

  /**
   * Cancel recording without saving
   */
  async cancel(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGKILL");
      this.process = null;
    }

    // Clean up file if it exists
    if (existsSync(this.outputPath)) {
      try {
        unlinkSync(this.outputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Get current recording duration in seconds
   */
  getDuration(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get output file path
   */
  getOutputPath(): string {
    return this.outputPath;
  }

  /**
   * Clean up audio file after use
   */
  static cleanup(filePath: string): void {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch (error) {
      console.error("Failed to cleanup audio file:", error);
    }
  }

  /**
   * Clean up all temp audio files
   */
  static cleanupAll(): void {
    try {
      const tempDir = join(environment.supportPath, "temp");
      if (existsSync(tempDir)) {
        const files = readdirSync(tempDir);
        files.forEach((file: string) => {
          if (file.startsWith("recording-") && file.endsWith(".wav")) {
            const filePath = join(tempDir, file);
            try {
              unlinkSync(filePath);
            } catch {
              // Ignore individual file errors
            }
          }
        });
      }
    } catch (error) {
      console.error("Failed to cleanup temp directory:", error);
    }
  }
}
