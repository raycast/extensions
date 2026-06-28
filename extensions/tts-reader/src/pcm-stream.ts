export type PcmStreamMetadata = {
  pcmFormat: string;
  sampleRate: number;
  channels: number;
};

const SUPPORTED_PCM_FORMATS = new Set(["u8", "s16le", "s32le"]);

function parsePositiveInt(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parsePcmStreamHeaders(headers: Headers): PcmStreamMetadata | null {
  const contentType = headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "audio/raw") {
    return null;
  }

  const mode = headers.get("x-tts-mode")?.trim().toLowerCase();
  if (mode !== "stream-pcm") {
    return null;
  }

  const pcmFormat = headers.get("x-tts-pcm-format")?.trim().toLowerCase();
  if (!pcmFormat || !SUPPORTED_PCM_FORMATS.has(pcmFormat)) {
    return null;
  }

  const sampleRate = parsePositiveInt(headers.get("x-tts-sample-rate"));
  const channels = parsePositiveInt(headers.get("x-tts-channels"));
  if (sampleRate === null || channels === null) {
    return null;
  }

  return { pcmFormat, sampleRate, channels };
}

export function buildPcmFfplayArgs(metadata: PcmStreamMetadata): string[] {
  return [
    "-nodisp",
    "-autoexit",
    "-loglevel",
    "error",
    "-f",
    metadata.pcmFormat,
    "-sample_rate",
    String(metadata.sampleRate),
    "-ch_layout",
    channelLayoutForCount(metadata.channels),
    "-i",
    "-",
  ];
}

function channelLayoutForCount(channels: number): string {
  if (channels === 1) {
    return "mono";
  }

  if (channels === 2) {
    return "stereo";
  }

  return `${channels}c`;
}
