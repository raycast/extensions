import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import { File } from "../abstractions";
import { Ffmpeg } from "./ffmpeg";

export class Gif {
  constructor(
    private readonly file: File,
    private readonly ffmpeg: Ffmpeg,
  ) {}

  encode = async (
    options: {
      width?: number;
      height?: number;
    } = {},
  ) => {
    const { width, height } = options;

    const videoPath = this.file.path();
    const sourceDirPath = path.dirname(videoPath);
    const targetVideoPath = path.join(sourceDirPath, this.file.nextName({ extension: ".gif" }));
    const baseFolderPath = environment.supportPath;
    // @TODO: provide through properties or arguments
    const frameRate = 30;

    try {
      await this.ffmpeg.exec({
        input: videoPath,
        params: [`-vf "fps=${frameRate},palettegen=stats_mode=diff"`],
        output: `${baseFolderPath}/palette.png`,
      });
      await this.ffmpeg.exec({
        input: videoPath,
        params: [
          !!width && !height ? `-vf scale=${width}:-2` : undefined,
          !width && !!height ? `-vf scale=-2:${height}` : undefined,
          !!width && !!height ? `-vf scale=${width}:${height}` : undefined,
        ],
        output: targetVideoPath,
      });
    } finally {
      fs.rmSync(`${baseFolderPath}/palette.png`);
    }
  };
}
