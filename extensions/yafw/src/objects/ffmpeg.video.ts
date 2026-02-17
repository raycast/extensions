import { existsSync } from "fs";
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

  crop: Video["crop"] = async (options) => {
    const { aspectRatioWidth, aspectRatioHeight } = options;

    const videoPath = this.file.path();
    const { width: sourceWidth, height: sourceHeight } = await this.ffmpeg.videoDimensions(videoPath);
    const sourceDirPath = path.dirname(videoPath);
    const extension = this.file.extension();
    const croppedBaseName = `${this.file.name()} (cropped ${aspectRatioWidth}x${aspectRatioHeight})${extension}`;
    const targetVideoPathWithoutCounter = path.join(sourceDirPath, croppedBaseName);
    const targetVideoPath = existsSync(targetVideoPathWithoutCounter)
      ? path.join(sourceDirPath, new FsFile(targetVideoPathWithoutCounter).nextName())
      : targetVideoPathWithoutCounter;

    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = aspectRatioWidth / aspectRatioHeight;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;

    if (sourceRatio > targetRatio) {
      cropWidth = Math.floor((sourceHeight * targetRatio) / 2) * 2;
    } else if (sourceRatio < targetRatio) {
      cropHeight = Math.floor(sourceWidth / targetRatio / 2) * 2;
    }

    cropWidth = Math.max(2, Math.min(sourceWidth, cropWidth));
    cropHeight = Math.max(2, Math.min(sourceHeight, cropHeight));

    if (cropWidth === sourceWidth && cropHeight === sourceHeight) {
      throw new Error(`Video already has ${aspectRatioWidth}:${aspectRatioHeight} aspect ratio`);
    }

    const cropFilter = `-vf "crop=${cropWidth}:${cropHeight}:(iw-ow)/2:(ih-oh)/2"`;
    const qualityParams =
      extension === ".webm" ? ["-c:v libvpx-vp9", "-crf 18", "-b:v 0"] : ["-c:v libx264", "-preset slow", "-crf 17"];

    await this.ffmpeg.exec({
      input: videoPath,
      params: [cropFilter, ...qualityParams, "-c:a copy"],
      output: targetVideoPath,
    });
  };

  trim: Video["trim"] = async (options) => {
    const { startTime, endTime, duration } = options;

    const videoPath = this.file.path();
    const sourceDirPath = path.dirname(videoPath);
    const extension = this.file.extension();
    const targetVideoPath = path.join(sourceDirPath, this.file.nextName({ extension }));

    // Put -ss before -i for faster seeking with -c copy
    const inputOptions: (string | undefined)[] = [`-ss ${startTime}`];

    const params: (string | undefined)[] = [
      duration ? `-t ${duration}` : undefined,
      endTime ? `-to ${endTime}` : undefined,
      "-c copy",
    ];

    await this.ffmpeg.exec({
      input: videoPath,
      inputOptions: inputOptions.filter((param) => param != null),
      params: params.filter((param) => param != null),
      output: targetVideoPath,
    });
  };
}
