import fs from "fs";
import os from "os";
import path from "path";
import { findFFmpegPath } from "./ffmpeg";
import { execPromise } from "./exec";
import { runFFmpegWithProgress, probeDurationSec, type ProgressInfo } from "./ffmpegRun";
import { AllOutputExtension, OutputVideoExtension, OutputAudioExtension, getOutputCategory } from "../types/media";

export type MergeOptions = {
  outputDir?: string;
  stripMetadata?: boolean;
  onProgress?: (p: ProgressInfo) => void;
  /** If provided, used as the bare filename (without ext) for the merged output. */
  outputFileName?: string;
  /** When true, skip stream-copy detection and always re-encode. */
  forceReencode?: boolean;
};

export type StreamInfo = {
  videoCodec?: string;
  videoWidth?: number;
  videoHeight?: number;
  videoFps?: number;
  audioCodec?: string;
  audioSampleRate?: number;
  audioChannels?: number;
  durationSec?: number;
};

/**
 * Probe a file by parsing `ffmpeg -i` stderr output. Intentionally tolerant —
 * returns whatever it could extract.
 */
export async function probeStreamInfo(ffmpegPath: string, filePath: string): Promise<StreamInfo> {
  let stderr = "";
  try {
    await execPromise(`"${ffmpegPath}" -hide_banner -i "${filePath}"`);
  } catch (err: unknown) {
    // ffmpeg with only -i exits non-zero; the useful info is in stderr
    const s =
      typeof err === "object" && err !== null && "stderr" in err ? String((err as { stderr: unknown }).stderr) : "";
    const m =
      typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : "";
    stderr = s || m;
  }

  return parseStreamInfo(stderr);
}

export function parseStreamInfo(stderr: string): StreamInfo {
  const info: StreamInfo = {};

  const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (durMatch) {
    info.durationSec = Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3]);
  }

  // Video line: "Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709), 1920x1080 [...], 2396 kb/s, 30 fps, ..."
  const vMatch = stderr.match(
    /Stream #\d+:\d+(?:\[[^\]]+\])?(?:\(\w+\))?: Video:\s*(\w+)[^,]*,[^,]*,\s*(\d+)x(\d+)[^\n]*?(\d+(?:\.\d+)?)\s*fps/,
  );
  if (vMatch) {
    info.videoCodec = vMatch[1];
    info.videoWidth = Number(vMatch[2]);
    info.videoHeight = Number(vMatch[3]);
    info.videoFps = Number(vMatch[4]);
  } else {
    const vCodec = stderr.match(/Stream #\d+:\d+[^:]*: Video:\s*(\w+)/);
    if (vCodec) info.videoCodec = vCodec[1];
  }

  // Audio line: "Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 128 kb/s"
  const aMatch = stderr.match(/Stream #\d+:\d+(?:\[[^\]]+\])?(?:\(\w+\))?: Audio:\s*(\w+)[^,]*,\s*(\d+)\s*Hz,\s*(\w+)/);
  if (aMatch) {
    info.audioCodec = aMatch[1];
    info.audioSampleRate = Number(aMatch[2]);
    const layout = aMatch[3];
    info.audioChannels = layout === "mono" ? 1 : layout === "stereo" ? 2 : layout.startsWith("5.1") ? 6 : undefined;
  } else {
    const aCodec = stderr.match(/Stream #\d+:\d+[^:]*: Audio:\s*(\w+)/);
    if (aCodec) info.audioCodec = aCodec[1];
  }

  return info;
}

/**
 * Determine whether a list of files can be merged via the FFmpeg concat
 * demuxer with `-c copy` (no re-encode). Returns true only if all inputs
 * share the same video codec/resolution/fps AND audio codec/sample rate/
 * channels. Missing values are treated as "unknown" and disqualify stream
 * copy as a safety measure.
 */
export function canStreamCopy(streams: StreamInfo[]): boolean {
  if (streams.length < 2) return false;
  const first = streams[0];
  for (const s of streams) {
    if (first.videoCodec) {
      if (!s.videoCodec || s.videoCodec !== first.videoCodec) return false;
      if (!s.videoWidth || s.videoWidth !== first.videoWidth) return false;
      if (!s.videoHeight || s.videoHeight !== first.videoHeight) return false;
      if (!s.videoFps || Math.abs(s.videoFps - (first.videoFps ?? 0)) > 0.1) return false;
    } else if (s.videoCodec) {
      // First input has no video but this one does — incompatible.
      return false;
    }
    if (!!s.audioCodec !== !!first.audioCodec) return false;
    if (s.audioCodec && s.audioCodec !== first.audioCodec) return false;
    if (s.audioSampleRate && first.audioSampleRate && s.audioSampleRate !== first.audioSampleRate) return false;
    if (s.audioChannels && s.audioChannels !== first.audioChannels) return false;
  }
  return true;
}

export function buildReencodeConcatGraph(
  inputCount: number,
  outCategory: ReturnType<typeof getOutputCategory>,
  streams: StreamInfo[] = [],
): { filter: string; mapArgs: string } {
  if (outCategory === "audio") {
    const filterParts: string[] = [];
    for (let i = 0; i < inputCount; i++) filterParts.push(`[${i}:a:0]`);
    return {
      filter: `${filterParts.join("")}concat=n=${inputCount}:v=0:a=1[a]`,
      mapArgs: ` -map "[a]"`,
    };
  }

  const includeAudio = streams.length === inputCount && streams.every((s) => Boolean(s.audioCodec));
  const filterParts: string[] = [];
  for (let i = 0; i < inputCount; i++) {
    filterParts.push(includeAudio ? `[${i}:v:0][${i}:a:0]` : `[${i}:v:0]`);
  }

  return {
    filter: `${filterParts.join("")}concat=n=${inputCount}:v=1:a=${includeAudio ? 1 : 0}${includeAudio ? "[v][a]" : "[v]"}`,
    mapArgs: includeAudio ? ` -map "[v]" -map "[a]"` : ` -map "[v]"`,
  };
}

function inputsMatchOutputFormat(inputs: string[], outputFormat: AllOutputExtension): boolean {
  return inputs.every((p) => path.extname(p).toLowerCase() === outputFormat.toLowerCase());
}

function getUniqueMergePath(dir: string, baseName: string, ext: string): string {
  let candidate = path.join(dir, `${baseName}${ext}`);
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName}(${counter})${ext}`);
    counter++;
  }
  return candidate;
}

function buildCodecArgs(outputFormat: AllOutputExtension): string {
  const category = getOutputCategory(outputFormat);
  if (category === "audio") {
    switch (outputFormat as OutputAudioExtension) {
      case ".mp3":
        return " -c:a libmp3lame -b:a 192k";
      case ".aac":
      case ".m4a":
        return " -c:a aac -b:a 192k";
      case ".wav":
        return " -c:a pcm_s16le -ar 44100";
      case ".flac":
        return " -c:a flac";
    }
  }
  if (category === "video") {
    switch (outputFormat as OutputVideoExtension) {
      case ".mp4":
        return " -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -pix_fmt yuv420p";
      case ".mkv":
        return " -c:v libx265 -preset medium -crf 28 -c:a aac -b:a 192k -pix_fmt yuv420p";
      case ".mov":
        return " -c:v prores -profile:v 2 -c:a pcm_s16le";
      case ".webm":
        return " -c:v libvpx-vp9 -b:v 0 -crf 30 -c:a libopus -b:a 128k";
      case ".avi":
        return " -c:v libxvid -q:v 6 -c:a mp3";
      case ".mpg":
        return " -c:v mpeg2video -q:v 6 -c:a mp3";
    }
  }
  return "";
}

export type MergeStrategy = "stream-copy" | "reencode";

export type MergeResult = {
  outputPath: string;
  strategy: MergeStrategy;
};

/**
 * Merge multiple media files into a single output. Automatically tries
 * stream-copy via the concat demuxer when inputs are compatible, and
 * falls back to full re-encode via the concat filter otherwise.
 */
export async function mergeMedia(
  inputs: string[],
  outputFormat: AllOutputExtension,
  opts: MergeOptions = {},
): Promise<MergeResult> {
  if (inputs.length < 2) {
    throw new Error("At least 2 files are required to merge.");
  }

  const ffmpegPath = await findFFmpegPath();
  if (!ffmpegPath) {
    throw new Error("FFmpeg is not installed or configured.");
  }

  const outputDir = opts.outputDir && opts.outputDir.length > 0 ? opts.outputDir : path.dirname(inputs[0]);
  const baseName = (opts.outputFileName && opts.outputFileName.trim()) || "merged";
  const outputPath = getUniqueMergePath(outputDir, baseName, outputFormat);
  const metadataFlag = opts.stripMetadata ? " -map_metadata -1" : "";

  // Decide strategy
  let strategy: MergeStrategy = "reencode";
  let streams: StreamInfo[] = [];
  try {
    streams = await Promise.all(inputs.map((p) => probeStreamInfo(ffmpegPath.path, p)));
    if (!opts.forceReencode && inputsMatchOutputFormat(inputs, outputFormat) && canStreamCopy(streams)) {
      strategy = "stream-copy";
    }
  } catch (err) {
    console.warn("Stream probing failed, falling back to re-encode:", err);
    strategy = "reencode";
  }

  if (strategy === "stream-copy") {
    // Build a concat list file for ffmpeg's concat demuxer
    const listFile = path.join(os.tmpdir(), `media-converter-concat-${Date.now()}.txt`);
    // FFmpeg concat demuxer uses `\` as the escape char inside single-quoted
    // strings (NOT shell-style `'\''`). Escape backslashes first, then quotes.
    const listContents = inputs.map((p) => `file '${p.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`).join("\n");
    try {
      fs.writeFileSync(listFile, listContents);
      const cmd = `"${ffmpegPath.path}" -f concat -safe 0 -i "${listFile}" -c copy${metadataFlag} -y "${outputPath}"`;
      const total = await sumDurations(ffmpegPath.path, inputs);
      console.log(`Executing FFmpeg stream-copy merge: ${cmd}`);
      if (opts.onProgress) {
        await runFFmpegWithProgress(cmd, { totalDurationSec: total, onProgress: opts.onProgress });
      } else {
        await execPromise(cmd);
      }
    } finally {
      try {
        fs.unlinkSync(listFile);
      } catch {
        /* ignore */
      }
    }
    return { outputPath, strategy };
  }

  // Re-encode via concat filter. The concat filter is picky: every input
  // listed in its pattern must actually have a stream of that type, so we
  // tailor the graph to the output category (audio-only vs video+audio).
  const n = inputs.length;
  const inputsArg = inputs.map((p) => `-i "${p}"`).join(" ");
  const outCategory = getOutputCategory(outputFormat);
  const { filter, mapArgs } = buildReencodeConcatGraph(n, outCategory, streams);
  const codecArgs = buildCodecArgs(outputFormat);
  const cmd = `"${ffmpegPath.path}" ${inputsArg} -filter_complex "${filter}"${mapArgs}${codecArgs}${metadataFlag} -y "${outputPath}"`;
  const total = await sumDurations(ffmpegPath.path, inputs);
  console.log(`Executing FFmpeg re-encode merge: ${cmd}`);
  if (opts.onProgress) {
    await runFFmpegWithProgress(cmd, { totalDurationSec: total, onProgress: opts.onProgress });
  } else {
    await execPromise(cmd);
  }
  return { outputPath, strategy };
}

async function sumDurations(ffmpegPath: string, inputs: string[]): Promise<number | undefined> {
  let total = 0;
  for (const p of inputs) {
    const d = await probeDurationSec(ffmpegPath, p);
    if (d === null) return undefined;
    total += d;
  }
  return total;
}
