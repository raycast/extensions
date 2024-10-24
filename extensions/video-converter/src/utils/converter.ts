import path from "path";
import fs from "fs";
import { getFFmpegPath } from "./ffmpeg";
import { execPromise } from "./exec";

const config = {
  ffmpegOptions: {
    mp4: {
      videoCodec: "h264",
      audioCodec: "aac",
      fileExtension: ".mp4",
    },
    avi: {
      videoCodec: "libxvid",
      audioCodec: "mp3",
      fileExtension: ".avi",
    },
    mov: {
      videoCodec: "prores",
      audioCodec: "pcm_s16le",
      fileExtension: ".mov",
    },
    mkv: {
      videoCodec: "libx265",
      audioCodec: "aac",
      fileExtension: ".mkv",
    },
  },
};

export async function convertVideo(filePath: string, outputFormat: "mp4" | "avi" | "mkv" | "mov"): Promise<string> {
  const formatOptions = config.ffmpegOptions[outputFormat];
  const outputFilePath = filePath.replace(path.extname(filePath), formatOptions.fileExtension);
  let finalOutputPath = outputFilePath;
  let counter = 1;

  while (fs.existsSync(finalOutputPath)) {
    const fileName = path.basename(outputFilePath, formatOptions.fileExtension);
    const dirName = path.dirname(outputFilePath);
    finalOutputPath = path.join(dirName, `${fileName}(${counter})${formatOptions.fileExtension}`);
    counter++;
  }

  const ffmpegPath = await getFFmpegPath();
  const command = `"${ffmpegPath}" -i "${filePath}" -vcodec ${formatOptions.videoCodec} -acodec ${formatOptions.audioCodec} "${finalOutputPath}"`;

  await execPromise(command);

  return finalOutputPath;
}
