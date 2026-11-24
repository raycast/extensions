export interface FormValues {
  files: string[];
  audioType: string;
  diarization: boolean;
  language: string;
  outputFormat: string;
}

export type Provider = "openai" | "deepgram" | "elevenlabs";

export type AudioType = "voice-note" | "meeting" | "interview" | "lecture" | "call" | "podcast";

export interface AudioTypeConfig {
  title: string;
  value: AudioType;
  description: string;
  enableDiarizationByDefault: boolean;
}

export const AUDIO_TYPES: AudioTypeConfig[] = [
  {
    title: "Voice Note",
    value: "voice-note",
    description: "A single speaker, short recording.",
    enableDiarizationByDefault: false,
  },
  {
    title: "Meeting Recording",
    value: "meeting",
    description: "Multiple speakers, usually around a table or on a call.",
    enableDiarizationByDefault: true,
  },
  {
    title: "Interview",
    value: "interview",
    description: "Two or more speakers, back-and-forth.",
    enableDiarizationByDefault: true,
  },
  {
    title: "Lecture / Talk",
    value: "lecture",
    description: "One main speaker, possibly with audience questions.",
    enableDiarizationByDefault: false,
  },
  {
    title: "Voicemail / Call",
    value: "call",
    description: "Phone conversation, usually two sides.",
    enableDiarizationByDefault: true,
  },
  {
    title: "Podcast / Media",
    value: "podcast",
    description: "Multiple speakers, possibly with music or ads.",
    enableDiarizationByDefault: true,
  },
];

export interface ProviderConfig {
  title: string;
  value: Provider;
  description: string;
  supportsDiarization: boolean;
  supportedFormats: string[];
  maxSizeMb: number;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    title: "ElevenLabs Scribe v2",
    value: "elevenlabs",
    description: "Best quality; up to 32 speakers; 5 GB files.",
    supportsDiarization: true,
    maxSizeMb: 5120,
    supportedFormats: [
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
  },
  {
    title: "Deepgram Nova-3",
    value: "deepgram",
    description: "Fast, cost-effective; up to 2 GB files.",
    supportsDiarization: true,
    maxSizeMb: 2048,
    supportedFormats: ["mp3", "mp4", "wav", "webm", "flac", "aac", "m4a", "ogg", "oga", "opus"],
  },
  {
    title: "OpenAI gpt-4o-transcribe",
    value: "openai",
    description: "Simple API; 25 MB file limit; no diarization.",
    supportsDiarization: false,
    maxSizeMb: 25,
    supportedFormats: ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"],
  },
];

export const PROVIDER_VALUES: Provider[] = PROVIDERS.map((p) => p.value);

export function isProvider(value: string): value is Provider {
  return PROVIDER_VALUES.includes(value as Provider);
}

export function isAudioType(value: string): value is AudioType {
  return AUDIO_TYPES.some((t) => t.value === value);
}

export interface TranscriptionOptions {
  filePath: string;
  provider: Provider;
  audioType: AudioType;
  diarization: boolean;
  language?: string;
  signal?: AbortSignal;
}

export interface TranscriptionSegment {
  speaker?: string;
  start?: number;
  end?: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptionSegment[];
  language?: string;
  duration?: number;
}

export interface FormattedTranscription {
  markdown: string;
  plainText: string;
  srt?: string;
}

export type OutputFormat = "markdown" | "plain" | "srt";

export interface HistoryEntry {
  id: string;
  timestamp: number;
  filePath: string;
  provider: Provider;
  audioType: string;
  language?: string;
  text: string;
  segments?: TranscriptionSegment[];
  duration?: number;
  diarization?: boolean;
}

export const OUTPUT_FORMATS: { title: string; value: OutputFormat }[] = [
  { title: "Markdown", value: "markdown" },
  { title: "Plain Text", value: "plain" },
  { title: "SRT Subtitles", value: "srt" },
];

export function isOutputFormat(value: string): value is OutputFormat {
  return OUTPUT_FORMATS.some((f) => f.value === value);
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: Provider,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
