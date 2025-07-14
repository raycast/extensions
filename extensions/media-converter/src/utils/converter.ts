import path from "path";
import fs from "fs";
import os from "os";
import { findFFmpegPath } from "./ffmpeg";
import { execPromise } from "./exec";
import {
  INPUT_VIDEO_EXTENSIONS,
  INPUT_IMAGE_EXTENSIONS,
  INPUT_AUDIO_EXTENSIONS,
  INPUT_ALL_EXTENSIONS,
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_IMAGE_EXTENSIONS,
  OUTPUT_ALL_EXTENSIONS,
  MediaType,
  AllOutputExtension,
  OutputImageExtension,
  OutputAudioExtension,
  OutputVideoExtension,
  QualitySettings,
  ImageQuality,
  AudioQuality,
  VideoQuality,
  getDefaultQuality,
  getMediaType,
} from "../types/media";

// Re-export for backwards compatibility
export {
  INPUT_VIDEO_EXTENSIONS,
  INPUT_IMAGE_EXTENSIONS,
  INPUT_AUDIO_EXTENSIONS,
  INPUT_ALL_EXTENSIONS,
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_IMAGE_EXTENSIONS,
  OUTPUT_ALL_EXTENSIONS,
  getDefaultQuality,
  getMediaType,
};

export type {
  MediaType,
  AllOutputExtension,
  OutputImageExtension,
  OutputAudioExtension,
  OutputVideoExtension,
  QualitySettings,
  ImageQuality,
  AudioQuality,
  VideoQuality,
};

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

export function checkExtensionType(file: string, allowedExtensions?: ReadonlyArray<string> | null): MediaType | boolean {
  const extension = path.extname(file).toLowerCase();
  if (!allowedExtensions) {
    return getMediaType(extension) || false;
  } else {
    return allowedExtensions.includes(extension as (typeof allowedExtensions)[number]) ? true : false;
  }
}

export async function convertMedia<T extends AllOutputExtension>(
  filePath: string,
  outputFormat: T,
  quality: QualitySettings<T>,
): Promise<string> {
  const ffmpegPath = await findFFmpegPath();

  if (!ffmpegPath) {
    throw new Error("FFmpeg is not installed or configured. Please install FFmpeg to use this converter.");
  }

  let ffmpegCmd = `"${ffmpegPath.path}" -i`;
  // If image
  if (checkExtensionType(filePath, OUTPUT_IMAGE_EXTENSIONS)) {
    const currentOutputFormat = outputFormat as OutputImageExtension;
    const imageQuality = quality as ImageQuality<typeof currentOutputFormat>;
    const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat);

    let tempHeicFile: string | null = null;
    let tempPaletteFile: string | null = null;
    const extension = path.extname(filePath).toLowerCase();
    let processedInputPath = filePath;

    try {
      // HEIC conversion is theoretically only available on macOS via the built-in SIPS utility.
      if (currentOutputFormat === ".heic") {
        try {
          // Attempt HEIC conversion using SIPS directly
          await execPromise(
            `sips --setProperty format heic --setProperty formatOptions ${Number(imageQuality)} "${filePath}" --out "${finalOutputPath}"`,
          );
        } catch (error) {
          // Parse error to provide more specific feedback
          const errorMessage = String(error).toLowerCase();

          if (errorMessage.includes("command not found") || errorMessage.includes("not recognized")) {
            throw new Error(
              "HEIC conversion failed: 'sips' command not found. " +
                "Converting to HEIC format is theoretically only available on macOS, " +
                "as it requires the built-in SIPS utility with proper HEIC support " +
                "(libheif, libde265, and x265 dependencies).",
            );
          } else {
            throw new Error(
              "HEIC conversion failed: SIPS command found but conversion unsuccessful. " +
                "This may indicate that your SIPS installation lacks proper HEIC support. " +
                "Converting to HEIC format typically requires macOS with built-in SIPS that includes " +
                "libheif, libde265, and x265 dependencies. Error details: " +
                String(error),
            );
          }
        }
      } else {
        // If the input file is HEIC and the output format is not HEIC, convert to PNG first
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

        ffmpegCmd += ` "${processedInputPath}"`;

        switch (currentOutputFormat) {
          case ".jpg":
            // mjpeg takes in 2 (best) to 31 (worst)
            ffmpegCmd += ` -q:v ${Math.round(31 - (Number(imageQuality) / 100) * 29)}`;
            break;
          case ".png":
            if (imageQuality === "png-8") {
              const tempPaletteFileName = `${path.basename(filePath, path.extname(filePath))}_palette_${Date.now()}.png`;
              tempPaletteFile = path.join(os.tmpdir(), tempPaletteFileName);

              // Generate palette first
              await execPromise(
                `"${ffmpegPath.path}" -i "${processedInputPath}" -vf "palettegen=max_colors=256" -y "${tempPaletteFile}"`,
              );
              // Then apply palette
              ffmpegCmd = `"${ffmpegPath.path}" -i "${processedInputPath}" -i "${tempPaletteFile}" -lavfi "paletteuse=dither=bayer:bayer_scale=5"`;
            }
            ffmpegCmd += ` -compression_level 100 "${finalOutputPath}"`;
            break;
          case ".webp":
            ffmpegCmd += " -c:v libwebp";
            if (imageQuality === "lossless") {
              ffmpegCmd += " -lossless 1";
            } else {
              ffmpegCmd += ` -quality ${Number(imageQuality)}`;
            }
            break;
          case ".tiff":
            ffmpegCmd += ` -compression_algo ${imageQuality}`;
            break;
          case ".avif":
            // libaom-av1 takes in 0 (best/lossless) to 63 (worst)
            ffmpegCmd += ` -c:v libaom-av1 -crf ${Math.round(63 - (Number(imageQuality) / 100) * 63)} -still-picture 1`;
            break;
        }
        if (currentOutputFormat !== ".png" || imageQuality !== "png-8") {
          ffmpegCmd += ` -y "${finalOutputPath}"`;
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
  else if (checkExtensionType(filePath, OUTPUT_AUDIO_EXTENSIONS)) {
    const currentOutputFormat = outputFormat as OutputAudioExtension;

    ffmpegCmd += ` "${filePath}"`;

    switch (currentOutputFormat) {
      case ".mp3": {
        const mp3Quality = quality as AudioQuality<".mp3">;
        ffmpegCmd += ` -c:a libmp3lame`;
        if (mp3Quality.vbr) {
          ffmpegCmd += ` -q:a ${Math.round((320 - Number(mp3Quality.bitrate)) / 40)}`; // Convert bitrate to VBR quality
        } else {
          ffmpegCmd += ` -b:a ${mp3Quality.bitrate}k`;
        }
        break;
      }
      case ".aac": {
        const aacQuality = quality as AudioQuality<".aac">;
        ffmpegCmd += ` -c:a aac -b:a ${aacQuality.bitrate}k`;
        if (aacQuality.profile) {
          ffmpegCmd += ` -profile:a ${aacQuality.profile}`;
        }
        break;
      }
      case ".wav": {
        const wavQuality = quality as AudioQuality<".wav">;
        ffmpegCmd += ` -c:a pcm_s${wavQuality.bitDepth}le -ar ${wavQuality.sampleRate}`;
        break;
      }
      case ".flac": {
        const flacQuality = quality as AudioQuality<".flac">;
        ffmpegCmd += ` -c:a flac -compression_level ${flacQuality.compressionLevel} -ar ${flacQuality.sampleRate}`;
        if (flacQuality.bitDepth === "24") {
          ffmpegCmd += ` -sample_fmt s32`;
        }
        break;
      }
      default:
        throw new Error(`Unknown audio output format: ${currentOutputFormat}`);
    }

    const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat);
    ffmpegCmd += ` -y "${finalOutputPath}"`;
    await execPromise(ffmpegCmd);
    return finalOutputPath;
  }
  // If video
  else if (checkExtensionType(filePath, OUTPUT_VIDEO_EXTENSIONS)) {
    const currentOutputFormat = outputFormat as OutputVideoExtension;

    ffmpegCmd += ` "${filePath}"`;

    switch (currentOutputFormat) {
      case ".mp4": {
        const mp4Quality = quality as VideoQuality<".mp4">;
        ffmpegCmd += ` -vcodec h264 -acodec aac -preset ${mp4Quality.preset}`;
        
        if (mp4Quality.encodingMode === "crf") {
          ffmpegCmd += ` -crf ${mp4Quality.crf}`;
        } else {
          ffmpegCmd += ` -b:v ${mp4Quality.bitrate}k`;
          if (mp4Quality.maxBitrate) {
            ffmpegCmd += ` -maxrate ${mp4Quality.maxBitrate}k -bufsize ${Number(mp4Quality.maxBitrate) * 2}k`;
          }
          
          if (mp4Quality.encodingMode === "vbr-2-pass") {
            // First pass
            const firstPassCmd = ffmpegCmd + ` -pass 1 -f null /dev/null`;
            await execPromise(firstPassCmd);
            // Second pass will be executed below
            ffmpegCmd += ` -pass 2`;
          }
        }
        break;
      }
      case ".avi": {
        const aviQuality = quality as VideoQuality<".avi">;
        ffmpegCmd += ` -vcodec libxvid -acodec mp3`;
        
        if (aviQuality.encodingMode === "crf") {
          ffmpegCmd += ` -crf ${aviQuality.crf}`;
        } else {
          ffmpegCmd += ` -b:v ${aviQuality.bitrate}k`;
          
          if (aviQuality.encodingMode === "vbr-2-pass") {
            const firstPassCmd = ffmpegCmd + ` -pass 1 -f null /dev/null`;
            await execPromise(firstPassCmd);
            ffmpegCmd += ` -pass 2`;
          }
        }
        break;
      }
      case ".mov": {
        const movQuality = quality as VideoQuality<".mov">;
        const proresProfile = movQuality.variant === "proxy" ? "0" :
                              movQuality.variant === "lt" ? "1" :
                              movQuality.variant === "standard" ? "2" :
                              movQuality.variant === "hq" ? "3" :
                              movQuality.variant === "4444" ? "4" : "5";
        ffmpegCmd += ` -vcodec prores -profile:v ${proresProfile} -acodec pcm_s16le`;
        break;
      }
      case ".mkv": {
        const mkvQuality = quality as VideoQuality<".mkv">;
        ffmpegCmd += ` -vcodec libx265 -acodec aac -preset ${mkvQuality.preset}`;
        
        if (mkvQuality.encodingMode === "crf") {
          ffmpegCmd += ` -crf ${mkvQuality.crf}`;
        } else {
          ffmpegCmd += ` -b:v ${mkvQuality.bitrate}k`;
          if (mkvQuality.maxBitrate) {
            ffmpegCmd += ` -maxrate ${mkvQuality.maxBitrate}k -bufsize ${Number(mkvQuality.maxBitrate) * 2}k`;
          }
          
          if (mkvQuality.encodingMode === "vbr-2-pass") {
            const firstPassCmd = ffmpegCmd + ` -pass 1 -f null /dev/null`;
            await execPromise(firstPassCmd);
            ffmpegCmd += ` -pass 2`;
          }
        }
        break;
      }
      case ".mpg": {
        const mpgQuality = quality as VideoQuality<".mpg">;
        ffmpegCmd += ` -vcodec mpeg2video -acodec mp3`;
        
        if (mpgQuality.encodingMode === "crf") {
          ffmpegCmd += ` -crf ${mpgQuality.crf}`;
        } else {
          ffmpegCmd += ` -b:v ${mpgQuality.bitrate}k`;
          
          if (mpgQuality.encodingMode === "vbr-2-pass") {
            const firstPassCmd = ffmpegCmd + ` -pass 1 -f null /dev/null`;
            await execPromise(firstPassCmd);
            ffmpegCmd += ` -pass 2`;
          }
        }
        break;
      }
      case ".webm": {
        const webmQuality = quality as VideoQuality<".webm">;
        ffmpegCmd += ` -vcodec libvpx-vp9 -acodec libopus -quality ${webmQuality.quality}`;
        
        if (webmQuality.encodingMode === "crf") {
          ffmpegCmd += ` -crf ${webmQuality.crf}`;
        } else {
          ffmpegCmd += ` -b:v ${webmQuality.bitrate}k`;
          if (webmQuality.maxBitrate) {
            ffmpegCmd += ` -maxrate ${webmQuality.maxBitrate}k -bufsize ${Number(webmQuality.maxBitrate) * 2}k`;
          }
          
          if (webmQuality.encodingMode === "vbr-2-pass") {
            const firstPassCmd = ffmpegCmd + ` -pass 1 -f null /dev/null`;
            await execPromise(firstPassCmd);
            ffmpegCmd += ` -pass 2`;
          }
        }
        break;
      }
      default:
        throw new Error(`Unknown video output format: ${currentOutputFormat}`);
    }

    const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat);
    ffmpegCmd += ` -y "${finalOutputPath}"`;
    console.log(`Executing FFmpeg command: ${ffmpegCmd}`);
    await execPromise(ffmpegCmd);
    return finalOutputPath;
  }
  // Theoretically, this should never happen
  throw new Error(`Unsupported output format: ${outputFormat}`);
}
