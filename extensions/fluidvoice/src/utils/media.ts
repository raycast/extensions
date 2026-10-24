import { environment, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { FluidVoiceAPI } from "../api/fluidVoice";
import { applyRetention, startJobLease } from "./retention";

const run = promisify(execFile);
const processEnvironment = {
  ...process.env,
  PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`,
};
const nativeExtensions = new Set([".mp3", ".wav", ".m4a", ".aac", ".aiff", ".aif", ".caf", ".flac"]);

export function normalizeSource(value: string): string {
  const source = value.trim().replace(/^(["'])(.*)\1$/, "$2");
  if (source.startsWith("file://")) return fileURLToPath(source);
  if (source.startsWith("~/")) return path.join(os.homedir(), source.slice(2));
  if (/^https?:\/\//i.test(source)) {
    try {
      const url = new URL(source);
      if (!url.hostname) throw new Error("Missing hostname");
    } catch {
      throw new Error("Enter a valid HTTP(S) media URL.");
    }
    return source;
  }
  if (path.isAbsolute(source)) return source;
  throw new Error("Enter an HTTP(S) URL, file URL, or absolute file path.");
}

export async function transcribeSource(value: string, progress: (message: string) => void = () => {}) {
  const source = normalizeSource(value);
  const { retainedDownloads = "5" } = getPreferenceValues<Preferences>();
  if (!/^\d+$/.test(retainedDownloads)) throw new Error("Downloaded Files to Keep must be a nonnegative integer.");
  const keep = Number(retainedDownloads);
  if (!Number.isSafeInteger(keep)) throw new Error("Downloaded Files to Keep is too large.");
  const root = path.join(environment.supportPath, "media");
  const inputPath = /^https?:\/\//i.test(source) ? undefined : source;
  await applyRetention(root, keep, inputPath);
  progress("Checking FluidVoice connection");
  await FluidVoiceAPI.health();
  let workDirectory: string | undefined;
  let stopLease: (() => Promise<void>) | undefined;
  const getWorkDirectory = async () => {
    if (!workDirectory) {
      await mkdir(root, { recursive: true });
      workDirectory = await mkdtemp(path.join(root, "media-"));
      stopLease = await startJobLease(workDirectory);
    }
    return workDirectory;
  };
  try {
    let audioPath = source;
    if (/^https?:\/\//i.test(source)) {
      progress("Downloading media");
      audioPath = await download(source, await getWorkDirectory());
    } else if (!(await stat(source)).isFile()) {
      throw new Error("The selected path is not a file.");
    }
    // Container names alone cannot establish codec compatibility (e.g. Opus in M4A).
    const probe = await run(
      "ffprobe",
      ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name", "-of", "json", audioPath],
      { env: processEnvironment },
    );
    const codec = (JSON.parse(probe.stdout) as { streams: { codec_name: string }[] }).streams[0]?.codec_name;
    if (!codec) throw new Error("This media file has no audio track.");
    const nativeCodec = /^(mp3|aac|alac|flac|pcm_)/.test(codec);
    if (!nativeExtensions.has(path.extname(audioPath).toLowerCase()) || !nativeCodec) {
      progress("Converting audio to MP3");
      const converted = path.join(await getWorkDirectory(), "converted.mp3");
      await run(
        "ffmpeg",
        ["-nostdin", "-y", "-i", audioPath, "-vn", "-codec:a", "libmp3lame", "-q:a", "2", converted],
        { env: processEnvironment, maxBuffer: 8 * 1024 * 1024 },
      );
      audioPath = converted;
    }
    progress("Transcribing with FluidVoice; this can take several minutes");
    const result = await FluidVoiceAPI.transcribeFile(audioPath);
    if (stopLease) await stopLease();
    if (workDirectory) {
      try {
        await writeFile(
          path.join(workDirectory, "completed.json"),
          JSON.stringify({ source, completedAt: Date.now() }),
        );
      } catch (error) {
        console.warn("Could not mark completed media:", error);
        await cleanupWorkDirectory(workDirectory);
      }
    }
    await applyRetention(root, keep, inputPath);
    return result;
  } catch (error) {
    if (stopLease) await stopLease();
    if (workDirectory) await cleanupWorkDirectory(workDirectory);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT") && /ffmpeg|ffprobe|yt-dlp/.test(message))
      throw new Error("Install the media tools with: brew install ffmpeg yt-dlp");
    throw error;
  } finally {
    if (stopLease) await stopLease();
    if (workDirectory && keep === 0) await cleanupWorkDirectory(workDirectory);
  }
}

async function download(url: string, directory: string): Promise<string> {
  const controller = new AbortController();
  const headerTimeout = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(headerTimeout);
  }
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  const extension = path.extname(new URL(response.url).pathname).toLowerCase();
  const directMedia =
    contentType.startsWith("audio/") ||
    contentType.startsWith("video/") ||
    (contentType === "application/octet-stream" &&
      (nativeExtensions.has(extension) || [".mp4", ".webm", ".ogg", ".opus", ".mkv"].includes(extension)));
  if (response.ok && response.body && directMedia && ![".m3u8", ".mpd"].includes(extension)) {
    const destination = path.join(directory, `download${extension || ".media"}`);
    await pipeline(
      Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
      createWriteStream(destination),
    );
    return destination;
  }
  await response.body?.cancel();
  // Argument arrays prevent shell interpretation of URLs and filenames.
  const result = await run(
    "yt-dlp",
    [
      "--no-playlist",
      "--no-progress",
      "-f",
      "bestaudio/best",
      "--print",
      "after_move:filepath",
      "-o",
      path.join(directory, "download.%(ext)s"),
      "--",
      url,
    ],
    { env: processEnvironment, maxBuffer: 8 * 1024 * 1024 },
  );
  const downloaded = result.stdout.trim().split("\n").at(-1);
  if (!downloaded || !path.resolve(downloaded).startsWith(directory + path.sep))
    throw new Error("Download did not produce a media file.");
  return downloaded;
}

async function cleanupWorkDirectory(directory: string) {
  try {
    await rm(directory, { recursive: true, force: true });
  } catch (error) {
    console.warn("Could not clean up temporary media:", error);
  }
}
