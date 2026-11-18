import { spawn, type ChildProcess } from "child_process";
import { pipeline } from "stream/promises";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { findExecutable, findFFmpegTools } from "./ffmpegRuntime";
import { gifFps, validateGifSettings, type MediaInfo } from "./mediaInfo";

export const GIFSKI_INSTALL =
  process.platform === "win32"
    ? "Install gifski.exe from https://github.com/ImageOptim/gifski/releases and add its folder to PATH (or set GIFSKI_PATH)."
    : "Run brew install gifski, then restart Raycast.";

export function requireGifski(): string {
  const binary = findExecutable("gifski");
  if (!binary) throw new Error(`gifski is required for GIF conversion. ${GIFSKI_INSTALL}`);
  return binary;
}

interface GifOptions {
  input: string;
  output: string;
  quality: string;
  fps: string;
  info: MediaInfo;
  signal?: AbortSignal;
  start?: number;
  duration?: number;
  onProgress?: (percent: number) => void;
}

export async function encodeGif(options: GifOptions): Promise<void> {
  const { input, output, quality, fps, info, signal, onProgress } = options;
  validateGifSettings(quality, fps);
  const rate = gifFps(fps, info);
  const gifski = requireGifski();
  const tools = findFFmpegTools();
  if (!tools) throw new Error("FFmpeg and ffprobe are required");
  signal?.throwIfAborted();
  const duration = options.duration ?? info.duration;
  // Stream frames rather than writing huge intermediate images or exceeding Windows argument limits.
  const decoder = spawn(
    tools.ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-ss",
      String(options.start ?? 0),
      "-i",
      input,
      "-t",
      String(duration),
      "-map",
      "0:v:0",
      "-an",
      "-vf",
      `fps=${rate}:round=up`,
      "-pix_fmt",
      "yuv420p",
      "-progress",
      "pipe:2",
      "-f",
      "yuv4mpegpipe",
      "-",
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  const encoder = spawn(
    gifski,
    ["--quiet", "--quality", quality, "--width", String(info.width), "--output", output, "-"],
    { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] },
  );
  const stop = () => {
    decoder.kill("SIGKILL");
    encoder.kill("SIGKILL");
  };
  signal?.addEventListener("abort", stop, { once: true });
  if (signal?.aborted) stop();
  let progressBuffer = "";
  decoder.stderr.on("data", (chunk: Buffer) => {
    progressBuffer += chunk.toString();
    const lines = progressBuffer.split("\n");
    progressBuffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("out_time_us="))
        onProgress?.(Math.min(90, (Number(line.slice(12)) / 1_000_000 / duration) * 90));
    }
  });
  const wait = (child: ChildProcess, name: string) =>
    new Promise<void>((resolve, reject) => {
      let stderr = "";
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr = (stderr + chunk.toString()).slice(-4000);
      });
      child.once("error", reject);
      child.once("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`${name} failed: ${stderr || `exit ${code}`}`)),
      );
    });
  const operations = [wait(decoder, "FFmpeg"), wait(encoder, "gifski"), pipeline(decoder.stdout, encoder.stdin)];
  try {
    await Promise.all(operations);
    signal?.throwIfAborted();
    onProgress?.(100);
  } catch (error) {
    stop();
    await Promise.allSettled(operations);
    await fs.rm(output, { force: true });
    signal?.throwIfAborted();
    throw error;
  } finally {
    signal?.removeEventListener("abort", stop);
  }
}

export async function estimateGifBytes(
  input: string,
  info: MediaInfo,
  quality: string,
  fps: string,
  signal: AbortSignal,
): Promise<number> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "video-converter-gif-"));
  try {
    // Short clips are measured in full. Longer clips sample the beginning, middle and end.
    const duration = info.duration <= 2 ? info.duration : Math.min(info.duration, Math.max(0.6, 2 / gifFps(fps, info)));
    const starts = info.duration <= 2 ? [0] : [0, (info.duration - duration) / 2, info.duration - duration];
    let bytes = 0;
    for (const [index, start] of starts.entries()) {
      signal.throwIfAborted();
      const output = path.join(dir, `${index}.gif`);
      await encodeGif({ input, output, quality, fps, info, signal, start, duration });
      bytes += (await fs.stat(output)).size;
    }
    return (bytes / (duration * starts.length)) * info.duration * 1.1;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
