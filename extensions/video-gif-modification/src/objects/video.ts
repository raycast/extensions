import path from "path";
import { File } from "../abstractions";
import { Ffmpeg } from "./ffmpeg";

export class Video {
  constructor(
    private readonly file: File,
    private readonly ffmpeg: Ffmpeg,
  ) {}

  encode = async (
    options: {
      preset?: "smallest-size" | "optimal" | "best-quality";
      width?: number;
      height?: number;
      format?: "mp4" | "webm" | "mov";
    } = {},
  ) => {
    const { preset, width, height, format } = options;

    const videoPath = this.file.path();
    const sourceDirPath = path.dirname(videoPath);
    const extension = format ? `.${format}` : path.extname(videoPath);
    const targetVideoPath = path.join(sourceDirPath, this.file.nextName({ extension }));

    const codec = extension === "webm" ? "libvpx-vp9" : "libx264";
    const bitrate = (() => {
      switch (preset) {
        case "best-quality": {
          return "10M";
        }
        case "optimal": {
          return "4M";
        }
        case "smallest-size": {
          return "2M";
        }
        default: {
          return "4M";
        }
      }
    })();

    await this.ffmpeg.exec({
      input: videoPath,
      params: [
        preset != null ? `-c:v ${codec} -b:v ${bitrate}` : undefined,
        !!width && !height ? `-vf scale=${width}:-2` : undefined,
        !width && !!height ? `-vf scale=-2:${height}` : undefined,
        !!width && !!height ? `-vf scale=${width}:${height}` : undefined,
      ],
      output: targetVideoPath,
    });
  };
}
