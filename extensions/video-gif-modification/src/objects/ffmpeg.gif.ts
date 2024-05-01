import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import { File, Gif } from "../abstractions";
import { Ffmpeg } from "./ffmpeg";

export class FfmpegGif implements Gif {
  constructor(
    private readonly ffmpeg: Ffmpeg,
    private readonly file: File,
  ) {}

  encode: Gif["encode"] = async (options = {}) => {
    const { width, height } = options;

    const filePath = this.file.path();
    const sourceDirPath = path.dirname(filePath);
    const targetFilePath = path.join(sourceDirPath, this.file.nextName({ extension: ".gif" }));
    const baseFolderPath = environment.supportPath;
    // @TODO: provide through properties or arguments
    const frameRate = 30;

    try {
      await this.ffmpeg.exec({
        input: filePath,
        params: [`-vf "fps=${frameRate},palettegen=stats_mode=diff"`],
        output: `${baseFolderPath}/palette.png`,
      });
      await this.ffmpeg.exec({
        input: filePath,
        params: [
          !!width && !height ? `-vf scale=${width}:-2` : undefined,
          !width && !!height ? `-vf scale=-2:${height}` : undefined,
          !!width && !!height ? `-vf scale=${width}:${height}` : undefined,
        ],
        output: targetFilePath,
      });
    } finally {
      fs.rmSync(`${baseFolderPath}/palette.png`);
    }
  };
}
