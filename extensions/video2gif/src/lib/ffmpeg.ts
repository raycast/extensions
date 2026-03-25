import { execa } from "execa";
import { existsSync } from "fs";
import { mkdtemp, rm } from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { ConversionSettings, ConversionProgress } from "../types";
import { parseTimeToSeconds } from "./video-utils";

const SEARCH_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"];

/**
 * Find a binary by checking common paths.
 * Throws a clear error if the binary is not found.
 */
function findBinary(name: string): string {
  for (const dir of SEARCH_PATHS) {
    const candidate = path.join(dir, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`${name} not found. Install it with: brew install ffmpeg`);
}

export function getFfmpegPath(): string {
  return findBinary("ffmpeg");
}

export function getFfprobePath(): string {
  return findBinary("ffprobe");
}

/**
 * Check if ffmpeg and ffprobe are available.
 * Returns null if both are found, or an error message string if not.
 */
export function checkDependencies(): string | null {
  try {
    findBinary("ffmpeg");
    findBinary("ffprobe");
    return null;
  } catch {
    return "FFmpeg is required but not installed. Run: brew install ffmpeg";
  }
}

/**
 * Build the video filter chain for FFmpeg.
 * Validates all inputs before interpolation.
 */
function buildFilterChain(settings: ConversionSettings, isForPalette: boolean): string {
  const filters: string[] = [];

  if (settings.speed <= 0 || !Number.isFinite(settings.speed)) {
    throw new Error(`Invalid speed value: ${settings.speed}`);
  }
  if (settings.fps <= 0 || !Number.isFinite(settings.fps) || settings.fps > 120) {
    throw new Error(`Invalid FPS value: ${settings.fps}`);
  }

  // Speed adjustment
  if (settings.speed !== 1) {
    filters.push(`setpts=${(1 / settings.speed).toFixed(4)}*PTS`);
  }

  // FPS
  filters.push(`fps=${settings.fps}`);

  // Scale — validate maxWidth is a safe integer before interpolation
  if (settings.maxWidth !== "original") {
    const width = parseInt(settings.maxWidth, 10);
    if (isNaN(width) || width <= 0 || width > 7680) {
      throw new Error(`Invalid max width: ${settings.maxWidth}`);
    }
    filters.push(`scale=${width}:-2:flags=lanczos`);
  }

  if (isForPalette) {
    filters.push("palettegen=stats_mode=diff");
  }

  return filters.join(",");
}

/**
 * Build trim arguments for FFmpeg
 */
function buildTrimArgs(settings: ConversionSettings): string[] {
  const args: string[] = [];

  if (settings.trimStart) {
    const startSeconds = parseTimeToSeconds(settings.trimStart);
    if (startSeconds > 0) {
      args.push("-ss", startSeconds.toString());
    }
  }

  if (settings.trimEnd) {
    const endSeconds = parseTimeToSeconds(settings.trimEnd);
    if (settings.trimStart) {
      const startSeconds = parseTimeToSeconds(settings.trimStart);
      const duration = endSeconds - startSeconds;
      if (duration > 0) {
        args.push("-t", duration.toString());
      }
    } else {
      args.push("-t", endSeconds.toString());
    }
  }

  return args;
}

/**
 * Convert a video to GIF using a two-pass palette approach for high quality.
 *
 * Pass 1: Generate an optimized color palette
 * Pass 2: Use the palette for the final GIF encoding
 *
 * @param onProgress - Called with progress updates during conversion
 */
export async function convertToGif(
  settings: ConversionSettings,
  outputPath: string,
  totalDuration: number,
  onProgress?: (progress: ConversionProgress) => void,
): Promise<void> {
  const ffmpeg = getFfmpegPath();
  const tmpDir = await mkdtemp(path.join(tmpdir(), "video2gif-"));
  const palettePath = path.join(tmpDir, "palette.png");
  const trimArgs = buildTrimArgs(settings);
  const inputPath = path.resolve(settings.inputPath);

  // Calculate effective duration for progress tracking
  let effectiveDuration = totalDuration;
  if (settings.trimStart || settings.trimEnd) {
    const start = settings.trimStart ? parseTimeToSeconds(settings.trimStart) : 0;
    const end = settings.trimEnd ? parseTimeToSeconds(settings.trimEnd) : totalDuration;
    effectiveDuration = end - start;
  }
  effectiveDuration = Math.max(0.1, effectiveDuration / settings.speed);

  try {
    // Pass 1: Generate palette
    const paletteFilter = buildFilterChain(settings, true);
    await execa(ffmpeg, ["-y", ...trimArgs, "-i", inputPath, "-vf", paletteFilter, palettePath]);

    // Pass 2: Generate GIF using palette
    const gifFilter = buildFilterChain(settings, false);
    const loopArg = settings.loopMode === "loop" ? "0" : "-1";

    const pass2 = execa(ffmpeg, [
      "-y",
      ...trimArgs,
      "-i",
      inputPath,
      "-i",
      palettePath,
      "-lavfi",
      `${gifFilter} [x]; [x][1:v] paletteuse=dither=sierra2_4a`,
      "-loop",
      loopArg,
      "-progress",
      "pipe:1",
      outputPath,
    ]);

    // Parse progress from stdout
    if (onProgress && pass2.stdout) {
      const startTime = Date.now();
      let lastPercentage = 0;

      pass2.stdout.on("data", (data: Buffer) => {
        const output = data.toString();
        const timeMatch = output.match(/out_time_us=(\d+)/);
        if (timeMatch) {
          const currentTimeUs = parseInt(timeMatch[1], 10);
          const currentTimeSec = currentTimeUs / 1_000_000;
          const percentage = Math.max(0, Math.min(Math.round((currentTimeSec / effectiveDuration) * 100), 99));

          if (percentage > lastPercentage) {
            lastPercentage = percentage;
            const elapsedMs = Date.now() - startTime;
            const estimatedTotalMs = percentage > 0 ? (elapsedMs / percentage) * 100 : 0;
            const estimatedRemainingMs = Math.max(0, estimatedTotalMs - elapsedMs);

            onProgress({
              percentage,
              elapsedMs,
              estimatedRemainingMs,
            });
          }
        }
      });
    }

    await pass2;

    // Signal 100% completion
    if (onProgress) {
      onProgress({ percentage: 100, elapsedMs: 0, estimatedRemainingMs: 0 });
    }
  } finally {
    // Clean up temp directory
    try {
      await rm(tmpDir, { recursive: true });
    } catch (error) {
      console.warn("Failed to clean up temp directory:", error);
    }
  }
}
