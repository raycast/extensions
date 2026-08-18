import { stat } from "node:fs/promises";
import path from "node:path";
import { parseFile } from "music-metadata";

export interface FileMetadataReport {
  title: string;
  body: string;
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 10 || unit === "B" ? 0 : 1)} ${unit}`;
}

function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "Unknown";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatTrackNumber(value?: { no: number | null; of: number | null }): string | undefined {
  if (!value?.no) return undefined;
  return value.of ? `${value.no}/${value.of}` : String(value.no);
}

export async function readFileMetadataReport(filePath: string): Promise<FileMetadataReport> {
  const [file, metadata] = await Promise.all([
    stat(filePath),
    parseFile(filePath, { duration: true, skipCovers: true }),
  ]);
  const { common, format } = metadata;
  const fields: Array<[string, string | number | boolean | undefined]> = [
    ["File", path.basename(filePath)],
    ["Path", filePath],
    ["Size", formatBytes(file.size)],
    ["Modified", file.mtime.toLocaleString()],
    ["Title", common.title],
    ["Artist", common.artist],
    ["Album Artist", common.albumartist],
    ["Album", common.album],
    ["Year", common.year],
    ["Genre", common.genre?.join("; ")],
    ["Track", formatTrackNumber(common.track)],
    ["Disc", formatTrackNumber(common.disk)],
    ["Container", format.container],
    ["Codec", format.codec],
    ["Codec Profile", format.codecProfile],
    ["Duration", formatDuration(format.duration)],
    ["Bitrate", format.bitrate ? `${Math.round(format.bitrate / 1000)} kbps` : undefined],
    ["Sample Rate", format.sampleRate ? `${format.sampleRate} Hz` : undefined],
    ["Bit Depth", format.bitsPerSample ? `${format.bitsPerSample}-bit` : undefined],
    ["Channels", format.numberOfChannels],
    ["Lossless", format.lossless],
    ["Tags", format.tagTypes?.join(", ")],
  ];
  const lines = fields
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== "")
    .map(([label, value]) => `${label}: ${typeof value === "boolean" ? (value ? "Yes" : "No") : value}`);

  return {
    title: "File Metadata Report",
    body: ["FILE METADATA REPORT", "────────────────────────────────────────────────────────────", ...lines].join("\n"),
  };
}
