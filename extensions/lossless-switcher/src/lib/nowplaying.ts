import { promises as fs } from "fs";

export interface NowPlaying {
  timestamp: number;
  format: string;
  rendition: string;
  sampleRate: number | null;
  bitDepth: number | null;
  channels: number | null;
}

interface CachePayload {
  timestamp?: number;
  format?: string;
  rendition?: string;
  sampleRate?: number | null;
  bitDepth?: number | null;
  channels?: number | null;
}

export async function readNowPlaying(
  filePath: string,
): Promise<NowPlaying | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  let payload: CachePayload;
  try {
    payload = JSON.parse(raw) as CachePayload;
  } catch {
    return null;
  }
  return {
    timestamp: payload.timestamp ?? 0,
    format: payload.format ?? "",
    rendition: payload.rendition ?? "",
    sampleRate: payload.sampleRate ?? null,
    bitDepth: payload.bitDepth ?? null,
    channels: payload.channels ?? null,
  };
}

function rateLabel(hz: number): string {
  const khz = hz / 1000;
  return Number.isInteger(khz) ? `${khz} kHz` : `${khz.toFixed(1)} kHz`;
}

function codecLabel(format: string): string {
  switch (format.toLowerCase()) {
    case "qlac":
    case "alac":
      return "ALAC";
    case "qaac":
    case "aac":
    case "aach":
    case "aacp":
      return "AAC";
    case "lpcm":
    case "pcm":
      return "PCM";
    case "flac":
      return "FLAC";
    default:
      return format.toUpperCase();
  }
}

export function formatSummary(np: NowPlaying): string {
  const parts: string[] = [];
  if (np.sampleRate) parts.push(rateLabel(np.sampleRate));
  if (np.bitDepth && np.bitDepth > 0) parts.push(`${np.bitDepth}-bit`);
  if (np.rendition) parts.push(np.rendition);
  const head = parts.join(" · ");
  const codec = codecLabel(np.format);
  return head ? `${head} (${codec})` : `(${codec})`;
}
