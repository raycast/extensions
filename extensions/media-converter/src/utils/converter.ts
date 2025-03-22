import path from "path";
import fs from "fs";
import { getFFmpegPath } from "./ffmpeg";
import { execPromise } from "./exec";
import { execSync } from "child_process";
import { runAppleScript } from "@raycast/utils";

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
    webm: {
      videoCodec: "libvpx-vp9",
      audioCodec: "libopus",
      fileExtension: ".webm",
    },
  },
};

// Audio configuration
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

// Image configuration
interface ImageFormatConfig {
  fileExtension: string;
  nsType?: string;
  sipsFormat?: string;
  useFFmpeg?: boolean;
}

const imageConfig: Record<string, ImageFormatConfig> = {
  jpg: {
    fileExtension: ".jpg",
    nsType: "NSJPEGFileType",
    sipsFormat: "jpeg",
  },
  png: {
    fileExtension: ".png",
    nsType: "NSPNGFileType",
    sipsFormat: "png",
  },
  webp: {
    fileExtension: ".webp",
    useFFmpeg: true,
  },
  heic: {
    fileExtension: ".heic",
    sipsFormat: "heic",
  },
  tiff: {
    fileExtension: ".tiff",
    nsType: "NSTIFFFileType",
    sipsFormat: "tiff",
  },
};

function getUniqueOutputPath(filePath: string, extension: string): string {
  const outputFilePath = filePath.replace(path.extname(filePath), extension);
  let finalOutputPath = outputFilePath;
  let counter = 1;

  while (fs.existsSync(finalOutputPath)) {
    const fileName = path.basename(outputFilePath, extension);
    const dirName = path.dirname(outputFilePath);
    finalOutputPath = path.join(dirName, `${fileName}(${counter})${extension}`);
    counter++;
  }

  return finalOutputPath;
}

async function convertUsingNSBitmapImageRep(inputPath: string, outputPath: string, format: string) {
  return runAppleScript(`
    use framework "Foundation"
    use framework "AppKit"
    
    -- Load the image
    set inputURL to POSIX file "${inputPath}" as string
    set inputData to current application's NSData's dataWithContentsOfFile:inputURL
    set inputImage to current application's NSImage's alloc()'s initWithData:inputData
    
    -- Convert to bitmap representation
    set tiffData to inputImage's TIFFRepresentation()
    set bitmap to current application's NSBitmapImageRep's alloc()'s initWithData:tiffData
    
    -- Convert to desired format
    set outputData to bitmap's representationUsingType:(current application's ${format}) |properties|:(missing value)
    
    -- Save to file
    outputData's writeToFile:"${outputPath}" atomically:false
  `);
}

export async function convertImage(filePath: string, outputFormat: keyof typeof imageConfig): Promise<string> {
  const formatOptions = imageConfig[outputFormat];
  if (!formatOptions) {
    throw new Error(`Unsupported output format: ${outputFormat}`);
  }

  const finalOutputPath = getUniqueOutputPath(filePath, formatOptions.fileExtension);
  const inputExt = path.extname(filePath).toLowerCase().slice(1);

  try {
    if (outputFormat === "webp") {
      const tempPngPath = getUniqueOutputPath(filePath, ".png");
      execSync(`sips --setProperty format png "${filePath}" --out "${tempPngPath}"`);

      const ffmpegPath = await getFFmpegPath();
      await execPromise(`"${ffmpegPath}" -i "${tempPngPath}" -c:v libwebp -quality 100 "${finalOutputPath}"`);

      fs.unlinkSync(tempPngPath);
      return finalOutputPath;
    }

    // Handle conversion from WebP
    if (inputExt === "webp") {
      const ffmpegPath = await getFFmpegPath();
      const tempPngPath = getUniqueOutputPath(filePath, ".png");
      await execPromise(`"${ffmpegPath}" -i "${filePath}" "${tempPngPath}"`);

      if (outputFormat === "png") {
        return tempPngPath;
      }

      if (formatOptions.sipsFormat) {
        execSync(`sips --setProperty format ${formatOptions.sipsFormat} "${tempPngPath}" --out "${finalOutputPath}"`);
      } else if (formatOptions.nsType) {
        await convertUsingNSBitmapImageRep(tempPngPath, finalOutputPath, formatOptions.nsType);
      }

      fs.unlinkSync(tempPngPath);
      return finalOutputPath;
    }

    if (formatOptions.sipsFormat) {
      execSync(`sips --setProperty format ${formatOptions.sipsFormat} "${filePath}" --out "${finalOutputPath}"`);
      return finalOutputPath;
    }

    if (formatOptions.nsType) {
      await convertUsingNSBitmapImageRep(filePath, finalOutputPath, formatOptions.nsType);
      return finalOutputPath;
    }

    throw new Error(`Unsupported output format: ${outputFormat}`);
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to convert image: ${err.message}`);
  }
}

export async function optimizeImage(filePath: string, quality: number = 100): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const finalOutputPath = getUniqueOutputPath(filePath, `_optimized${ext}`);

  try {
    switch (ext) {
      case ".heic":
        execSync(
          `sips --setProperty format heic --setProperty formatOptions ${quality} "${filePath}" --out "${finalOutputPath}"`,
        );
        break;
      case ".jpg":
      case ".jpeg":
        await convertUsingNSBitmapImageRep(filePath, finalOutputPath, "NSJPEGFileType");
        break;
      default:
        throw new Error(`Optimization not supported for ${ext} files`);
    }
    return finalOutputPath;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to optimize image: ${err.message}`);
  }
}

export async function convertVideo(
  filePath: string,
  outputFormat: "mp4" | "avi" | "mkv" | "mov" | "mpg" | "webm",
): Promise<string> {
  const formatOptions = config.ffmpegOptions[outputFormat];
  const finalOutputPath = getUniqueOutputPath(filePath, formatOptions.fileExtension);

  const ffmpegPath = await getFFmpegPath();
  const command = `"${ffmpegPath}" -i "${filePath}" -vcodec ${formatOptions.videoCodec} -acodec ${formatOptions.audioCodec} "${finalOutputPath}"`;

  await execPromise(command);

  return finalOutputPath;
}

export async function convertAudio(filePath: string, outputFormat: "mp3" | "aac" | "wav" | "flac"): Promise<string> {
  const formatOptions = audioConfig[outputFormat];
  const finalOutputPath = getUniqueOutputPath(filePath, formatOptions.fileExtension);

  const ffmpegPath = await getFFmpegPath();
  const command = `"${ffmpegPath}" -i "${filePath}" -c:a ${formatOptions.audioCodec} "${finalOutputPath}"`;

  await execPromise(command);

  return finalOutputPath;
}
