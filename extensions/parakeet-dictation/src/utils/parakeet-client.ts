import { spawn } from "child_process";
import { readFileSync } from "fs";
import { dirname, basename } from "path";
import { TranscriptionResult } from "../types/transcription";
import { getEnhancedEnv } from "./env-path";

export interface ParakeetOptions {
  chunkDuration?: number;
  decodingMethod?: "greedy" | "beam";
  beamSize?: number;
  debugMode?: boolean;
}

export class ParakeetClient {
  private options: ParakeetOptions;

  constructor(options: ParakeetOptions = {}) {
    this.options = {
      chunkDuration: 120,
      decodingMethod: "greedy",
      beamSize: 3,
      debugMode: false,
      ...options,
    };
  }

  /**
   * Check if Parakeet is installed
   */
  static async checkInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn("which", ["parakeet-mlx"], {
        env: getEnhancedEnv(),
      });

      process.on("close", (code) => {
        resolve(code === 0);
      });

      process.on("error", () => {
        resolve(false);
      });
    });
  }

  /**
   * Get Parakeet version
   */
  static async getVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      const process = spawn("parakeet-mlx", ["--version"], {
        env: getEnhancedEnv(),
      });
      let output = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });

      process.on("error", () => {
        resolve(null);
      });
    });
  }

  /**
   * Transcribe audio file using Parakeet
   */
  async transcribe(
    audioPath: string,
    onProgress?: (progress: number) => void,
  ): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      // Get the directory where the audio file is located to save output there
      const outputDir = dirname(audioPath);

      const args = [
        audioPath,
        "--output-format",
        "json",
        "--output-dir",
        outputDir,
        "--chunk-duration",
        this.options.chunkDuration!.toString(),
        "--decoding",
        this.options.decodingMethod!,
      ];

      if (this.options.decodingMethod === "beam") {
        args.push("--beam-size", this.options.beamSize!.toString());
      }

      if (this.options.debugMode) {
        console.log("Parakeet command:", "parakeet-mlx", args.join(" "));
      }

      const process = spawn("parakeet-mlx", args, { env: getEnhancedEnv() });
      let errorOutput = "";
      let lastProgress = 0;

      process.stdout.on("data", (data) => {
        // Try to detect progress from output (if Parakeet outputs progress info)
        const progressMatch = data.toString().match(/(\d+)%/);
        if (progressMatch && onProgress) {
          const progress = parseInt(progressMatch[1], 10);
          if (progress > lastProgress) {
            lastProgress = progress;
            onProgress(progress);
          }
        }
      });

      process.stderr.on("data", (data) => {
        errorOutput += data.toString();
        if (this.options.debugMode) {
          console.error("Parakeet stderr:", data.toString());
        }

        // Check for progress in stderr as well
        const progressMatch = data.toString().match(/(\d+)%/);
        if (progressMatch && onProgress) {
          const progress = parseInt(progressMatch[1], 10);
          if (progress > lastProgress) {
            lastProgress = progress;
            onProgress(progress);
          }
        }
      });

      process.on("close", (code) => {
        if (code === 0) {
          try {
            // Parakeet writes to a JSON file, read it
            const outputDir = dirname(audioPath);
            const audioBasename = basename(audioPath, ".wav");
            const jsonPath = `${outputDir}/${audioBasename}.json`;

            const jsonContent = readFileSync(jsonPath, "utf-8");
            const result = this.parseParakeetOutput(jsonContent);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse transcription result: ${error}`));
          }
        } else {
          reject(
            new Error(
              `Transcription failed with code ${code}${errorOutput ? `: ${errorOutput}` : ""}`,
            ),
          );
        }
      });

      process.on("error", (error) => {
        reject(new Error(`Failed to start transcription: ${error.message}`));
      });
    });
  }

  /**
   * Parse Parakeet JSON output
   */
  private parseParakeetOutput(output: string): TranscriptionResult {
    try {
      // Parakeet outputs JSON, try to parse it
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON found, treat entire output as text
        const text = output.trim();
        return {
          text,
          wordCount: text.split(/\s+/).length,
        };
      }

      const data = JSON.parse(jsonMatch[0]);

      // Extract text and sentences from Parakeet format
      const text = data.text || "";
      const sentences = data.sentences || [];

      return {
        text,
        sentences,
        duration: data.duration,
        wordCount: text.split(/\s+/).filter((w: string) => w.length > 0).length,
      };
    } catch (error) {
      // Fallback: treat output as plain text
      const text = output.trim();
      return {
        text,
        wordCount: text.split(/\s+/).filter((w) => w.length > 0).length,
      };
    }
  }

  /**
   * Estimate transcription time based on audio duration
   * Returns estimated seconds (very rough approximation)
   */
  static estimateTranscriptionTime(audioDurationSeconds: number): number {
    // On M3, approximately 68x real-time speed
    // So 60 seconds audio takes ~0.88 seconds
    // Add some overhead for process startup
    return Math.max(2, audioDurationSeconds / 60);
  }
}
