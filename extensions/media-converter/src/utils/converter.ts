import path from "path";
import fs from "fs";
import os from "os";
import { getFFmpegPath } from "./ffmpeg";
import { execPromise } from "./exec";

export const INPUT_VIDEO_EXTENSIONS = [".mov", ".mp4", ".avi", ".mkv", ".mpg", ".webm"] as const;
export const INPUT_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".tiff",
  ".tif",
  ".avif",
  ".bmp",
] as const;
export const INPUT_AUDIO_EXTENSIONS = [".mp3", ".aac", ".wav", ".m4a", ".flac"] as const;
export const INPUT_ALL_EXTENSIONS = [
  ...INPUT_VIDEO_EXTENSIONS,
  ...INPUT_IMAGE_EXTENSIONS,
  ...INPUT_AUDIO_EXTENSIONS,
] as const;

// IMPORTANT: Updating these arrays?
// Update them manually in tool/convert-media.ts as well. Read the comment there for more details.
export const OUTPUT_VIDEO_EXTENSIONS = [".mp4", ".avi", ".mov", ".mkv", ".mpg", ".webm"] as const;
export const OUTPUT_AUDIO_EXTENSIONS = [".mp3", ".aac", ".wav", ".flac"] as const;
export const OUTPUT_IMAGE_EXTENSIONS = [".jpg", ".png", ".webp", ".heic", ".tiff", ".avif"] as const;
export const OUTPUT_ALL_EXTENSIONS = [
  ...OUTPUT_VIDEO_EXTENSIONS,
  ...OUTPUT_AUDIO_EXTENSIONS,
  ...OUTPUT_IMAGE_EXTENSIONS,
] as const;

export function getUniqueOutputPath(filePath: string, extension: string): string {
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

export function checkExtensionType(file: string, allowedExtensions?: ReadonlyArray<string> | null): string | boolean {
  const extension = path.extname(file).toLowerCase();
  if (!allowedExtensions) {
    return INPUT_VIDEO_EXTENSIONS.includes(extension as (typeof INPUT_VIDEO_EXTENSIONS)[number])
      ? "video"
      : INPUT_IMAGE_EXTENSIONS.includes(extension as (typeof INPUT_IMAGE_EXTENSIONS)[number])
        ? "image"
        : INPUT_AUDIO_EXTENSIONS.includes(extension as (typeof INPUT_AUDIO_EXTENSIONS)[number])
          ? "audio"
          : false;
  } else {
    return allowedExtensions.includes(extension as (typeof allowedExtensions)[number]) ? true : false;
  }
}

export async function convertMedia(
  filePath: string,
  outputFormat:
    | (typeof OUTPUT_AUDIO_EXTENSIONS)[number]
    | (typeof OUTPUT_VIDEO_EXTENSIONS)[number]
    | (typeof OUTPUT_IMAGE_EXTENSIONS)[number],
  quality?: string, // Currently represents 0-100 in steps of 5 (as strings) for jpg heic avif webp, "lossless" for webp, "lzw" or "deflate" for tiff, "png-24" or "png-8" for png
): Promise<string> {
  // If image
  if ((OUTPUT_IMAGE_EXTENSIONS as ReadonlyArray<string>).includes(outputFormat)) {
    const currentOutputFormat = outputFormat as (typeof OUTPUT_IMAGE_EXTENSIONS)[number];
    const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat);

    let tempHeicFile: string | null = null;
    let tempPaletteFile: string | null = null;
    const extension = path.extname(filePath).toLowerCase();
    let processedInputPath = filePath;

    try {
      // Only SIPS can handle converting to HEIC
      if (currentOutputFormat === ".heic") {
        await execPromise(
          `sips --setProperty format heic --setProperty formatOptions ${Number(quality)} "${filePath}" --out "${finalOutputPath}"`,
        );
      } else {
        // If the input file is HEIC and the output format is not HEIC, we need to convert it to PNG first
        // so that ffmpeg can handle it
        if (extension === ".heic") {
          try {
            const tempFileName = `${path.basename(filePath, ".heic")}_temp_${Date.now()}.png`;
            tempHeicFile = path.join(os.tmpdir(), tempFileName);

            await execPromise(`sips --setProperty format png "${filePath}" --out "${tempHeicFile}"`);

            processedInputPath = tempHeicFile;
          } catch (error) {
            console.error(`Error pre-processing HEIC file: ${filePath}`, error);
            if (tempHeicFile && fs.existsSync(tempHeicFile)) {
              fs.unlinkSync(tempHeicFile);
            }
            throw new Error(`Failed to preprocess HEIC file: ${String(error)}`);
          }
        }
        // FFmpeg for all other image formats
        const ffmpegPath = await getFFmpegPath();
        let ffmpegCmd = `"${ffmpegPath}" -i "${processedInputPath}"`;

        switch (currentOutputFormat) {
          case ".jpg":
            // mjpeg takes in 2 (best) to 31 (worst)
            ffmpegCmd += ` -q:v ${Math.round(31 - (Number(quality) / 100) * 29)}`;
            break;
          case ".png":
            if (quality === "png-8") {
              const tempPaletteFileName = `${path.basename(filePath, path.extname(filePath))}_palette_${Date.now()}.png`;
              tempPaletteFile = path.join(os.tmpdir(), tempPaletteFileName);

              ffmpegCmd = `"${ffmpegPath}" -i "${processedInputPath}" -vf "palettegen=max_colors=256" -y "${tempPaletteFile}" && "${ffmpegPath}" -i "${processedInputPath}" -i "${tempPaletteFile}" -lavfi "paletteuse=dither=bayer:bayer_scale=5"`;
              // Note: FFmpeg's PNG-8 doesn't support non-binary transparency, no way to fix it (according to my research, @sacha_crispin). We could make use of other libraries like pngquant or ImageMagick for better PNG-8 alpha support, but that would require additional dependencies.
            }
            ffmpegCmd += ` -compression_level 100 "${finalOutputPath}"`;
            break;
          case ".webp":
            ffmpegCmd += " -c:v libwebp";
            if (quality === "lossless") {
              ffmpegCmd += " -lossless 1";
            } else {
              ffmpegCmd += ` -quality ${Number(quality)}`;
            }
            break;
          case ".tiff":
            ffmpegCmd += ` -compression_algo ${quality}`;
            break;
          case ".avif":
            // libaom-av1 takes in 0 (best/lossless (unsure about it being truly lossless but after testing,
            // I @sacha_crispin, couldn't find a difference when "-lossless 1" was applied.
            // https://trac.ffmpeg.org/wiki/Encode/AV1 supports that theory)) to 63 (worst)
            ffmpegCmd += ` -c:v libaom-av1 -crf ${Math.round(63 - (Number(quality) / 100) * 63)} -still-picture 1`;
            break;
        }
        if (currentOutputFormat !== ".png" || quality !== "png-8") {
          ffmpegCmd += ` "${finalOutputPath}"`;
        }
        await execPromise(ffmpegCmd);
      }
      return finalOutputPath;
    } catch (error) {
      console.error(`Error converting ${processedInputPath} to ${currentOutputFormat}:`, error);
      throw error;
    } finally {
      // Clean up temp files if they exist
      if (tempHeicFile && fs.existsSync(tempHeicFile)) {
        fs.unlinkSync(tempHeicFile);
      }
      if (tempPaletteFile && fs.existsSync(tempPaletteFile)) {
        fs.unlinkSync(tempPaletteFile);
      }
    }
  }
  // If audio
  else if ((OUTPUT_AUDIO_EXTENSIONS as ReadonlyArray<string>).includes(outputFormat)) {
    const currentOutputFormat = outputFormat as (typeof OUTPUT_AUDIO_EXTENSIONS)[number];

    const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat);
    const ffmpegPath = await getFFmpegPath();
    let command = `"${ffmpegPath}" -i "${filePath}"`;

    switch (currentOutputFormat) {
      case ".mp3":
        command += ` -c:a libmp3lame`;
        // TODO: Add quality options for mp3 if desired, e.g., -q:a
        break;
      case ".aac":
        command += ` -c:a aac`;
        break;
      case ".wav":
        command += ` -c:a pcm_s16le`;
        break;
      case ".flac":
        command += ` -c:a flac`;
        break;
      default:
        throw new Error(`Unknown audio output format: ${currentOutputFormat}`);
    }

    command += ` "${finalOutputPath}"`;
    await execPromise(command);
    return finalOutputPath;
  }
  // If video
  else if ((OUTPUT_VIDEO_EXTENSIONS as ReadonlyArray<string>).includes(outputFormat)) {
    const currentOutputFormat = outputFormat as (typeof OUTPUT_VIDEO_EXTENSIONS)[number];

    const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat);
    const ffmpegPath = await getFFmpegPath();
    let command = `"${ffmpegPath}" -i "${filePath}"`;

    switch (currentOutputFormat) {
      case ".mp4":
        command += ` -vcodec h264 -acodec aac`;
        // TODO: Add quality options for mp4 if desired, e.g., -crf
        break;
      case ".avi":
        command += ` -vcodec libxvid -acodec mp3`;
        break;
      case ".mov":
        command += ` -vcodec prores -acodec pcm_s16le`;
        break;
      case ".mkv":
        command += ` -vcodec libx265 -acodec aac`;
        break;
      case ".mpg":
        command += ` -vcodec mpeg2video -acodec mp3`;
        break;
      case ".webm":
        command += ` -vcodec libvpx-vp9 -acodec libopus`;
        break;
      default:
        throw new Error(`Unknown video output format: ${currentOutputFormat}`);
    }

    command += ` "${finalOutputPath}"`;
    await execPromise(command);
    return finalOutputPath;
  }
  // Theoretically, this should never happen
  throw new Error(`Unsupported output format: ${outputFormat}`);
}
