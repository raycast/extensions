import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { rename, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { EncodeSettings } from "./history";
import { encodeGifNative, MediaInfo, probeMedia } from "./native";
import { prefs } from "./prefs";

const run = promisify(execFile);
const BREW_BINS = ["/opt/homebrew/bin", "/usr/local/bin"];

/** Slack's inline preview limit, and a sane default for chat apps in general. */
export const SHARE_LIMIT_BYTES = 10 * 1024 * 1024;

export class MissingToolError extends Error {}

function findBinary(name: string, override?: string): string | undefined {
  const candidates = [override?.trim(), ...BREW_BINS.map((dir) => join(dir, name))];

  return candidates.find((candidate): candidate is string => !!candidate && existsSync(candidate));
}

export function ffmpegPath(): string {
  const path = findBinary("ffmpeg", prefs().ffmpegPath);
  if (!path) {
    throw new MissingToolError(
      'ffmpeg not found. Install it with "brew install ffmpeg", or pick the built-in encoder.',
    );
  }

  return path;
}

export function gifskiPath(): string | undefined {
  return findBinary("gifski");
}

export type Encoder = "builtin" | "ffmpeg" | "gifski";

/**
 * "auto" prefers gifski (sharpest), then ffmpeg (smallest), then the built-in
 * encoder, which needs nothing installed. gifski decodes through ffmpeg.
 */
export function encoderName(): Encoder {
  const choice = prefs().encoder;
  const hasFfmpeg = !!findBinary("ffmpeg", prefs().ffmpegPath);
  if (choice === "gifski" && !(gifskiPath() && hasFfmpeg)) {
    throw new MissingToolError('gifski needs both gifski and ffmpeg: "brew install gifski ffmpeg".');
  }

  if (choice === "ffmpeg") {
    ffmpegPath();
  }

  if (choice !== "auto") {
    return choice;
  }

  if (hasFfmpeg) {
    return gifskiPath() ? "gifski" : "ffmpeg";
  }

  return "builtin";
}

export type { MediaInfo };

export function probe(path: string): Promise<MediaInfo> {
  return probeMedia(path);
}

function inputArgs(moviePath: string, settings: EncodeSettings): string[] {
  const trim = [
    ...(settings.start > 0 ? ["-ss", settings.start.toFixed(2)] : []),
    ...(settings.end !== undefined ? ["-to", settings.end.toFixed(2)] : []),
  ];

  return ["-v", "error", "-y", ...trim, "-i", moviePath];
}

function scaleFilter(settings: EncodeSettings): string {
  const scale = settings.maxWidth > 0 ? `,scale='min(${settings.maxWidth},iw)':-2:flags=lanczos` : "";

  return `fps=${settings.fps}${scale}`;
}

async function encodeWithFfmpeg(moviePath: string, gifPath: string, settings: EncodeSettings) {
  const graph = [
    `${scaleFilter(settings)},split[a][b]`,
    "[a]palettegen=stats_mode=diff[p]",
    "[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
  ].join(";");
  await run(ffmpegPath(), [...inputArgs(moviePath, settings), "-vf", graph, "-loop", "0", gifPath]);
}

/** ffmpeg decodes and scales, gifski quantizes: sharper colors, bigger files. */
function encodeWithGifski(moviePath: string, gifPath: string, settings: EncodeSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    const decoder = spawn(ffmpegPath(), [
      ...inputArgs(moviePath, settings),
      "-vf",
      scaleFilter(settings),
      "-f",
      "yuv4mpegpipe",
      "-",
    ]);
    const encoder = spawn(gifskiPath()!, ["--fps", String(settings.fps), "--quality", "90", "-o", gifPath, "-"]);
    let stderr = "";
    decoder.stderr.on("data", (chunk) => (stderr += chunk));
    encoder.stderr.on("data", (chunk) => (stderr += chunk));
    decoder.stdout.pipe(encoder.stdin);
    decoder.on("error", reject);
    encoder.on("error", reject);
    encoder.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.trim() || `gifski exited ${code}`)),
    );
  });
}

export interface EncodeResult {
  size: number;
  width: number;
  height: number;
}

export async function encodeGif(moviePath: string, gifPath: string, settings: EncodeSettings): Promise<EncodeResult> {
  // Write next to the target, then swap, so a failed re-encode keeps the old GIF.
  // Unique per call, so two encodes of the same capture never share a temp file.
  const tempPath = `${gifPath}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp.gif`;
  const encoder = encoderName();
  if (encoder === "gifski") {
    await encodeWithGifski(moviePath, tempPath, settings);
  } else if (encoder === "ffmpeg") {
    await encodeWithFfmpeg(moviePath, tempPath, settings);
  } else {
    await encodeGifNative({
      input: moviePath,
      output: tempPath,
      fps: settings.fps,
      maxWidth: settings.maxWidth,
      start: settings.start,
      end: settings.end ?? null,
    });
  }

  await rename(tempPath, gifPath);
  const [{ size }, info] = await Promise.all([stat(gifPath), probe(gifPath)]);

  return { size, width: info.width, height: info.height };
}

/** Progressively cheaper settings, tried in order until the GIF fits. */
const FIT_LADDER: Pick<EncodeSettings, "fps" | "maxWidth">[] = [
  { fps: 15, maxWidth: 1000 },
  { fps: 12, maxWidth: 800 },
  { fps: 10, maxWidth: 720 },
  { fps: 10, maxWidth: 600 },
  { fps: 8, maxWidth: 480 },
  { fps: 6, maxWidth: 400 },
];

export async function encodeToFit(
  moviePath: string,
  gifPath: string,
  settings: EncodeSettings,
  limit = SHARE_LIMIT_BYTES,
): Promise<{ result: EncodeResult; settings: EncodeSettings }> {
  const effectiveWidth = (s: Pick<EncodeSettings, "maxWidth">) => s.maxWidth || Infinity;
  const steps = FIT_LADDER.filter(
    (step) => step.fps <= settings.fps && effectiveWidth(step) <= effectiveWidth(settings),
  ).map((step) => ({ ...settings, ...step }));

  let last: { result: EncodeResult; settings: EncodeSettings } | undefined;
  for (const candidate of steps) {
    last = { result: await encodeGif(moviePath, gifPath, candidate), settings: candidate };
    if (last.result.size <= limit) {
      return last;
    }
  }

  if (!last) {
    const smallest = { ...settings, ...FIT_LADDER[FIT_LADDER.length - 1] };
    last = { result: await encodeGif(moviePath, gifPath, smallest), settings: smallest };
  }

  return last;
}

export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatSeconds(seconds: number): string {
  const whole = Math.max(0, seconds);
  const minutes = Math.floor(whole / 60);
  const rest = (whole % 60).toFixed(1).padStart(4, "0");

  return `${minutes}:${rest}`;
}
