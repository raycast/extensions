import fs from "node:fs";
import path from "node:path";
import { findFFmpegPath } from "./ffmpeg";
import { runProcess } from "./process";

export type MediaStream = {
  index: number;
  type: "video" | "audio" | "subtitle" | "data" | "unknown";
  codec?: string;
  language?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  sampleRate?: number;
  channels?: string;
  bitrateKbps?: number;
  pixelFormat?: string;
};

export type MediaInspection = {
  path: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  container?: string;
  durationSec?: number;
  bitrateKbps?: number;
  startSec?: number;
  streams: MediaStream[];
  metadata: Record<string, string>;
};

export async function inspectMedia(filePath: string): Promise<MediaInspection> {
  const ffmpeg = await findFFmpegPath();
  if (!ffmpeg) throw new Error("FFmpeg is not installed or configured.");
  let stderr = "";
  try {
    await runProcess({ command: ffmpeg.path, args: ["-hide_banner", "-i", filePath] });
  } catch (error) {
    stderr =
      typeof error === "object" && error !== null && "stderr" in error
        ? String((error as { stderr: unknown }).stderr)
        : String(error);
  }
  return parseMediaInspection(stderr, filePath);
}

export function parseMediaInspection(stderr: string, filePath: string): MediaInspection {
  const stat = safeStat(filePath);
  const inputMatch = stderr.match(/Input #0,\s*([^,]+(?:,[^,]+)*?),\s*from /);
  const durationMatch = stderr.match(
    /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?),\s*start:\s*(-?\d+(?:\.\d+)?),\s*bitrate:\s*(\d+)\s*kb\/s/,
  );
  const streams = stderr
    .split(/\r?\n/)
    .map(parseStreamLine)
    .filter((stream): stream is MediaStream => stream !== null);

  return {
    path: filePath,
    fileName: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase(),
    sizeBytes: stat?.size ?? 0,
    container: inputMatch?.[1]?.trim(),
    durationSec: durationMatch
      ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
      : undefined,
    startSec: durationMatch ? Number(durationMatch[4]) : undefined,
    bitrateKbps: durationMatch ? Number(durationMatch[5]) : undefined,
    streams,
    metadata: parseMetadata(stderr),
  };
}

function parseStreamLine(line: string): MediaStream | null {
  const match = line.match(
    /Stream #0:(\d+)(?:\[[^\]]+\])?(?:\(([^)]+)\))?:\s*(Video|Audio|Subtitle|Data):\s*([^,\s]+)/i,
  );
  if (!match) return null;
  const type = match[3].toLowerCase() as MediaStream["type"];
  const stream: MediaStream = {
    index: Number(match[1]),
    type,
    codec: match[4],
    language: match[2],
  };
  const bitrate = line.match(/(\d+)\s*kb\/s/);
  if (bitrate) stream.bitrateKbps = Number(bitrate[1]);
  if (type === "video") {
    const dimensions = line.match(/(\d{2,6})x(\d{2,6})/);
    if (dimensions) {
      stream.width = Number(dimensions[1]);
      stream.height = Number(dimensions[2]);
    }
    const fps = line.match(/(\d+(?:\.\d+)?)\s*fps/);
    if (fps) stream.frameRate = Number(fps[1]);
    const pixelFormat = line.match(/Video:\s*[^,]+,\s*([^,\s(]+)/);
    if (pixelFormat) stream.pixelFormat = pixelFormat[1];
  } else if (type === "audio") {
    const sampleRate = line.match(/(\d+)\s*Hz/);
    if (sampleRate) stream.sampleRate = Number(sampleRate[1]);
    const audioParts = line.split(",");
    const rateIndex = audioParts.findIndex((part) => part.includes("Hz"));
    const layout = rateIndex >= 0 ? audioParts[rateIndex + 1]?.trim() : undefined;
    if (layout) stream.channels = layout;
  }
  return stream;
}

function parseMetadata(stderr: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  const block = stderr.match(/Metadata:\s*\n((?:\s{4,}.+\n?)+?)(?=\s*(?:Duration:|Stream #|$))/)?.[1];
  if (!block) return metadata;
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:]+?)\s*:\s*(.+)\s*$/);
    if (match) metadata[match[1].trim()] = match[2].trim();
  }
  return metadata;
}

function safeStat(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}
