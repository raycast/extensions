// Video and Audio Formats
export type VideoFormat = "mp4" | "mov" | "avi" | "mkv" | "webm" | "mpeg";
export type AudioFormat = "mp3" | "wav" | "flac" | "aac" | "ogg" | "wma";

// Codec Types
export type VideoCodec = "h264" | "h265" | "mpeg4" | "vp8" | "vp9" | "mpeg1" | "mpeg2";
export type CompressionMode = "bitrate" | "filesize";

// Preset Types
export type Preset = "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow" | "veryslow";

// Form Values Interface
export interface FormValues {
  videoFormat: VideoFormat;
  videoCodec: VideoCodec;
  compressionMode: CompressionMode;
  preset: Preset;
  bitrate: string;
  maxSize: string;
  audioBitrate: string;
  outputFolder: string[];
  rename: string;
  subfolderName: string;
  useHardwareAcceleration: boolean;
  deleteOriginalFiles: boolean;
  videoFiles: string[];
  audioFiles: string[];
}

// Constants
export const AVAILABLE_VIDEO_FORMATS: readonly VideoFormat[] = ["mp4", "mov", "avi", "mkv", "webm", "mpeg"] as const;
export const AVAILABLE_AUDIO_FORMATS: readonly AudioFormat[] = ["mp3", "wav", "flac", "aac", "ogg", "wma"] as const;
export const AVAILABLE_PRESETS: readonly Preset[] = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "veryslow",
] as const;

export const CODEC_OPTIONS: Record<VideoFormat, VideoCodec[]> = {
  mp4: ["h264", "h265"],
  mov: ["h264", "h265"],
  avi: ["mpeg4", "h264"],
  mkv: ["h264", "vp9"],
  webm: ["vp8", "vp9"],
  mpeg: ["mpeg1", "mpeg2"],
} as const;

// Utility Functions
export const filterByExtensions = (paths: string[], extensions: readonly string[]): string[] => {
  return paths.filter((p) => extensions.some((ext) => p.toLowerCase().endsWith(`.${ext}`)));
};
