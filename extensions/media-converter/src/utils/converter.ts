import path from "path";
import fs from "fs";
import os from "os";
import { findFFmpegPath } from "./ffmpeg";
import { execPromise } from "./exec";
import {
  AllOutputExtension,
  OutputImageExtension,
  OutputAudioExtension,
  OutputVideoExtension,
  QualitySettings,
  ImageQuality,
  AudioQuality,
  VideoQuality,
  getMediaType,
  Percentage,
} from "../types/media";

function convertQualityToCrf(qualityPercentage: Percentage): number {
  // Map 100% quality to CRF 0, and 0% quality to CRF 51
  // Using a linear mapping for simplicity
  return Math.round(51 - (qualityPercentage / 100) * 51);
}

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

export async function convertMedia<T extends AllOutputExtension>(
  filePath: string,
  outputFormat: T,
  quality: QualitySettings,
): Promise<string> {
  const ffmpegPath = await findFFmpegPath();

  // In theory, this should never happen
  if (!ffmpegPath) {
    throw new Error("FFmpeg is not installed or configured. Please install FFmpeg to use this converter.");
  }

  let ffmpegCmd = `"${ffmpegPath.path}" -i`;
  const currentMediaType = getMediaType(path.extname(filePath))!;
  switch (currentMediaType) {
    case "image": {
      const currentOutputFormat = outputFormat as OutputImageExtension;
      const imageQuality = quality as ImageQuality;
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
              `sips --setProperty format heic --setProperty formatOptions ${imageQuality[".heic"]} "${filePath}" --out "${finalOutputPath}"`,
            );
          } catch (error) {
            // Parse error to provide more specific feedback
            const errorMessage = String(error);

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
              ffmpegCmd += ` -q:v ${Math.round(31 - (imageQuality[".jpg"] / 100) * 29)}`;
              break;
            case ".png":
              if (imageQuality[".png"] === "png-8") {
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
              if (imageQuality[".webp"] === "lossless") {
                ffmpegCmd += " -lossless 1";
              } else {
                ffmpegCmd += ` -quality ${imageQuality[".webp"]}`;
              }
              break;
            case ".tiff":
              ffmpegCmd += ` -compression_algo ${imageQuality[".tiff"]}`;
              break;
            case ".avif":
              // libaom-av1 takes in 0 (best/lossless) to 63 (worst)
              ffmpegCmd += ` -c:v libaom-av1 -crf ${Math.round(63 - (Number(imageQuality[".avif"]) / 100) * 63)} -still-picture 1`;
              break;
          }
          if (currentOutputFormat !== ".png" || imageQuality[".png"] !== "png-8") {
            ffmpegCmd += ` -y "${finalOutputPath}"`;
          }
          console.log(`Executing FFmpeg image command: ${ffmpegCmd}`);
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

    case "audio": {
      const currentOutputFormat = outputFormat as OutputAudioExtension;
      const audioQuality = quality as AudioQuality;
      const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat);

      ffmpegCmd += ` "${filePath}"`;

      switch (currentOutputFormat) {
        case ".mp3": {
          const mp3Settings = audioQuality[".mp3"];
          ffmpegCmd += ` -c:a libmp3lame`;
          if (mp3Settings.vbr) {
            ffmpegCmd += ` -q:a ${Math.round((320 - Number(mp3Settings.bitrate)) / 40)}`; // Convert bitrate to VBR quality
          } else {
            ffmpegCmd += ` -b:a ${mp3Settings.bitrate}k`;
          }
          break;
        }
        case ".aac": {
          const aacSettings = audioQuality[".aac"];
          ffmpegCmd += ` -c:a aac -b:a ${aacSettings.bitrate}k`;
          if (aacSettings.profile) {
            ffmpegCmd += ` -profile:a ${aacSettings.profile}`;
          }
          break;
        }
        case ".m4a": {
          const m4aSettings = audioQuality[".m4a"];
          ffmpegCmd += ` -c:a aac -b:a ${m4aSettings.bitrate}k`;
          if (m4aSettings.profile) {
            ffmpegCmd += ` -profile:a ${m4aSettings.profile}`;
          }
          break;
        }
        case ".wav": {
          const wavSettings = audioQuality[".wav"];
          ffmpegCmd += ` -c:a pcm_s${wavSettings.bitDepth}le -ar ${wavSettings.sampleRate}`;
          break;
        }
        case ".flac": {
          const flacSettings = audioQuality[".flac"];
          ffmpegCmd += ` -c:a flac -compression_level ${flacSettings.compressionLevel} -ar ${flacSettings.sampleRate}`;
          if (flacSettings.bitDepth === "24") {
            ffmpegCmd += ` -sample_fmt s32`;
          }
          break;
        }
        default:
          throw new Error(`Unknown audio output format: ${currentOutputFormat}`);
      }

      ffmpegCmd += ` -y "${finalOutputPath}"`;
      console.log(`Executing FFmpeg audio command: ${ffmpegCmd}`);
      await execPromise(ffmpegCmd);
      return finalOutputPath;
    }

    case "video": {
      const currentOutputFormat = outputFormat as OutputVideoExtension;
      const videoQuality = quality as VideoQuality;

      ffmpegCmd += ` "${filePath}"`;

      // Add format-specific codec and settings
      switch (currentOutputFormat) {
        case ".mp4": {
          const mp4Quality = videoQuality[".mp4"];
          ffmpegCmd += ` -vcodec h264 -acodec aac -preset ${mp4Quality.preset}`;
          break;
        }
        case ".avi": {
          ffmpegCmd += ` -vcodec libxvid -acodec mp3`;
          break;
        }
        case ".mov": {
          const movQuality = videoQuality[".mov"];
          const proresProfiles = {
            proxy: "0",
            lt: "1",
            standard: "2",
            hq: "3",
            "4444": "4",
            "4444xq": "5",
          };
          ffmpegCmd += ` -vcodec prores -profile:v ${proresProfiles[movQuality.variant]} -acodec pcm_s16le`;
          break;
        }
        case ".mkv": {
          const mkvQuality = videoQuality[".mkv"];
          ffmpegCmd += ` -vcodec libx265 -acodec aac -preset ${mkvQuality.preset}`;
          break;
        }
        case ".mpg": {
          ffmpegCmd += ` -vcodec mpeg2video -acodec mp3`;
          break;
        }
        case ".webm": {
          const webmQuality = videoQuality[".webm"];
          ffmpegCmd += ` -vcodec libvpx-vp9 -acodec libopus -quality ${webmQuality.quality}`;
          break;
        }
        default:
          throw new Error(`Unknown video output format: ${currentOutputFormat}`);
      }

      // Handle encoding mode (unified for all formats except .mov)
      const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat);
      let logFilePrefix: string | null = null;

      if (currentOutputFormat !== ".mov") {
        const qualitySettings = videoQuality[currentOutputFormat];

        if ("encodingMode" in qualitySettings) {
          if (qualitySettings.encodingMode === "crf") {
            ffmpegCmd += ` -crf ${convertQualityToCrf(qualitySettings.crf)}`;
          } else {
            // VBR or VBR 2-pass
            ffmpegCmd += ` -b:v ${qualitySettings.bitrate}k`;

            if ("maxBitrate" in qualitySettings && qualitySettings.maxBitrate) {
              ffmpegCmd += ` -maxrate ${qualitySettings.maxBitrate}k -bufsize ${Number(qualitySettings.maxBitrate) * 2}k`;
            }

            if (qualitySettings.encodingMode === "vbr-2-pass") {
              // First pass - need to specify log file prefix for 2-pass encoding
              logFilePrefix = path.join(os.tmpdir(), `ffmpeg2pass_${Date.now()}`);
              const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
              const firstPassCmd = ffmpegCmd + ` -pass 1 -passlogfile "${logFilePrefix}" -f null ${nullDevice}`;
              try {
                await execPromise(firstPassCmd);
              } catch (error) {
                throw new Error(`First pass encoding failed: ${error}`);
              }
              // Second pass will be executed below
              ffmpegCmd += ` -pass 2 -passlogfile "${logFilePrefix}"`;
            }
          }
        }
      }

      try {
        ffmpegCmd += ` -y "${finalOutputPath}"`;
        console.log(`Executing FFmpeg video command: ${ffmpegCmd}`);
        await execPromise(ffmpegCmd);
        return finalOutputPath;
      } finally {
        // Clean up 2-pass log files if they exist
        if (logFilePrefix) {
          try {
            // Clean up all possible FFmpeg 2-pass log files
            const logFiles = [
              `${logFilePrefix}-0.log`,
              `${logFilePrefix}-0.log.mbtree`,
              `${logFilePrefix}-0.log.temp`,
              `${logFilePrefix}-1.log`,
              `${logFilePrefix}-1.log.mbtree`,
              `${logFilePrefix}-1.log.temp`,
            ];

            for (const logFile of logFiles) {
              if (fs.existsSync(logFile)) {
                try {
                  fs.unlinkSync(logFile);
                } catch (fileError) {
                  console.warn(`Failed to clean up log file ${logFile}:`, fileError);
                }
              }
            }
          } catch (error) {
            console.warn("Failed to clean up FFmpeg log files:", error);
          }
        }
      }
    }

    default:
      throw new Error(`Unsupported media type for file: ${filePath}`);
  }
}
