/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { randomUUID } from "node:crypto";

import fs from "fs";
import path from "path";
import { x } from "tinyexec";

import { EASYDICT_TMP_DIR } from "@/consts";
import { md5 } from "@/utils/crypto";
import { normalizeError } from "@/utils/errors";
import { timedFetch } from "@/utils/http";
import { logError, logTrace } from "@/utils/logger";

const audioDirPath = path.join(EASYDICT_TMP_DIR, "audio");

function getAudioBasePath(url: string): string {
  if (!fs.existsSync(audioDirPath)) {
    fs.mkdirSync(audioDirPath, { recursive: true });
  }
  const hash = md5(url);
  return path.join(audioDirPath, hash);
}

export function getCachedAudioPath(url: string): string | undefined {
  const basePath = getAudioBasePath(url);
  for (const ext of [".mp3", ".m4a", ".wav"]) {
    const fullPath = basePath + ext;
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return undefined;
}

/**
 * Convert WAV to M4A using afconvert (macOS).
 * Returns m4a path on success, undefined on failure.
 */
async function convertWavToM4a(wavPath: string, m4aPath: string, signal?: AbortSignal): Promise<string | undefined> {
  if (process.platform !== "darwin") {
    return undefined;
  }

  logTrace("AudioDownloader", "converting wav→m4a");

  const proc = x("afconvert", ["-f", "m4af", "-d", "aac", wavPath, m4aPath], { signal });
  const result = await proc;

  if (proc.aborted) {
    logTrace("AudioDownloader", "conversion cancelled");
    return undefined;
  }

  if (result.exitCode !== 0) {
    logError("AudioDownloader", `conversion failed (exit code: ${result.exitCode})`);
    return undefined;
  }

  logTrace("AudioDownloader", "conversion complete");
  return m4aPath;
}

/**
 * Detect if buffer is a WAV audio file from magic bytes.
 */
function isWav(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x41 &&
    buffer[10] === 0x56 &&
    buffer[11] === 0x45
  );
}

/**
 * Saves the audio buffer to disk.
 * If it's a WAV file on macOS, converts it to M4A.
 * Otherwise, saves it as WAV or MP3 based on the magic bytes.
 * Returns the final absolute path of the saved file.
 */
async function saveAudioBuffer(basePath: string, buffer: Buffer, signal?: AbortSignal): Promise<string | undefined> {
  if (isWav(buffer)) {
    const wavPath = process.platform === "darwin" ? `${basePath}.${randomUUID()}.wav` : basePath + ".wav";
    fs.writeFileSync(wavPath, buffer);

    if (process.platform === "darwin") {
      const temporaryM4aPath = `${basePath}.${randomUUID()}.m4a`;
      try {
        const convertedPath = await convertWavToM4a(wavPath, temporaryM4aPath, signal);
        if (convertedPath) {
          const m4aPath = basePath + ".m4a";
          fs.renameSync(convertedPath, m4aPath);
          return m4aPath;
        }
        if (signal?.aborted) return undefined;

        const fallbackWavPath = basePath + ".wav";
        fs.renameSync(wavPath, fallbackWavPath);
        return fallbackWavPath;
      } finally {
        fs.rmSync(wavPath, { force: true });
        fs.rmSync(temporaryM4aPath, { force: true });
      }
    }
    return wavPath;
  }

  const mp3Path = basePath + ".mp3";
  fs.writeFileSync(mp3Path, buffer);
  return mp3Path;
}

/**
 * Download audio file from URL.
 * Detects actual file type from the buffer before writing to disk.
 * Returns the final path where the file is saved.
 */
export async function downloadAudio(
  url: string,
  options?: { forceDownload?: boolean; signal?: AbortSignal },
): Promise<string | undefined> {
  const { forceDownload = false, signal } = options || {};
  const cachedPath = getCachedAudioPath(url);
  if (cachedPath && !forceDownload) {
    logTrace("AudioDownloader", `cached: ${cachedPath}`);
    return cachedPath;
  }

  logTrace("AudioDownloader", `downloading: ${url}`);
  const basePath = getAudioBasePath(url);

  try {
    const blob = await timedFetch(url, { responseType: "blob", signal });
    const buffer = Buffer.from(await blob.arrayBuffer());
    return await saveAudioBuffer(basePath, buffer, signal);
  } catch (error) {
    const { name, message } = normalizeError(error);
    if (name === "AbortError") {
      logTrace("AudioDownloader", "download cancelled");
      return undefined;
    }

    logError("AudioDownloader", `download failed: ${message}`);
    return undefined;
  }
}

export async function downloadWordAudioWithURL(
  word: string,
  url: string,
  options?: { forceDownload?: boolean; signal?: AbortSignal },
): Promise<string | undefined> {
  logTrace("AudioDownloader", `download: ${word}`);
  return await downloadAudio(url, options);
}
