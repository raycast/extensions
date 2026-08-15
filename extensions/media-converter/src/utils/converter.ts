import path from "path";
import fs from "fs";
import os from "os";
import { findFFmpegPath } from "./ffmpeg";
import { runFFmpegWithProgress, probeDurationSec, type ProgressInfo } from "./ffmpegRun";
import { formatProcessForDisplay, runProcess, type ProcessSpec } from "./process";
import { parseTimeString, toFfmpegTime } from "./time";
import {
  AllOutputExtension,
  OutputImageExtension,
  OutputAudioExtension,
  OutputVideoExtension,
  QualitySettings,
  ImageQuality,
  AudioQuality,
  VideoQuality,
  GifQuality,
  getMediaType,
  getOutputCategory,
  Percentage,
  TrimOptions,
} from "../types/media";

function convertQualityToCrf(qualityPercentage: Percentage): number {
  // Map 100% quality to CRF 0, and 0% quality to CRF 51
  // Using a linear mapping for simplicity
  return Math.round(51 - (qualityPercentage / 100) * 51);
}

function getUniqueOutputPath(filePath: string, extension: string, outputDir?: string): string {
  const baseName = path.basename(filePath, path.extname(filePath));
  const dir = outputDir && outputDir.length > 0 ? outputDir : path.dirname(filePath);
  const outputFilePath = path.join(dir, `${baseName}${extension}`);
  let finalOutputPath = outputFilePath;
  let counter = 1;

  while (fs.existsSync(finalOutputPath)) {
    finalOutputPath = path.join(dir, `${baseName}(${counter})${extension}`);
    counter++;
  }

  return finalOutputPath;
}

export type ConvertOptions = {
  returnCommandString?: boolean;
  outputDir?: string;
  stripMetadata?: boolean;
  trim?: TrimOptions;
  onProgress?: (p: ProgressInfo) => void;
  signal?: AbortSignal;
};

/**
 * Build input-side trim flags for FFmpeg.
 * When both start and end are present, use `-ss <start> -t <duration>` to avoid
 * ambiguity from input-side `-to` (which is absolute in the source timeline).
 */
export function buildTrimArgs(trim: TrimOptions | undefined): string[] {
  if (!trim) return [];
  const parts: string[] = [];
  const start = parseTimeString(trim.start ?? "");
  const end = parseTimeString(trim.end ?? "");
  if (start !== null && start > 0) parts.push("-ss", toFfmpegTime(start));
  if (start !== null && start > 0 && end !== null && end > start) {
    parts.push("-t", toFfmpegTime(end - start));
  } else if (end !== null && end > 0) {
    parts.push("-to", toFfmpegTime(end));
  }
  return parts;
}

export async function convertMedia<T extends AllOutputExtension>(
  filePath: string,
  outputFormat: T,
  quality: QualitySettings,
  opts: ConvertOptions = {},
): Promise<string> {
  const ffmpegPath = await findFFmpegPath();

  // In theory, this should never happen
  if (!ffmpegPath) {
    throw new Error("FFmpeg is not installed or configured. Please install FFmpeg to use this converter.");
  }

  const { returnCommandString = false, outputDir, stripMetadata, trim, onProgress, signal } = opts;
  const trimArgs = buildTrimArgs(trim);
  const metadataArgs = stripMetadata ? ["-map_metadata", "-1"] : [];

  let ffmpegArgs = [...trimArgs, "-i"];
  const outputCategory = getOutputCategory(outputFormat);
  const currentMediaType = getMediaType(path.extname(filePath))!;

  // Helper to execute the final single-shot command, optionally with progress.
  const execWithOptionalProgress = async (spec: ProcessSpec): Promise<void> => {
    if (onProgress && (currentMediaType === "video" || outputCategory === "gif")) {
      const total = (await probeDurationSec(ffmpegPath.path, filePath)) ?? undefined;
      await runFFmpegWithProgress(spec, { totalDurationSec: total, onProgress, signal });
    } else {
      await runProcess(spec, signal);
    }
  };

  // Special handling: GIF output from a video input.
  if (outputCategory === "gif") {
    const gifQuality = quality as GifQuality;
    const gifSettings = gifQuality[".gif"];
    const finalOutputPath = getUniqueOutputPath(filePath, ".gif", outputDir);

    const fps = gifSettings.fps;
    const scale = gifSettings.width === "original" ? "iw" : gifSettings.width;
    const filterBase = `fps=${fps},scale=${scale}:-1:flags=lanczos`;
    const loopArg = gifSettings.loop ? "0" : "-1"; // 0 = infinite loop, -1 = no loop

    const tempPaletteFile = path.join(os.tmpdir(), `gif_palette_${Date.now()}.png`);
    const paletteSpec = {
      command: ffmpegPath.path,
      args: [...trimArgs, "-i", filePath, "-vf", `${filterBase},palettegen=stats_mode=diff`, "-y", tempPaletteFile],
    };
    const finalSpec = {
      command: ffmpegPath.path,
      args: [
        ...trimArgs,
        "-i",
        filePath,
        "-i",
        tempPaletteFile,
        "-lavfi",
        `${filterBase} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
        "-loop",
        loopArg,
        ...metadataArgs,
        "-y",
        finalOutputPath,
      ],
    };

    if (returnCommandString) {
      return `${formatProcessForDisplay(paletteSpec)}\n${formatProcessForDisplay(finalSpec)}`;
    }

    try {
      console.log(`Executing FFmpeg palette command: ${formatProcessForDisplay(paletteSpec)}`);
      await runProcess(paletteSpec, signal);
      console.log(`Executing FFmpeg GIF command: ${formatProcessForDisplay(finalSpec)}`);
      await execWithOptionalProgress(finalSpec);
      return finalOutputPath;
    } finally {
      if (fs.existsSync(tempPaletteFile)) {
        try {
          fs.unlinkSync(tempPaletteFile);
        } catch {
          /* ignore */
        }
      }
    }
  }

  switch (currentMediaType) {
    case "image": {
      const currentOutputFormat = outputFormat as OutputImageExtension;
      const imageQuality = quality as ImageQuality;
      const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat, outputDir);

      let tempHeicFile: string | null = null;
      let tempPaletteFile: string | null = null;
      const extension = path.extname(filePath).toLowerCase();
      let processedInputPath = filePath;

      try {
        // HEIC conversion is theoretically only available on macOS via the built-in SIPS utility.
        if (currentOutputFormat === ".heic") {
          const sipsSpec = {
            command: "sips",
            args: [
              "--setProperty",
              "format",
              "heic",
              "--setProperty",
              "formatOptions",
              String(imageQuality[".heic"]),
              filePath,
              "--out",
              finalOutputPath,
            ],
          };
          if (returnCommandString) {
            return formatProcessForDisplay(sipsSpec);
          }
          try {
            // Attempt HEIC conversion using SIPS directly
            await runProcess(sipsSpec, signal);
            if (stripMetadata) {
              // Best-effort metadata strip on macOS
              try {
                await runProcess({ command: "sips", args: ["-d", "all", finalOutputPath] }, signal);
              } catch (stripErr) {
                console.warn("SIPS metadata strip failed:", stripErr);
              }
            }
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
            if (returnCommandString) {
              // For command string, use original file (assuming user handles preprocessing)
              processedInputPath = filePath;
            } else {
              try {
                const tempFileName = `${path.basename(filePath, ".heic")}_temp_${Date.now()}.png`;
                tempHeicFile = path.join(os.tmpdir(), tempFileName);

                await runProcess(
                  {
                    command: "sips",
                    args: ["--setProperty", "format", "png", filePath, "--out", tempHeicFile],
                  },
                  signal,
                );

                processedInputPath = tempHeicFile;
              } catch (error) {
                console.error(`Error pre-processing HEIC file: ${filePath}`, error);
                if (tempHeicFile && fs.existsSync(tempHeicFile)) {
                  fs.unlinkSync(tempHeicFile);
                }
                throw new Error(`Failed to preprocess HEIC file: ${String(error)}`);
              }
            }
          }

          ffmpegArgs.push(processedInputPath);

          switch (currentOutputFormat) {
            case ".jpg":
              // mjpeg takes in 2 (best) to 31 (worst)
              ffmpegArgs.push("-q:v", String(Math.round(31 - (imageQuality[".jpg"] / 100) * 29)));
              break;
            case ".png":
              if (imageQuality[".png"] === "png-8") {
                if (returnCommandString) {
                  // For command string, assume palette is generated separately
                  const tempPaletteFileName = `${path.basename(filePath, path.extname(filePath))}_palette.png`;
                  tempPaletteFile = path.join(os.tmpdir(), tempPaletteFileName);
                  const paletteSpec = {
                    command: ffmpegPath.path,
                    args: ["-i", processedInputPath, "-vf", "palettegen=max_colors=256", "-y", tempPaletteFile],
                  };
                  const outputSpec = {
                    command: ffmpegPath.path,
                    args: [
                      "-i",
                      processedInputPath,
                      "-i",
                      tempPaletteFile,
                      "-lavfi",
                      "paletteuse=dither=bayer:bayer_scale=5",
                      "-compression_level",
                      "100",
                      ...metadataArgs,
                      "-y",
                      finalOutputPath,
                    ],
                  };
                  return `${formatProcessForDisplay(paletteSpec)}\n${formatProcessForDisplay(outputSpec)}`;
                } else {
                  const tempPaletteFileName = `${path.basename(filePath, path.extname(filePath))}_palette_${Date.now()}.png`;
                  tempPaletteFile = path.join(os.tmpdir(), tempPaletteFileName);

                  // Generate palette first
                  await runProcess(
                    {
                      command: ffmpegPath.path,
                      args: ["-i", processedInputPath, "-vf", "palettegen=max_colors=256", "-y", tempPaletteFile],
                    },
                    signal,
                  );
                  // Then apply palette
                  ffmpegArgs = [
                    "-i",
                    processedInputPath,
                    "-i",
                    tempPaletteFile,
                    "-lavfi",
                    "paletteuse=dither=bayer:bayer_scale=5",
                  ];
                }
              }
              if (!returnCommandString || imageQuality[".png"] !== "png-8") {
                ffmpegArgs.push("-compression_level", "100");
              }
              break;
            case ".webp":
              ffmpegArgs.push("-c:v", "libwebp");
              if (imageQuality[".webp"] === "lossless") {
                ffmpegArgs.push("-lossless", "1");
              } else {
                ffmpegArgs.push("-quality", String(imageQuality[".webp"]));
              }
              break;
            case ".tiff":
              ffmpegArgs.push("-compression_algo", imageQuality[".tiff"]);
              break;
            case ".avif":
              // libaom-av1 takes in 0 (best/lossless) to 63 (worst)
              ffmpegArgs.push(
                "-c:v",
                "libaom-av1",
                "-crf",
                String(Math.round(63 - (Number(imageQuality[".avif"]) / 100) * 63)),
                "-still-picture",
                "1",
              );
              break;
          }
          ffmpegArgs.push(...metadataArgs, "-y", finalOutputPath);
          const ffmpegSpec = { command: ffmpegPath.path, args: ffmpegArgs };
          if (returnCommandString) {
            return formatProcessForDisplay(ffmpegSpec);
          }
          console.log(`Executing FFmpeg image command: ${formatProcessForDisplay(ffmpegSpec)}`);
          await runProcess(ffmpegSpec, signal);
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
      const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat, outputDir);

      ffmpegArgs.push(filePath);

      switch (currentOutputFormat) {
        case ".mp3": {
          const mp3Settings = audioQuality[".mp3"];
          ffmpegArgs.push("-c:a", "libmp3lame");
          if (mp3Settings.vbr) {
            ffmpegArgs.push("-q:a", String(Math.round((320 - Number(mp3Settings.bitrate)) / 40)));
          } else {
            ffmpegArgs.push("-b:a", `${mp3Settings.bitrate}k`);
          }
          break;
        }
        case ".aac": {
          const aacSettings = audioQuality[".aac"];
          ffmpegArgs.push("-c:a", "aac", "-b:a", `${aacSettings.bitrate}k`);
          if (aacSettings.profile) {
            ffmpegArgs.push("-profile:a", aacSettings.profile);
          }
          break;
        }
        case ".m4a": {
          const m4aSettings = audioQuality[".m4a"];
          ffmpegArgs.push("-c:a", "aac", "-b:a", `${m4aSettings.bitrate}k`);
          if (m4aSettings.profile) {
            ffmpegArgs.push("-profile:a", m4aSettings.profile);
          }
          break;
        }
        case ".wav": {
          const wavSettings = audioQuality[".wav"];
          ffmpegArgs.push("-c:a", `pcm_s${wavSettings.bitDepth}le`, "-ar", wavSettings.sampleRate);
          break;
        }
        case ".flac": {
          const flacSettings = audioQuality[".flac"];
          ffmpegArgs.push(
            "-c:a",
            "flac",
            "-compression_level",
            flacSettings.compressionLevel,
            "-ar",
            flacSettings.sampleRate,
          );
          if (flacSettings.bitDepth === "24") {
            ffmpegArgs.push("-sample_fmt", "s32");
          }
          break;
        }
        default:
          throw new Error(`Unknown audio output format: ${currentOutputFormat}`);
      }

      ffmpegArgs.push(...metadataArgs, "-y", finalOutputPath);
      const ffmpegSpec = { command: ffmpegPath.path, args: ffmpegArgs };
      if (returnCommandString) {
        return formatProcessForDisplay(ffmpegSpec);
      }
      console.log(`Executing FFmpeg audio command: ${formatProcessForDisplay(ffmpegSpec)}`);
      await execWithOptionalProgress(ffmpegSpec);
      return finalOutputPath;
    }

    case "video": {
      const currentOutputFormat = outputFormat as OutputVideoExtension;
      const videoQuality = quality as VideoQuality;

      ffmpegArgs.push(filePath);

      // Add format-specific codec and settings
      switch (currentOutputFormat) {
        case ".mp4": {
          const mp4Quality = videoQuality[".mp4"];
          ffmpegArgs.push("-vcodec", "h264", "-acodec", "aac", "-preset", mp4Quality.preset);
          break;
        }
        case ".avi": {
          ffmpegArgs.push("-vcodec", "mpeg4", "-acodec", "mp3");
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
          ffmpegArgs.push(
            "-vcodec",
            "prores",
            "-profile:v",
            proresProfiles[movQuality.variant],
            "-acodec",
            "pcm_s16le",
          );
          break;
        }
        case ".mkv": {
          const mkvQuality = videoQuality[".mkv"];
          ffmpegArgs.push("-vcodec", "libx265", "-acodec", "aac", "-preset", mkvQuality.preset);
          break;
        }
        case ".mpg": {
          ffmpegArgs.push("-vcodec", "mpeg2video", "-acodec", "mp3");
          break;
        }
        case ".webm": {
          const webmQuality = videoQuality[".webm"];
          ffmpegArgs.push("-vcodec", "libvpx-vp9", "-acodec", "libopus", "-quality", webmQuality.quality);
          break;
        }
        default:
          throw new Error(`Unknown video output format: ${currentOutputFormat}`);
      }

      // Force common pixel format for compatibility, except for .mov which may use higher bit depths
      if (currentOutputFormat !== ".mov") {
        ffmpegArgs.push("-pix_fmt", "yuv420p");
      }

      // Handle encoding mode (unified for all formats except .mov)
      const finalOutputPath = getUniqueOutputPath(filePath, currentOutputFormat, outputDir);
      let logFilePrefix: string | null = null;

      if (currentOutputFormat !== ".mov") {
        const qualitySettings = videoQuality[currentOutputFormat];

        if ("encodingMode" in qualitySettings) {
          if (qualitySettings.encodingMode === "crf") {
            ffmpegArgs.push("-crf", String(convertQualityToCrf(qualitySettings.crf)));
          } else {
            // VBR or VBR 2-pass
            ffmpegArgs.push("-b:v", `${qualitySettings.bitrate}k`);

            if ("maxBitrate" in qualitySettings && qualitySettings.maxBitrate) {
              ffmpegArgs.push(
                "-maxrate",
                `${qualitySettings.maxBitrate}k`,
                "-bufsize",
                `${Number(qualitySettings.maxBitrate) * 2}k`,
              );
            }

            if (qualitySettings.encodingMode === "vbr-2-pass") {
              if (returnCommandString) {
                // For command string, include both passes
                logFilePrefix = path.join(os.tmpdir(), `ffmpeg2pass_${Date.now()}`);
                const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
                const firstPassSpec = {
                  command: ffmpegPath.path,
                  args: [...ffmpegArgs, "-pass", "1", "-passlogfile", logFilePrefix, "-f", "null", nullDevice],
                };
                const secondPassSpec = {
                  command: ffmpegPath.path,
                  args: [
                    ...ffmpegArgs,
                    ...metadataArgs,
                    "-pass",
                    "2",
                    "-passlogfile",
                    logFilePrefix,
                    "-y",
                    finalOutputPath,
                  ],
                };
                return `${formatProcessForDisplay(firstPassSpec)}\n${formatProcessForDisplay(secondPassSpec)}`;
              } else {
                // First pass - need to specify log file prefix for 2-pass encoding
                logFilePrefix = path.join(os.tmpdir(), `ffmpeg2pass_${Date.now()}`);
                const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
                const firstPassSpec = {
                  command: ffmpegPath.path,
                  args: [...ffmpegArgs, "-pass", "1", "-passlogfile", logFilePrefix, "-f", "null", nullDevice],
                };
                try {
                  await runProcess(firstPassSpec, signal);
                } catch (error) {
                  throw new Error(`First pass encoding failed: ${error}`);
                }
                // Second pass will be executed below
                ffmpegArgs.push("-pass", "2", "-passlogfile", logFilePrefix);
              }
            }
          }
        }
      }

      try {
        ffmpegArgs.push(...metadataArgs, "-y", finalOutputPath);
        const ffmpegSpec = { command: ffmpegPath.path, args: ffmpegArgs };
        if (returnCommandString) {
          return formatProcessForDisplay(ffmpegSpec);
        }
        console.log(`Executing FFmpeg video command: ${formatProcessForDisplay(ffmpegSpec)}`);
        await execWithOptionalProgress(ffmpegSpec);
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
