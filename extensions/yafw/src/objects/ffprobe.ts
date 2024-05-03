import { execSync } from "child_process";
import path from "path";
import { Binary } from "../abstractions";
import { FFMPEG_BINARY_CUSTOM_PATH, PATH } from "../constants";
import { FsBinary } from "./fs.binary";
import { FsFolder } from "./fs.folder";

export class FfprobeBinaryNotFoundException extends Error {}

/**
 * Ffprobe wrapper
 */
export class Ffprobe {
  private readonly ffprobeBinary: Binary;

  constructor(ffprobeBinary?: Binary) {
    this.ffprobeBinary =
      ffprobeBinary ??
      new FsBinary(
        // @TODO: refactor to remove path from strict dependencies here
        [...PATH.split(":"), path.dirname(FFMPEG_BINARY_CUSTOM_PATH)].filter((p) => !!p).map((p) => new FsFolder(p)),
        "ffprobe",
      );
  }

  /**
   * @todo add validations for params?
   */
  exec: (payload: { input: string; params?: (string | undefined)[] }) => Promise<string> = async (payload) => {
    const { input, params } = payload;

    if (input.includes("ffprobe")) {
      throw new Error("Path to ffprobe command included automatically. Start your command directly from arguments");
    }

    if (this.ffprobeBinary.exists() === false) {
      throw new FfprobeBinaryNotFoundException();
    }

    // ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp4
    const command = this.ffprobeBinary.command(
      [...(params ?? []), `"${input}"`].filter((param) => param != null).join(" "),
    );
    const result = execSync(command);
    return result.toString();
  };
}
