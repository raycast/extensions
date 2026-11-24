import { execFile } from "child_process";
import { accessSync, constants, existsSync } from "fs";
import { link, readdir, rename, rm, stat } from "fs/promises";
import { randomUUID } from "crypto";
import { homedir } from "os";
import { basename, dirname, extname, join } from "path";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

/** Places Homebrew (and friends) put ffmpeg. Raycast doesn't inherit your shell PATH. */
const FFMPEG_CANDIDATES = [
  "/opt/homebrew/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
  "/usr/bin/ffmpeg",
  join(homedir(), ".local/bin/ffmpeg"),
];

const GIFSICLE_CANDIDATES = [
  "/opt/homebrew/bin/gifsicle",
  "/usr/local/bin/gifsicle",
  "/usr/bin/gifsicle",
  join(homedir(), ".local/bin/gifsicle"),
];

export const VIDEO_EXTENSIONS = [".mov", ".mp4", ".m4v", ".avi", ".mkv", ".webm", ".mpg", ".mpeg", ".wmv", ".flv"];

export class FfmpegNotFoundError extends Error {
  constructor() {
    super("ffmpeg not found. Install it with `brew install ffmpeg`, or set the path in extension preferences.");
    this.name = "FfmpegNotFoundError";
  }
}

export function isVideoFile(path: string): boolean {
  return VIDEO_EXTENSIONS.includes(extname(path).toLowerCase());
}

function findExecutable(candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
}

export function resolveFfmpeg(): string {
  const { ffmpegPath } = getPreferenceValues<Preferences>();
  const found = findExecutable(ffmpegPath ? [ffmpegPath, ...FFMPEG_CANDIDATES] : FFMPEG_CANDIDATES);
  if (!found) {
    throw new FfmpegNotFoundError();
  }
  return found;
}

export function isFfmpegInstalled(): boolean {
  try {
    resolveFfmpeg();
    return true;
  } catch {
    return false;
  }
}

/** gifsicle is optional — returns undefined when it isn't installed. */
export function resolveGifsicle(): string | undefined {
  return findExecutable(GIFSICLE_CANDIDATES);
}

/** Adds " 1", " 2", … before the extension so we never clobber an existing GIF. */
function uniquePath(path: string): string {
  if (!existsSync(path)) {
    return path;
  }
  const dir = dirname(path);
  const stem = basename(path, ".gif");
  for (let i = 1; ; i++) {
    const candidate = join(dir, `${stem} ${i}.gif`);
    if (!existsSync(candidate)) {
      return candidate;
    }
  }
}

/** Best-effort delete; a missing file is the desired end state either way. */
async function discard(path: string): Promise<void> {
  await rm(path, { force: true }).catch(() => undefined);
}

/**
 * Moves `tempPath` to `desiredPath`, or to the next free " 1", " 2", … variant.
 *
 * `link` is the load-bearing detail: it creates the destination and fails with
 * EEXIST if something is already there, atomically. Checking with existsSync and
 * then renaming would leave a window in which a concurrent conversion claims the
 * same name, and rename would silently overwrite it.
 */
async function claimOutputPath(tempPath: string, desiredPath: string): Promise<string> {
  const dir = dirname(desiredPath);
  const stem = basename(desiredPath, ".gif");

  for (let attempt = 0; attempt < 10000; attempt++) {
    const candidate = attempt === 0 ? desiredPath : join(dir, `${stem} ${attempt}.gif`);
    try {
      await link(tempPath, candidate);
      await discard(tempPath);
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  }
  throw new Error(`Could not find a free filename for ${basename(desiredPath)}.`);
}

/**
 * Unique temp names mean a hard-killed run can't be cleaned up by its successor,
 * so old leftovers are swept here instead. The age floor is far longer than any
 * plausible conversion, so a temp belonging to a still-running invocation is
 * never removed.
 */
async function sweepStaleTemps(dir: string, prefix: string): Promise<void> {
  const maxAgeMs = 6 * 60 * 60 * 1000;
  try {
    const names = await readdir(dir);
    await Promise.all(
      names
        .filter((name) => name.startsWith(prefix) && name.endsWith(".part"))
        .map(async (name) => {
          const path = join(dir, name);
          try {
            const { mtimeMs } = await stat(path);
            if (Date.now() - mtimeMs > maxAgeMs) {
              await discard(path);
            }
          } catch {
            // Raced with another sweep, or vanished. Either way, nothing to do.
          }
        }),
    );
  } catch {
    // Unreadable directory — sweeping is best-effort.
  }
}

export function defaultOutputPath(inputPath: string): string {
  return uniquePath(join(dirname(inputPath), `${basename(inputPath, extname(inputPath))}.gif`));
}

/**
 * Post-encode gifsicle pass. Measured on a 5s 480px clip: lossy alone saves
 * 8-17%, dropping to 128 colors 22-35%, to 64 colors ~45%.
 */
export type OptimizeLevel = "off" | "balanced" | "aggressive" | "maximum";

const OPTIMIZE_ARGS: Record<Exclude<OptimizeLevel, "off">, string[]> = {
  balanced: ["-O3", "--lossy=80"],
  aggressive: ["-O3", "--lossy=80", "--colors=128"],
  maximum: ["-O3", "--lossy=120", "--colors=64"],
};

export interface ConvertOptions {
  inputPath: string;
  /**
   * Longest side of the output in pixels — orientation-independent, so 480
   * means 480x270 for landscape and 270x480 for portrait. Pass "original" to
   * skip scaling. Never upscales beyond the source.
   */
  maxSize: number | "original";
  fps: number;
  /** Seconds into the video to start. Omit or 0 to start at the beginning. */
  startTime?: number;
  /** Seconds of video to encode. Omit to run to the end. */
  duration?: number;
  loop: boolean;
  /** Runs hqdn3d after the downscale. Worth ~16% on grainy camera footage. */
  denoise?: boolean;
  optimize?: OptimizeLevel;
  outputPath?: string;
}

export interface Dimensions {
  width: number;
  height: number;
}

/** Source video dimensions, or undefined if they can't be read. */
export async function probeDimensions(inputPath: string): Promise<Dimensions | undefined> {
  let ffprobe: string;
  try {
    ffprobe = join(dirname(resolveFfmpeg()), "ffprobe");
  } catch {
    return undefined;
  }

  try {
    const { stdout } = await execFileAsync(ffprobe, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0",
      inputPath,
    ]);
    const [width, height] = stdout.trim().split(",").map(Number);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  } catch {
    // ffprobe missing or unreadable stream — callers fall back gracefully.
  }
  return undefined;
}

/**
 * The dimensions ffmpeg will actually produce for a given longest-side target:
 * aspect preserved, rounded to even numbers, never upscaled. Mirrors what
 * `force_original_aspect_ratio=decrease:force_divisible_by=2` does, so the UI
 * can show exact output sizes without running a conversion.
 */
export function outputDimensions(source: Dimensions, maxSize: number | "original"): Dimensions {
  const longest = Math.max(source.width, source.height);
  if (maxSize === "original" || maxSize >= longest) {
    return source;
  }
  const scale = maxSize / longest;
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(source.width), height: even(source.height) };
}

/**
 * Constrains the longest side to `maxSize` regardless of orientation.
 * `force_original_aspect_ratio=decrease` treats the w:h pair as a bounding box,
 * so a square box bounds whichever side is longer; `force_divisible_by=2` keeps
 * dimensions even. Hand-written if(gt(iw,ih),...) expressions don't survive the
 * filtergraph parser here, which is why this uses the built-in options.
 */
function scaleFilter(maxSize: number | "original"): string {
  if (maxSize === "original") {
    return "";
  }
  return `scale=${maxSize}:${maxSize}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,`;
}

/**
 * Two-pass palette conversion: generate an optimal 256-color palette from the
 * trimmed clip, then map frames onto it. Much better quality than ffmpeg's
 * default on-the-fly quantization, at the cost of decoding the input twice.
 */
export async function convertToGif(options: ConvertOptions): Promise<string> {
  const ffmpeg = resolveFfmpeg();
  const outputPath = options.outputPath ?? defaultOutputPath(options.inputPath);

  // ffmpeg writes here, and the result is renamed into place only once the whole
  // pipeline succeeds, so a failed or killed run never leaves a partial GIF at
  // outputPath. The suffix is unique per invocation: two commands converting the
  // same video pick the same outputPath (neither file exists yet), and a shared
  // temp path would let each clobber the other's intermediate.
  const outputDir = dirname(outputPath);
  const tempPrefix = `.${basename(outputPath)}.`;
  const tempPath = join(outputDir, `${tempPrefix}${process.pid}-${randomUUID().slice(0, 8)}.part`);
  await sweepStaleTemps(outputDir, tempPrefix);

  // -ss before -i seeks by keyframe (fast); ffmpeg re-syncs accurately on decode.
  const trimArgs: string[] = [];
  if (options.startTime && options.startTime > 0) {
    trimArgs.push("-ss", String(options.startTime));
  }
  if (options.duration && options.duration > 0) {
    trimArgs.push("-t", String(options.duration));
  }

  // Denoise goes *after* the downscale: applied at source resolution it barely
  // registers (14.88 -> 14.72 MB in testing), after scaling it saves ~16%.
  const denoise = options.denoise ? "hqdn3d=8:6:12:9," : "";

  // Clamp to the source so a small video is never upscaled into a bigger,
  // blurrier GIF than the original.
  let maxSize = options.maxSize;
  if (typeof maxSize === "number") {
    const source = await probeDimensions(options.inputPath);
    if (source) {
      maxSize = Math.min(maxSize, Math.max(source.width, source.height));
    }
  }

  const filters =
    `fps=${options.fps},${scaleFilter(maxSize)}${denoise}` +
    `split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...trimArgs,
    "-i",
    options.inputPath,
    "-filter_complex",
    filters,
    "-loop",
    options.loop ? "0" : "-1",
    // The temp file's extension is .part, so ffmpeg can't infer the muxer from
    // it the way it would from .gif.
    "-f",
    "gif",
    tempPath,
  ];

  try {
    await execFileAsync(ffmpeg, args, { maxBuffer: 10 * 1024 * 1024 });

    const level = options.optimize ?? "off";
    if (level !== "off") {
      const gifsicle = resolveGifsicle();
      // Silently skip when gifsicle isn't installed — the GIF is already valid.
      if (gifsicle) {
        try {
          await execFileAsync(gifsicle, [...OPTIMIZE_ARGS[level], tempPath, "-o", tempPath], {
            maxBuffer: 10 * 1024 * 1024,
          });
        } catch {
          // An optimization failure shouldn't lose the user their GIF.
        }
      }
    }

    // Only now does a file appear at the destination.
    if (options.outputPath) {
      // An explicit path means overwriting is what the caller asked for.
      await rename(tempPath, outputPath);
      return outputPath;
    }
    return await claimOutputPath(tempPath, outputPath);
  } catch (error) {
    await discard(tempPath);
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(stderr && stderr.length > 0 ? stderr.split("\n").slice(-3).join("\n") : String(error));
  }
}
