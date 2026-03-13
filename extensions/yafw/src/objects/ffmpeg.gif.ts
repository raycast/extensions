import { environment } from "@raycast/api";
import path from "path";
import { File, Gif } from "../abstractions";
import { Ffmpeg } from "./ffmpeg";
import { FsFile } from "./fs.file";

export class FfmpegGif implements Gif {
  constructor(
    private readonly ffmpeg: Ffmpeg,
    private readonly file: File,
  ) {}

  encode: Gif["encode"] = async (options = {}) => {
    const { width, height } = options;

    const filePath = this.file.path();
    const sourceDirPath = path.dirname(filePath);
    const targetGifPath = path.join(sourceDirPath, this.file.nextName({ extension: ".gif" }));
    const paletteFile = new FsFile(path.join(environment.supportPath, "palette.png"));
    // @TODO: provide through properties or arguments
    const frameRate = 30;

    try {
      await this.ffmpeg.exec({
        input: filePath,
        params: [`-vf "fps=${frameRate},palettegen=stats_mode=diff"`],
        output: paletteFile.path(),
      });
      await this.ffmpeg.exec({
        input: filePath,
        params: [
          !!width && !height ? `-vf scale=${width}:-2` : undefined,
          !width && !!height ? `-vf scale=-2:${height}` : undefined,
          !!width && !!height ? `-vf scale=${width}:${height}` : undefined,
        ],
        output: targetGifPath,
      });
    } finally {
      await paletteFile.remove();
    }
  };
}
