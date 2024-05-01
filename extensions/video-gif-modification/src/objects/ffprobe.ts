import { execSync } from "child_process";
import os from "os";
import path from "path";
import { FsBinary } from "./fs.binary";

/**
 * Ffprobe wrapper
 */
export class Ffprobe {
  /**
   * We get the file from a custom site with static ffprobe builds. Because it includes builds for Apple silicon.
   * The official ffmpeg.org site does not include builds for silicon chip.
   */
  private readonly ffprobeBinary: FsBinary;

  constructor(
    private readonly callbacks?: {
      onProgressChange?: (progress: number) => void;
      onStatusChange?: (status: string) => void;
    },
  ) {
    this.ffprobeBinary =
      os.arch() === "arm64"
        ? new FsBinary(
            {
              name: "ffprobe",
              sha256: "307e09bc01bd72bde5f441a1a6df68769da3b2b6e431accfbfc9cf3893ad00c4",
              url: "https://www.osxexperts.net/ffprobe7arm.zip",
            },
            callbacks?.onStatusChange,
          )
        : new FsBinary(
            {
              name: "ffprobe",
              sha256: "84f59cfffb6180dcf2676d7e835958823785d5e0894edf9f10c5e823fbc28614",
              url: "https://www.osxexperts.net/ffprobe7intel.zip",
            },
            callbacks?.onStatusChange,
          );
  }

  /**
   * @todo add validations for params?
   */
  exec: (payload: { input: string; params?: (string | undefined)[] }) => Promise<string> = async (payload) => {
    const { input, params } = payload;

    const binary = await this.ffprobeBinary.path();

    if (input.includes("ffprobe")) {
      throw new Error("Path to ffprobe command included automatically. Start your command directly from arguments");
    }

    this.callbacks?.onStatusChange?.(`Processing ${path.basename(input)}`);
    // ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp4
    const command = [`"${binary}"`, ...(params ?? []), `"${input}"`].filter((param) => param != null).join(" ");
    const result = execSync(command);
    return result.toString();
  };
}
