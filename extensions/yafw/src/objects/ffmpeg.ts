import { exec } from "child_process";
import path from "path";
import { Binary } from "../abstractions";
import { FFMPEG_BINARY_CUSTOM_PATH, PATH } from "../constants";
import { sanitizeFileName } from "../utils";
import { Ffprobe } from "./ffprobe";
import { FsBinary } from "./fs.binary";

export class FfmpegBinaryNotFoundException extends Error {}

/**
 * Ffmpeg wrapper
 */
export class Ffmpeg {
  private readonly ffmpegBinary: Binary;

  constructor(
    private readonly ffprobe: Ffprobe,
    private readonly callbacks?: {
      onProgressChange?: (progress: number) => void;
    },
    ffmpegBinary?: Binary,
  ) {
    this.ffmpegBinary =
      ffmpegBinary ??
      new FsBinary(
        // @TODO: refactor to remove path from strict dependencies here
        [...PATH.split(":"), path.dirname(FFMPEG_BINARY_CUSTOM_PATH)].filter((p) => !!p).join(":"),
        "ffmpeg",
      );
  }

  /**
   * @todo add validations for params?
   */
  exec: (payload: { input: string; output?: string; params?: (string | undefined)[] }) => Promise<void> = async (
    payload,
  ) => {
    const { input, params, output } = payload;

    if (input === output) {
      throw new Error("Cannot override source");
    }

    if (input.includes("ffmpeg")) {
      throw new Error("Path to ffmpeg command included automatically. Start your command directly from arguments");
    }

    if (this.ffmpegBinary.exists() === false) {
      throw new FfmpegBinaryNotFoundException();
    }

    const durationInSeconds = await this.ffprobe.exec({
      input,
      params: ["-v error", "-show_entries format=duration", "-of default=noprint_wrappers=1:nokey=1"],
    });

    return new Promise<void>((resolve, reject) => {
      // @NOTE: ffmpeg uses nanoseconds as milliseconds for some reason
      const durationInMilliseconds = parseFloat(durationInSeconds) * 1000 * 1000;

      const command = this.ffmpegBinary.command(
        [
          "-y",
          `-i ${sanitizeFileName(input)}`,
          ...(params ?? []),
          output ? "-progress pipe:1" : undefined,
          output ? sanitizeFileName(output) : undefined,
        ]
          .filter((param) => param != null)
          .join(" "),
      );
      const ffmpegProcess = exec(command);

      ffmpegProcess.stderr?.on("data", (data) => {
        console.log("ffmpeg stderr", data);
      });

      /**
       * Ffmpeg logs the progress as follows:
       * frame=266 fps=240.97 stream_0_0_q=-1.0 bitrate= 254.7kbits/s total_size=140098 out_time_us=4400000 out_time_ms=4400000 out_time=00:00:04.400000 dup_frames=0 drop_frames=0 speed=3.99x progress=continue
       * frame=266 fps=240.97 stream_0_0_q=-1.0 bitrate= 254.7kbits/s total_size=140098 out_time_us=4400000 out_time_ms=4400000 out_time=00:00:04.400000 dup_frames=0 drop_frames=0 speed=3.99x progress=end
       */
      ffmpegProcess.stdout?.on("data", (data) => {
        console.log("ffmpeg stdout", data);
        const parts = (data as string).split("\n");
        let outTimeMs: string | undefined;

        for (const part of parts) {
          if (part.includes("out_time_ms=")) {
            outTimeMs = part.split("=")[1];
          }
        }

        if (outTimeMs != null) {
          // @NOTE: handle rare cases when parse happen incorrectly
          const parsed = parseFloat(outTimeMs);
          if (Number.isNaN(parsed)) {
            return;
          }

          this.callbacks?.onProgressChange?.(parseFloat(outTimeMs) / durationInMilliseconds);
        }
      });

      ffmpegProcess.on("error", (error) => {
        console.error("ffmpeg process error:", error);
        reject(error);
      });

      ffmpegProcess.on("exit", (code, signal) => {
        if (code === 0) {
          console.log("Video creation completed successfully.");
          resolve();
        } else {
          console.error(`ffmpeg process exited with code ${code} and signal ${signal}`);
          reject(new Error(`ffmpeg process exited with code ${code} and signal ${signal}`));
        }
      });
    });
  };
}
