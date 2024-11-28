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
    mpg: {
      videoCodec: "mpeg2video",
      audioCodec: "mp3",
      fileExtension: ".mpg",
    },
  },
};

const imageConfig = {
  jpg: {
    fileExtension: ".jpg",
    quality: "100",
  },
  png: {
    fileExtension: ".png",
    quality: "lossless",
  },
  webp: {
    fileExtension: ".webp",
    quality: "100",
  },
};

const audioConfig = {
  mp3: {
    audioCodec: "libmp3lame",
    fileExtension: ".mp3",
  },
  aac: {
    audioCodec: "aac",
    fileExtension: ".aac",
  },
  wav: {
    audioCodec: "pcm_s16le",
    fileExtension: ".wav",
  },
  flac: {
    audioCodec: "flac",
    fileExtension: ".flac",
  },
};

export async function convertVideo(
  filePath: string,
  outputFormat: "mp4" | "avi" | "mkv" | "mov" | "mpg",
): Promise<string> {
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

export async function convertImage(filePath: string, outputFormat: "jpg" | "png" | "webp") {
  const formatOptions = imageConfig[outputFormat];
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
  let command;

  switch (outputFormat) {
    case "jpg":
      command = `"${ffmpegPath}" -i "${filePath}" -qmin 1 -qmax 1 "${finalOutputPath}"`;
      break;
    case "png":
      command = `"${ffmpegPath}" -i "${filePath}" -compression_level 0 "${finalOutputPath}"`;
      break;
    case "webp":
      command = `"${ffmpegPath}" -i "${filePath}" -lossless 1 -quality 100 "${finalOutputPath}"`;
      break;
    default:
      command = `"${ffmpegPath}" -i "${filePath}" -q:v 1 "${finalOutputPath}"`;
  }

  await execPromise(command);

  return finalOutputPath;
}

export async function convertAudio(filePath: string, outputFormat: "mp3" | "aac" | "wav" | "flac"): Promise<string> {
  const formatOptions = audioConfig[outputFormat];
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
  const command = `"${ffmpegPath}" -i "${filePath}" -c:a ${formatOptions.audioCodec} "${finalOutputPath}"`;

  await execPromise(command);

  return finalOutputPath;
}
