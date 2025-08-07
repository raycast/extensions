export interface AudioFile {
  path: string;
  name: string;
  size: number;
  extension: string;
}

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  processingTime?: number;
}

export interface BatchProcessingOptions {
  files: AudioFile[];
  operation: "convert" | "trim" | "fade" | "normalize" | "volume" | "stereo-to-mono" | "speed";
  outputDirectory: string;
  options: Record<string, unknown>;
}

export const SUPPORTED_AUDIO_FORMATS = ["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"] as const;

export const AUDIO_BITRATES = ["64k", "96k", "128k", "160k", "192k", "256k", "320k"] as const;

export const SAMPLE_RATES = [8000, 11025, 22050, 44100, 48000, 88200, 96000] as const;

export type AudioFormat = (typeof SUPPORTED_AUDIO_FORMATS)[number];
export type AudioBitrate = (typeof AUDIO_BITRATES)[number];
export type SampleRate = (typeof SAMPLE_RATES)[number];
