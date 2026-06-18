import { Clipboard, environment } from "@raycast/api";
import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { VoiceThingError } from "./errors";
import { safeComponent } from "./filename";
import { MemeClip } from "./types";

const execFileAsync = promisify(execFile);
const A_F_CONVERT = "/usr/bin/afconvert";
const CACHE_DIRECTORY = path.join(environment.supportPath, "Clips");
const SOURCE_EXTENSIONS = [
  "mp3",
  "m4a",
  "aac",
  "wav",
  "ogg",
  "oga",
  "opus",
  "webm",
];
const NORMALIZATION = {
  targetRMS: 0.16,
  peakCeiling: 0.93,
  maxBoost: 4.0,
  maxCut: 0.25,
};

export async function cachedAudioFile(clip: MemeClip): Promise<string> {
  await mkdir(CACHE_DIRECTORY, { recursive: true });

  const baseName = `${safeComponent(clip.id)}-${safeComponent(clip.name)}`;
  const sourceURL = new URL(clip.soundURL);
  const sourcePathExtension = path
    .extname(sourceURL.pathname)
    .replace(".", "")
    .toLowerCase();
  const normalizedOutput = path.join(
    CACHE_DIRECTORY,
    `${baseName}-normalized.m4a`,
  );

  if (await fileExists(normalizedOutput)) {
    return normalizedOutput;
  }

  if (shouldPasteOriginal(sourcePathExtension)) {
    const originalOutput = path.join(
      CACHE_DIRECTORY,
      `${baseName}-source.${sourcePathExtension}`,
    );
    if (await fileExists(originalOutput)) {
      return normalizeOrOriginal(originalOutput, normalizedOutput);
    }
  }

  if (
    clip.cachedAudioPath &&
    (await fileExists(clip.cachedAudioPath)) &&
    !isStaleConvertedCache(clip.cachedAudioPath, clip)
  ) {
    return normalizeOrOriginal(clip.cachedAudioPath, normalizedOutput);
  }

  const preferredOutput = path.join(CACHE_DIRECTORY, `${baseName}.m4a`);
  if (
    (await fileExists(preferredOutput)) &&
    !shouldPasteOriginal(sourcePathExtension)
  ) {
    return normalizeOrOriginal(preferredOutput, normalizedOutput);
  }

  const { filePath: downloadedPath, contentType } = await downloadClip(
    clip.soundURL,
  );
  const sourceExtension = sourceExtensionFor(clip.soundURL, contentType);
  const sourceFile = path.join(
    CACHE_DIRECTORY,
    `${baseName}-source.${sourceExtension}`,
  );

  await rm(sourceFile, { force: true });
  await copyFile(downloadedPath, sourceFile);
  await rm(path.dirname(downloadedPath), { force: true, recursive: true });

  if (shouldPasteOriginal(sourceExtension)) {
    return normalizeOrOriginal(sourceFile, normalizedOutput);
  }

  if (sourceExtension === "m4a") {
    await rm(preferredOutput, { force: true });
    await copyFile(sourceFile, preferredOutput);
    return normalizeOrOriginal(preferredOutput, normalizedOutput);
  }

  try {
    await convertToM4A(sourceFile, preferredOutput);
    return normalizeOrOriginal(preferredOutput, normalizedOutput);
  } catch {
    return normalizeOrOriginal(sourceFile, normalizedOutput);
  }
}

export async function copyAudioFile(filePath: string): Promise<void> {
  await Clipboard.copy({ file: filePath });
}

export async function pasteAudioFile(filePath: string): Promise<void> {
  await Clipboard.paste({ file: filePath });
}

export async function removeCachedFiles(clip: MemeClip): Promise<void> {
  const baseName = `${safeComponent(clip.id)}-${safeComponent(clip.name)}`;
  await Promise.all(
    SOURCE_EXTENSIONS.flatMap((extension) => [
      rm(path.join(CACHE_DIRECTORY, `${baseName}.${extension}`), {
        force: true,
      }),
      rm(path.join(CACHE_DIRECTORY, `${baseName}-source.${extension}`), {
        force: true,
      }),
      rm(path.join(CACHE_DIRECTORY, `${baseName}-normalized.${extension}`), {
        force: true,
      }),
    ]),
  );

  if (clip.cachedAudioPath) {
    await rm(clip.cachedAudioPath, { force: true });
  }
}

export async function clearAudioCache(): Promise<void> {
  await rm(CACHE_DIRECTORY, { force: true, recursive: true });
  await mkdir(CACHE_DIRECTORY, { recursive: true });
}

function shouldPasteOriginal(pathExtension: string): boolean {
  return ["mp3", "m4a", "aac", "opus", "ogg", "oga", "wav"].includes(
    pathExtension.toLowerCase(),
  );
}

async function downloadClip(
  soundURL: string,
): Promise<{ filePath: string; contentType?: string }> {
  const response = await fetch(soundURL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) VoiceThing-Raycast/1.0",
    },
  });

  if (!response.ok) {
    throw new VoiceThingError("Could not download the audio clip.");
  }

  const directory = await mkdtemp(path.join(tmpdir(), "voicething-download-"));
  const filePath = path.join(directory, "clip-download");
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, buffer);

  return {
    filePath,
    contentType: response.headers.get("content-type") ?? undefined,
  };
}

function sourceExtensionFor(url: string, contentType?: string): string {
  const pathExtension = path
    .extname(new URL(url).pathname)
    .replace(".", "")
    .toLowerCase();
  if (pathExtension) {
    return pathExtension;
  }

  switch (contentType?.toLowerCase().split(";")[0]) {
    case "audio/mp4":
    case "audio/x-m4a":
      return "m4a";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/aac":
      return "aac";
    case "audio/wav":
    case "audio/x-wav":
    case "audio/wave":
      return "wav";
    case "audio/ogg":
      return "ogg";
    case "audio/webm":
      return "webm";
    default:
      return "mp3";
  }
}

async function convertToM4A(input: string, output: string): Promise<void> {
  await rm(output, { force: true });
  await execFileAsync(A_F_CONVERT, [
    "-f",
    "m4af",
    "-d",
    "aac",
    "-b",
    "96000",
    input,
    output,
  ]);

  if (!(await fileExists(output))) {
    throw new VoiceThingError("Could not convert the clip to M4A.");
  }
}

async function normalizeOrOriginal(
  input: string,
  output: string,
): Promise<string> {
  try {
    return await normalizeFile(input, output);
  } catch {
    return input;
  }
}

async function normalizeFile(input: string, output: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "voicething-normalize-"));
  const decodedWave = path.join(directory, "decoded.wav");
  const normalizedWave = path.join(directory, "normalized.wav");

  try {
    await execFileAsync(A_F_CONVERT, [
      "-f",
      "WAVE",
      "-d",
      "LEI16",
      input,
      decodedWave,
    ]);
    const wave = await readFile(decodedWave);
    const normalized = normalizeWavePCM16(wave);
    await writeFile(normalizedWave, normalized);
    await convertToM4A(normalizedWave, output);
    return output;
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

function normalizeWavePCM16(wave: Buffer): Buffer {
  const fmt = findChunk(wave, "fmt ");
  const data = findChunk(wave, "data");

  if (!fmt || !data) {
    throw new VoiceThingError("Could not normalize the clip volume.");
  }

  const audioFormat = wave.readUInt16LE(fmt.offset);
  const bitsPerSample = wave.readUInt16LE(fmt.offset + 14);

  if (audioFormat !== 1 || bitsPerSample !== 16) {
    throw new VoiceThingError("Could not normalize the clip volume.");
  }

  const output = Buffer.from(wave);
  const sampleCount = data.length / 2;
  let peak = 0;
  let sumSquares = 0;

  for (
    let offset = data.offset;
    offset < data.offset + data.length;
    offset += 2
  ) {
    const sample = wave.readInt16LE(offset) / 32768;
    const absolute = Math.abs(sample);
    peak = Math.max(peak, absolute);
    sumSquares += sample * sample;
  }

  if (sampleCount <= 0 || peak <= 0) {
    return output;
  }

  const rms = Math.sqrt(sumSquares / sampleCount);
  if (rms <= 0) {
    return output;
  }

  const rmsGain = NORMALIZATION.targetRMS / rms;
  const peakGain = NORMALIZATION.peakCeiling / peak;
  const unclippedGain = Math.min(rmsGain, peakGain);
  const gain = Math.min(
    Math.max(unclippedGain, NORMALIZATION.maxCut),
    NORMALIZATION.maxBoost,
  );

  for (
    let offset = data.offset;
    offset < data.offset + data.length;
    offset += 2
  ) {
    const sample = wave.readInt16LE(offset) / 32768;
    const normalized = Math.max(
      -NORMALIZATION.peakCeiling,
      Math.min(NORMALIZATION.peakCeiling, sample * gain),
    );
    output.writeInt16LE(Math.round(normalized * 32767), offset);
  }

  return output;
}

function findChunk(
  wave: Buffer,
  id: string,
): { offset: number; length: number } | undefined {
  if (
    wave.toString("ascii", 0, 4) !== "RIFF" ||
    wave.toString("ascii", 8, 12) !== "WAVE"
  ) {
    return undefined;
  }

  let offset = 12;
  while (offset + 8 <= wave.length) {
    const chunkID = wave.toString("ascii", offset, offset + 4);
    const length = wave.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (chunkID === id) {
      return { offset: dataOffset, length };
    }

    offset = dataOffset + length + (length % 2);
  }

  return undefined;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function isStaleConvertedCache(
  cachedAudioPath: string,
  clip: MemeClip,
): boolean {
  const sourceExtension = path
    .extname(new URL(clip.soundURL).pathname)
    .replace(".", "")
    .toLowerCase();
  if (!shouldPasteOriginal(sourceExtension)) {
    return false;
  }

  return (
    path.extname(cachedAudioPath).replace(".", "").toLowerCase() !==
    sourceExtension
  );
}
