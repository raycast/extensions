import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdtemp, stat } from "fs/promises";
import { tmpdir } from "os";
import { basename, extname, join } from "path";
import { Provider, UserError } from "../types";

const AUDIO_EXTENSIONS = new Set([
  ".aac",
  ".aif",
  ".aiff",
  ".alac",
  ".amr",
  ".au",
  ".caf",
  ".flac",
  ".m4a",
  ".m4b",
  ".m4p",
  ".m4r",
  ".mp3",
  ".mpa",
  ".mpc",
  ".ogg",
  ".oga",
  ".opus",
  ".ra",
  ".ram",
  ".wav",
  ".wma",
  ".webm",
  ".weba",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".m4v",
  ".mov",
  ".mkv",
  ".avi",
  ".wmv",
  ".flv",
  ".f4v",
  ".webm",
  ".mpeg",
  ".mpg",
  ".3gp",
  ".3gpp",
  ".ts",
  ".mts",
]);

// Local safety ceiling: even with streaming providers, Raycast memory and UI
// limits make multi-GB uploads impractical. 500 MB is a generous ceiling for a
// desktop extension until true streaming is implemented.
export const LOCAL_MAX_SIZE_MB = 500;

export function isAudioFile(filePath: string): boolean {
  return AUDIO_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isVideoFile(filePath: string): boolean {
  return VIDEO_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isSupportedMediaFile(filePath: string): boolean {
  return isAudioFile(filePath) || isVideoFile(filePath);
}

export async function ffmpegInstalled(): Promise<boolean> {
  try {
    await runCommand("ffmpeg", ["-version"], undefined, 5_000);
    return true;
  } catch {
    return false;
  }
}

export async function ffprobeInstalled(): Promise<boolean> {
  try {
    await runCommand("ffprobe", ["-version"], undefined, 5_000);
    return true;
  } catch {
    return false;
  }
}

export async function getAudioDuration(filePath: string): Promise<number | undefined> {
  try {
    const { stdout } = await runCommand(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
      undefined,
      10_000,
    );
    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? undefined : duration;
  } catch {
    return undefined;
  }
}

export function getFormatName(filePath: string): string {
  return extname(filePath).toLowerCase().replace(/^\./, "");
}

export function getBasename(filePath: string): string {
  return basename(filePath);
}

export function getProviderFilename(filePath: string): string {
  const name = getBasename(filePath);
  // Ensure a recognisable extension for providers that sniff the filename.
  return name;
}

export function formatMimeType(filePath: string, provider: Provider): string {
  const ext = getFormatName(filePath);
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    m4a: "audio/mp4",
    wav: "audio/wav",
    webm: provider === "openai" ? "audio/webm" : "video/webm",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    opus: "audio/opus",
    flac: "audio/flac",
    aac: "audio/aac",
    aiff: "audio/aiff",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
    "3gp": "video/3gpp",
    "3gpp": "video/3gpp",
  };
  return map[ext] || (provider === "openai" ? "audio/mpeg" : "application/octet-stream");
}

export async function getFileSizeMb(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size / (1024 * 1024);
}

export async function prepareUploadFile(
  filePath: string,
  provider: Provider,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<{ path: string; isTemporary: boolean; tempDir?: string } | undefined> {
  if (!existsSync(filePath)) {
    throw new UserError(`File does not exist: ${filePath}`);
  }

  const sizeMb = await getFileSizeMb(filePath);
  if (sizeMb > LOCAL_MAX_SIZE_MB) {
    throw new UserError(
      `This file is ${Math.round(sizeMb)} MB, which exceeds the local ` +
        `${LOCAL_MAX_SIZE_MB} MB limit for this extension.`,
    );
  }

  const extension = getFormatName(filePath);
  const providerConfig = {
    openai: ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"],
    deepgram: ["mp3", "mp4", "wav", "webm", "flac", "aac", "m4a", "ogg", "oga", "opus"],
    elevenlabs: [
      "aac",
      "aiff",
      "ogg",
      "mp3",
      "opus",
      "wav",
      "flac",
      "m4a",
      "webm",
      "mp4",
      "avi",
      "mkv",
      "mov",
      "wmv",
      "flv",
      "mpeg",
      "3gpp",
    ],
  }[provider];

  const needsOpenAiResize = provider === "openai" && sizeMb > 25;

  // Direct upload is fine.
  if (providerConfig.includes(extension) && !needsOpenAiResize) {
    return { path: filePath, isTemporary: false };
  }

  // Need conversion. ffmpeg is required only here.
  if (!(await ffmpegInstalled())) {
    throw new UserError(
      "ffmpeg is required to convert this file for the selected provider. Install it via Homebrew: `brew install ffmpeg`.",
    );
  }

  if (isVideoFile(filePath) || needsOpenAiResize) {
    const { path: targetPath, tempDir } = await extractAudioFromVideo(filePath, onProgress, signal);
    if (provider === "openai") {
      const convertedSizeMb = await getFileSizeMb(targetPath);
      if (convertedSizeMb > 25) {
        await cleanupFile(targetPath);
        await cleanupFile(tempDir).catch(() => undefined);
        throw new UserError(
          "OpenAI only supports files up to 25 MB. This recording is too long even after compression.",
        );
      }
    }
    return { path: targetPath, isTemporary: true, tempDir };
  }

  const { path: targetPath, tempDir } = await convertToMp3(filePath, onProgress, signal);
  if (provider === "openai") {
    const convertedSizeMb = await getFileSizeMb(targetPath);
    if (convertedSizeMb > 25) {
      await cleanupFile(targetPath);
      await cleanupFile(tempDir).catch(() => undefined);
      throw new UserError("OpenAI only supports files up to 25 MB. This recording is too long even after compression.");
    }
  }
  return { path: targetPath, isTemporary: true, tempDir };
}

export async function cleanupFile(filePath: string | undefined): Promise<void> {
  if (!filePath) return;
  try {
    const { rm } = await import("fs/promises");
    await rm(filePath, { recursive: true, force: true });
  } catch {
    // Best effort; ignore failures.
  }
}

export async function convertToMp3(
  sourcePath: string,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<{ path: string; tempDir: string }> {
  if (!existsSync(sourcePath)) {
    throw new UserError(`Source file does not exist: ${sourcePath}`);
  }
  onProgress?.("Converting to MP3…");
  return runFfmpegConversion(sourcePath, "mp3", signal);
}

export async function extractAudioFromVideo(
  sourcePath: string,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<{ path: string; tempDir: string }> {
  if (!existsSync(sourcePath)) {
    throw new UserError(`Source file does not exist: ${sourcePath}`);
  }
  onProgress?.("Extracting audio from video…");
  return runFfmpegConversion(sourcePath, "mp3", signal);
}

async function runFfmpegConversion(
  sourcePath: string,
  outputFormat: "mp3" | "ogg" | "wav",
  signal?: AbortSignal,
): Promise<{ path: string; tempDir: string }> {
  const dir = await mkdtemp(join(tmpdir(), "transcribe-"));
  const baseName = basename(sourcePath, extname(sourcePath));
  const targetPath = join(dir, `${baseName}.${outputFormat}`);

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    sourcePath,
    "-vn",
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    outputFormat === "mp3" ? "libmp3lame" : outputFormat === "ogg" ? "libopus" : "pcm_s16le",
    outputFormat === "mp3" ? "-q:a" : "",
    outputFormat === "mp3" ? "4" : "",
    targetPath,
  ].filter(Boolean);

  try {
    await runCommand("ffmpeg", args, signal, 600_000);
  } catch (err) {
    await cleanupFile(targetPath);
    await cleanupFile(dir).catch(() => undefined);
    throw err;
  }

  if (signal?.aborted) {
    await cleanupFile(targetPath);
    await cleanupFile(dir).catch(() => undefined);
    throw new Error("Conversion aborted.");
  }

  return { path: targetPath, tempDir: dir };
}

function runCommand(
  command: string,
  args: string[],
  signal?: AbortSignal,
  timeoutMs = 60_000,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      signal: signal as AbortSignal | undefined,
    });

    let stdout = "";
    let stderr = "";
    const stderrBuffer: string[] = [];
    const maxStderrLines = 20;

    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      stderrBuffer.push(text);
      if (stderrBuffer.length > maxStderrLines) {
        stderrBuffer.shift();
      }
    });

    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} failed (code ${code}): ${stderrBuffer.join("").slice(-400)}`));
      }
    });
  });
}
