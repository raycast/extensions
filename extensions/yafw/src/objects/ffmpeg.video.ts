import path from "path";
import { File, Video } from "../abstractions";
import { Ffmpeg } from "./ffmpeg";
import { FsFile } from "./fs.file";

export class FfmpegVideo implements Video {
  constructor(
    private readonly ffmpeg: Ffmpeg,
    private readonly file: File,
  ) {}

  encode: Video["encode"] = async (options = {}) => {
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

  stabilize: Video["stabilize"] = async () => {
    const videoPath = this.file.path();
    const sourceDirPath = path.dirname(videoPath);
    const extension = this.file.extension();
    const targetVideoPath = path.join(sourceDirPath, this.file.nextName({ extension }));
    const transforms = new FsFile(path.join(sourceDirPath, "transforms.trf"));

    try {
      await this.ffmpeg.exec({
        input: videoPath,
        params: [`-vf vidstabdetect=shakiness=4:accuracy=15:result="${transforms.path()}" -f null -`],
      });
      await this.ffmpeg.exec({
        input: videoPath,
        params: [`-vf vidstabtransform=smoothing=12:zoom=0:input="${transforms.path()}"`],
        output: targetVideoPath,
      });
    } finally {
      await new FsFile(path.join(sourceDirPath, "transforms.trf")).remove();
    }
  };
}
