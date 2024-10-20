import path from "path";
import fs from "fs";
import { getFFmpegPath } from "./ffmpeg";
import { execPromise } from "./exec";

const config = {
  ffmpegOptions: {
    videoCodec: "h264",
    audioCodec: "aac",
  },
};

export async function convertMovToMp4(filePath: string): Promise<string> {
  if (!filePath.endsWith(".mov")) {
    throw new Error("Only .mov files are allowed!");
  }

  const outputFilePath = filePath.replace(".mov", ".mp4");
  let finalOutputPath = outputFilePath;
  let counter = 1;

  while (fs.existsSync(finalOutputPath)) {
    const fileName = path.basename(outputFilePath, ".mp4");
    const dirName = path.dirname(outputFilePath);
    finalOutputPath = path.join(dirName, `${fileName}(${counter}).mp4`);
    counter++;
  }

  const ffmpegPath = await getFFmpegPath();
  const command = `"${ffmpegPath}" -i "${filePath}" -vcodec ${config.ffmpegOptions.videoCodec} -acodec ${config.ffmpegOptions.audioCodec} "${finalOutputPath}"`;

  await execPromise(command);

  return finalOutputPath;
}