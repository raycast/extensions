import { exec } from "child_process";
import os from "os";
import path from "path";
import { Binary } from "./binary";
import { Ffprobe } from "./ffprobe";

/**
 * Ffmpeg wrapper
 */
export class Ffmpeg {
  /**
   * We get the file from a custom site with static ffmpeg builds. Because it includes builds for Apple silicon.
   * The official ffmpeg.org site does not include builds for silicon chip.
   */
  private readonly ffmpegBinary: Binary;

  constructor(
    private readonly ffprobe: Ffprobe,
    private readonly callbacks?: {
      onProgressChange?: (progress: number) => void;
      onStatusChange?: (status: string) => void;
    },
  ) {
    this.ffmpegBinary =
      os.arch() === "arm64"
        ? new Binary(
            {
              name: "ffmpeg",
              sha256: "326895b16940f238d76e902fc71150f10c388c281985756f9850ff800a2f1499",
              url: "https://www.osxexperts.net/ffmpeg7arm.zip",
            },
            callbacks?.onStatusChange,
          )
        : new Binary(
            {
              name: "ffmpeg",
              sha256: "6a658787de8de14741acaedd14d5b81f7b44aef60711cbf7784208a2751933ec",
              url: "https://www.osxexperts.net/ffmpeg7intel.zip",
            },
            callbacks?.onStatusChange,
          );
  }

  /**
   * @todo add validations for params?
   */
  exec: (payload: { input: string; output: string; params?: (string | undefined)[] }) => Promise<void> = async (
    payload,
  ) => {
    const { input, params, output } = payload;

    if (input === output) {
      throw new Error("Cannot override source");
    }

    const binary = await this.ffmpegBinary.path();

    if (input.includes("ffmpeg")) {
      throw new Error("Path to ffmpeg command included automatically. Start your command directly from arguments");
    }

    const durationInSeconds = await this.ffprobe.exec({
      input,
      params: ["-v error", "-show_entries format=duration", "-of default=noprint_wrappers=1:nokey=1"],
    });

    return new Promise<void>((resolve, reject) => {
      this.callbacks?.onStatusChange?.(`Encoding ${path.basename(input)}`);

      // @NOTE: ffmpeg uses milliseconds as nanoseconds for some reason
      const durationInMilliseconds = parseFloat(durationInSeconds) * 1000 * 1000;

      const command = [`"${binary}"`, "-y", `-i "${input}"`, ...(params ?? []), "-progress pipe:1", `"${output}"`]
        .filter((param) => param != null)
        .join(" ");
      const ffmpegProcess = exec(command);

      /**
       * Ffmpeg logs the progress as follows:
       * frame=266 fps=240.97 stream_0_0_q=-1.0 bitrate= 254.7kbits/s total_size=140098 out_time_us=4400000 out_time_ms=4400000 out_time=00:00:04.400000 dup_frames=0 drop_frames=0 speed=3.99x progress=continue
       * frame=266 fps=240.97 stream_0_0_q=-1.0 bitrate= 254.7kbits/s total_size=140098 out_time_us=4400000 out_time_ms=4400000 out_time=00:00:04.400000 dup_frames=0 drop_frames=0 speed=3.99x progress=end
       */
      ffmpegProcess.stdout?.on("data", (data) => {
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
