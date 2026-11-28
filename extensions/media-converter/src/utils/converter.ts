import path from "path";
import fs from "fs";
import os from "os";
import { getPreferenceValues, trash } from "@raycast/api";
import { findFFmpegPath, MIN_FFMPEG_HEIC_INPUT_VERSION, supportsHeicInput } from "./ffmpeg";
import {
  buildAvifArgs,
  getAvailableEncoders,
  mapPresetToAomCpuUsed,
  mapPresetToNvenc,
  mapPresetToSvtAv1,
  missingEncoderError,
  pickAv1VideoEncoder,
  pickAvifEncoder,
  qualityPercentToCrf,
  type Av1VideoEncoder,
} from "./encoders";
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
  VideoCodec,
  VideoPreset,
  GifQuality,
  getMediaType,
  getOutputCategory,
  Percentage,
  TrimOptions,
} from "../types/media";

function convertQualityToCrf(qualityPercentage: Percentage): number {
  return qualityPercentToCrf(qualityPercentage, 51);
}

export function shouldPreserveFileDates(stripMetadata?: boolean): boolean {
  if (stripMetadata) return false;
  try {
    const prefs = getPreferenceValues<Preferences>();
    return prefs.preserveFileDates !== false;
  } catch {
    return true;
  }
}

/** Copy original file's Date Modified (mtime) & Date Accessed (atime) to the converted output. */
export function preserveFileTimestamps(sourcePath: string, targetPath: string): void {
  try {
    const stat = fs.statSync(sourcePath);
    fs.utimesSync(targetPath, stat.atime, stat.mtime);
  } catch (error) {
    console.warn("Failed to preserve file timestamps:", error);
  }
}

/**
 * Replace `targetPath` with `tempPath` by moving the original to the OS Trash / Recycle Bin first.
 * Never permanently deletes the user's original file if Trash is unavailable.
 */
export async function replaceFileSafely(tempPath: string, targetPath: string): Promise<void> {
  try {
    await trash(targetPath);
  } catch (error) {
    throw new Error(
      `Could not move "${path.basename(targetPath)}" to the Trash / Recycle Bin (${String(error)}). The original file was kept.`,
    );
  }
  if (fs.existsSync(targetPath)) {
    throw new Error(
      `Could not move "${path.basename(targetPath)}" to the Trash / Recycle Bin. The original file was kept.`,
    );
  }
  fs.renameSync(tempPath, targetPath);
}

/**
 * Move `targetPath` to the OS Trash / Recycle Bin.
 * Never permanently deletes the user's original file if Trash is unavailable.
 */
export async function trashFileSafely(targetPath: string): Promise<void> {
  try {
    await trash(targetPath);
  } catch (error) {
    throw new Error(
      `Could not move "${path.basename(targetPath)}" to the Trash / Recycle Bin (${String(error)}). The original file was kept.`,
    );
  }
  if (fs.existsSync(targetPath)) {
    throw new Error(
      `Could not move "${path.basename(targetPath)}" to the Trash / Recycle Bin. The original file was kept.`,
    );
  }
}

function isSameFilePath(a: string, b: string): boolean {
  const ra = path.resolve(a);
  const rb = path.resolve(b);
  return process.platform === "win32" ? ra.toLowerCase() === rb.toLowerCase() : ra === rb;
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
  replaceOriginal?: boolean;
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

  const { returnCommandString = false, outputDir, stripMetadata, replaceOriginal, trim, onProgress, signal } = opts;
  const trimArgs = buildTrimArgs(trim);
  const metadataArgs = stripMetadata ? ["-map_metadata", "-1"] : ["-map_metadata", "0"];
  const keepDates = shouldPreserveFileDates(stripMetadata);

  const resolveWriteTarget = (ext: string): { writePath: string; replaceInPlace: boolean } => {
    const dir = outputDir && outputDir.length > 0 ? outputDir : path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    const directPath = path.join(dir, `${baseName}${ext}`);
    const replaceInPlace = Boolean(replaceOriginal) && !returnCommandString && isSameFilePath(directPath, filePath);
    if (replaceInPlace) {
      const tmp = path.join(
        dir,
        `${baseName}.convert-tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`,
      );
      return { writePath: tmp, replaceInPlace: true };
    }
    return { writePath: getUniqueOutputPath(filePath, ext, outputDir), replaceInPlace: false };
  };

  const finalizeOutput = async (writePath: string, replaceInPlace: boolean): Promise<string> => {
    if (keepDates) preserveFileTimestamps(filePath, writePath);
    if (replaceInPlace) {
      await replaceFileSafely(writePath, filePath);
      return filePath;
    }
    if (replaceOriginal && !returnCommandString) {
      await trashFileSafely(filePath);
    }
    return writePath;
  };

  const cleanupTempOutput = (writePath: string, replaceInPlace: boolean): void => {
    if (replaceInPlace && fs.existsSync(writePath)) {
      try {
        fs.unlinkSync(writePath);
      } catch {
        /* ignore temp cleanup error */
      }
    }
  };

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
    const { writePath: finalOutputPath, replaceInPlace } = resolveWriteTarget(".gif");

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
      return await finalizeOutput(finalOutputPath, replaceInPlace);
    } catch (error) {
      cleanupTempOutput(finalOutputPath, replaceInPlace);
      throw error;
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
      const { writePath: finalOutputPath, replaceInPlace } = resolveWriteTarget(currentOutputFormat);

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
          let decodedHeicDirectly = false;
          // If the input file is HEIC and the output format is not HEIC:
          // - macOS uses `sips` to pre-convert HEIC to PNG.
          // - Windows/Linux with FFmpeg 7.0+ decodes HEIC natively (pre-decoding to PNG only for
          //   PNG-8 palettegen, because FFmpeg cannot chain `-vf` onto tiled HEIC's internal graph).
          if (extension === ".heic") {
            if (!supportsHeicInput(ffmpegPath.version)) {
              throw new Error(
                `HEIC input requires macOS or FFmpeg ${MIN_FFMPEG_HEIC_INPUT_VERSION}+ (found FFmpeg v${ffmpegPath.version}).`,
              );
            }
            if (returnCommandString) {
              // For command string, use original file (assuming user handles preprocessing)
              processedInputPath = filePath;
              if (process.platform !== "darwin") {
                decodedHeicDirectly = true;
              }
            } else if (process.platform === "darwin") {
              try {
                const tempFileName = `${path.basename(filePath, path.extname(filePath))}_temp_${Date.now()}.png`;
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
            } else if (currentOutputFormat === ".png" && imageQuality[".png"] === "png-8") {
              try {
                const tempFileName = `${path.basename(filePath, path.extname(filePath))}_temp_${Date.now()}.png`;
                tempHeicFile = path.join(os.tmpdir(), tempFileName);

                await runProcess(
                  {
                    command: ffmpegPath.path,
                    args: ["-i", filePath, "-frames:v", "1", "-compression_level", "1", "-y", tempHeicFile],
                  },
                  signal,
                );

                processedInputPath = tempHeicFile;
              } catch (error) {
                console.error(`Error pre-processing HEIC file with FFmpeg: ${filePath}`, error);
                if (tempHeicFile && fs.existsSync(tempHeicFile)) {
                  fs.unlinkSync(tempHeicFile);
                }
                throw new Error(`Failed to decode HEIC file with FFmpeg: ${String(error)}`);
              }
            } else {
              processedInputPath = filePath;
              decodedHeicDirectly = true;
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
            case ".webp": {
              const encoders = await getAvailableEncoders(ffmpegPath.path);
              if (encoders && !encoders.has("libwebp")) {
                throw missingEncoderError("WebP", "libwebp");
              }
              ffmpegArgs.push("-c:v", "libwebp");
              if (imageQuality[".webp"] === "lossless") {
                ffmpegArgs.push("-lossless", "1");
              } else {
                ffmpegArgs.push("-quality", String(imageQuality[".webp"]));
              }
              break;
            }
            case ".tiff":
              ffmpegArgs.push("-compression_algo", imageQuality[".tiff"]);
              break;
            case ".avif": {
              const avifEncoder = pickAvifEncoder(await getAvailableEncoders(ffmpegPath.path));
              if (!avifEncoder) {
                throw missingEncoderError("AVIF", "libaom-av1 or libsvtav1");
              }
              ffmpegArgs.push(...buildAvifArgs(avifEncoder, Number(imageQuality[".avif"])));
              break;
            }
          }
          if (decodedHeicDirectly) {
            ffmpegArgs.push("-frames:v", "1");
          }
          ffmpegArgs.push(...metadataArgs, "-y", finalOutputPath);
          const ffmpegSpec = { command: ffmpegPath.path, args: ffmpegArgs };
          if (returnCommandString) {
            return formatProcessForDisplay(ffmpegSpec);
          }
          console.log(`Executing FFmpeg image command: ${formatProcessForDisplay(ffmpegSpec)}`);
          await runProcess(ffmpegSpec, signal);
        }
        return await finalizeOutput(finalOutputPath, replaceInPlace);
      } catch (error) {
        cleanupTempOutput(finalOutputPath, replaceInPlace);
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
      const { writePath: finalOutputPath, replaceInPlace } = resolveWriteTarget(currentOutputFormat);

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
      try {
        await execWithOptionalProgress(ffmpegSpec);
        return await finalizeOutput(finalOutputPath, replaceInPlace);
      } catch (error) {
        cleanupTempOutput(finalOutputPath, replaceInPlace);
        throw error;
      }
    }

    case "video": {
      const currentOutputFormat = outputFormat as OutputVideoExtension;
      const videoQuality = quality as VideoQuality;

      ffmpegArgs.push(filePath);

      let resolvedAv1Encoder: Av1VideoEncoder | null = null;
      let isNvencEncoder = false;

      // Add format-specific codec and settings
      switch (currentOutputFormat) {
        case ".mp4":
        case ".mkv": {
          const containerQuality = videoQuality[currentOutputFormat];
          const codec: VideoCodec = containerQuality.codec ?? (currentOutputFormat === ".mkv" ? "hevc" : "h264");
          const preset: VideoPreset = containerQuality.preset;

          if (codec === "h264") {
            ffmpegArgs.push("-vcodec", "h264", "-acodec", "aac", "-preset", preset);
          } else if (codec === "h264-nvenc") {
            const encoders = await getAvailableEncoders(ffmpegPath.path);
            if (encoders && !encoders.has("h264_nvenc")) {
              throw missingEncoderError(`${currentOutputFormat.toUpperCase()} (H.264 NVENC)`, "h264_nvenc");
            }
            isNvencEncoder = true;
            ffmpegArgs.push("-c:v", "h264_nvenc", "-preset", mapPresetToNvenc(preset), "-c:a", "aac");
          } else if (codec === "hevc") {
            ffmpegArgs.push("-vcodec", "libx265", "-acodec", "aac", "-preset", preset);
            if (currentOutputFormat === ".mp4") {
              ffmpegArgs.push("-tag:v", "hvc1");
            }
          } else if (codec === "hevc-nvenc") {
            const encoders = await getAvailableEncoders(ffmpegPath.path);
            if (encoders && !encoders.has("hevc_nvenc")) {
              throw missingEncoderError(`${currentOutputFormat.toUpperCase()} (H.265 NVENC)`, "hevc_nvenc");
            }
            isNvencEncoder = true;
            ffmpegArgs.push("-c:v", "hevc_nvenc", "-preset", mapPresetToNvenc(preset), "-c:a", "aac");
            if (currentOutputFormat === ".mp4") {
              ffmpegArgs.push("-tag:v", "hvc1");
            }
          } else {
            const encoders = await getAvailableEncoders(ffmpegPath.path);
            resolvedAv1Encoder = pickAv1VideoEncoder(codec, encoders);
            if (!resolvedAv1Encoder) {
              const requested = codec === "av1-nvenc" ? "av1_nvenc" : "libsvtav1 or libaom-av1";
              throw missingEncoderError(`${currentOutputFormat.toUpperCase()} (AV1)`, requested);
            }
            if (resolvedAv1Encoder === "av1_nvenc") {
              isNvencEncoder = true;
              ffmpegArgs.push("-c:v", "av1_nvenc", "-preset", mapPresetToNvenc(preset), "-c:a", "aac");
            } else if (resolvedAv1Encoder === "libsvtav1") {
              ffmpegArgs.push("-c:v", "libsvtav1", "-preset", mapPresetToSvtAv1(preset), "-c:a", "aac");
            } else {
              ffmpegArgs.push(
                "-c:v",
                "libaom-av1",
                "-cpu-used",
                mapPresetToAomCpuUsed(preset),
                "-row-mt",
                "1",
                "-c:a",
                "aac",
              );
            }
          }
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
      const { writePath: finalOutputPath, replaceInPlace } = resolveWriteTarget(currentOutputFormat);
      const mp4FaststartArgs = currentOutputFormat === ".mp4" ? ["-movflags", "+faststart"] : [];
      let logFilePrefix: string | null = null;

      if (currentOutputFormat !== ".mov") {
        const qualitySettings = videoQuality[currentOutputFormat];

        if ("encodingMode" in qualitySettings) {
          if (qualitySettings.encodingMode === "crf") {
            if (isNvencEncoder) {
              if (qualitySettings.crf >= 100) {
                ffmpegArgs.push("-rc", "constqp", "-qp", "0");
              } else {
                const cq = Math.max(1, qualityPercentToCrf(qualitySettings.crf, 51));
                ffmpegArgs.push("-rc", "vbr", "-cq", String(cq), "-b:v", "0");
              }
            } else if (resolvedAv1Encoder === "libsvtav1") {
              ffmpegArgs.push("-crf", String(qualityPercentToCrf(qualitySettings.crf, 63)));
            } else if (resolvedAv1Encoder === "libaom-av1") {
              ffmpegArgs.push("-crf", String(qualityPercentToCrf(qualitySettings.crf, 63)), "-b:v", "0");
            } else {
              ffmpegArgs.push("-crf", String(convertQualityToCrf(qualitySettings.crf)));
            }
          } else {
            // VBR or VBR 2-pass
            if (isNvencEncoder) {
              ffmpegArgs.push("-rc", "vbr");
              if (qualitySettings.encodingMode === "vbr-2-pass") {
                ffmpegArgs.push("-multipass", "fullres");
              }
            }
            ffmpegArgs.push("-b:v", `${qualitySettings.bitrate}k`);

            if ("maxBitrate" in qualitySettings && qualitySettings.maxBitrate) {
              ffmpegArgs.push(
                "-maxrate",
                `${qualitySettings.maxBitrate}k`,
                "-bufsize",
                `${Number(qualitySettings.maxBitrate) * 2}k`,
              );
            }

            if (qualitySettings.encodingMode === "vbr-2-pass" && !isNvencEncoder) {
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
                    ...mp4FaststartArgs,
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
        ffmpegArgs.push(...mp4FaststartArgs, ...metadataArgs, "-y", finalOutputPath);
        const ffmpegSpec = { command: ffmpegPath.path, args: ffmpegArgs };
        if (returnCommandString) {
          return formatProcessForDisplay(ffmpegSpec);
        }
        console.log(`Executing FFmpeg video command: ${formatProcessForDisplay(ffmpegSpec)}`);
        await execWithOptionalProgress(ffmpegSpec);
        return await finalizeOutput(finalOutputPath, replaceInPlace);
      } catch (error) {
        cleanupTempOutput(finalOutputPath, replaceInPlace);
        throw error;
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
