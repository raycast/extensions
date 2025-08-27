import { type PreferenceValues } from "@raycast/api";

type Range<
  START extends number,
  END extends number,
  ARR extends unknown[] = [],
  ACC extends number = never,
> = ARR["length"] extends END
  ? ACC | END
  : Range<START, END, [...ARR, 1], ARR["length"] extends START ? ARR["length"] : ACC | ARR["length"]>;

// =============================================================================
// Media Converter Type Declarations
// =============================================================================

// Simple range type for percentages (0-100)
export type Percentage = Range<0, 100>;

// Quality level presets (user-friendly)
export type QualityLevel = "lowest" | "low" | "medium" | "high" | "highest";

// Simple quality settings type for basic mode
export type SimpleQualitySettings = {
  [K in AllOutputExtension]: QualityLevel;
};

// Basic format extensions
export const INPUT_VIDEO_EXTENSIONS = [
  ".mov",
  ".mp4",
  ".avi",
  ".mkv",
  ".mpg",
  ".webm",
  ".ts",
  ".mpeg",
  ".vob",
  ".m2ts",
  ".mts",
  ".m4v",
  ".flv",
  ".3gp",
  ".asf",
  ".wmv",
  ".rmvb",
  ".ogv",
  ".mxf",
  ".nut",
  ".dv",
  ".gxf",
  ".rm",
  ".cdxl",
  ".wtv",
  ".m3u8",
  ".mpd",
  ".seg",
  ".txd",
] as const;
export const INPUT_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".tiff",
  ".tif",
  ".avif",
  ".bmp",
  ".pcx",
  ".tga",
  ".ras",
  ".sgi",
  ".ppm",
  ".pgm",
  ".pbm",
  ".pnm",
  ".xbm",
  ".xpm",
  ".ico",
  ".jp2",
  ".j2k",
  ".pcd",
  ".cin",
  ".wbmp",
  ".xface",
] as const;
export const INPUT_AUDIO_EXTENSIONS = [
  ".mp3",
  ".aac",
  ".wav",
  ".m4a",
  ".flac",
  ".aif",
  ".aiff",
  ".ogg",
  ".oga",
  ".alac",
  ".wma",
  ".opus",
  ".amr",
  ".caf",
  ".au",
  ".snd",
  ".ape",
  ".dsf",
  ".dff",
  ".mpc",
  ".wv",
  ".spx",
  ".xa",
  ".ra",
] as const;

export const OUTPUT_VIDEO_EXTENSIONS = [".mp4", ".avi", ".mov", ".mkv", ".mpg", ".webm"] as const;
export const OUTPUT_AUDIO_EXTENSIONS = [".mp3", ".aac", ".wav", ".flac", ".m4a"] as const;
export const OUTPUT_IMAGE_EXTENSIONS = [".jpg", ".png", ".webp", ".heic", ".tiff", ".avif"] as const;

export const INPUT_ALL_EXTENSIONS = [
  ...INPUT_VIDEO_EXTENSIONS,
  ...INPUT_IMAGE_EXTENSIONS,
  ...INPUT_AUDIO_EXTENSIONS,
] as const;

export const OUTPUT_ALL_EXTENSIONS = [
  ...OUTPUT_VIDEO_EXTENSIONS,
  ...OUTPUT_AUDIO_EXTENSIONS,
  ...OUTPUT_IMAGE_EXTENSIONS,
] as const;

// =============================================================================
// Media Type Definitions
// =============================================================================

export type MediaType = "image" | "audio" | "video";

export type InputVideoExtension = (typeof INPUT_VIDEO_EXTENSIONS)[number];
export type InputImageExtension = (typeof INPUT_IMAGE_EXTENSIONS)[number];
export type InputAudioExtension = (typeof INPUT_AUDIO_EXTENSIONS)[number];

export type OutputVideoExtension = (typeof OUTPUT_VIDEO_EXTENSIONS)[number];
export type OutputImageExtension = (typeof OUTPUT_IMAGE_EXTENSIONS)[number];
export type OutputAudioExtension = (typeof OUTPUT_AUDIO_EXTENSIONS)[number];

export type AllOutputExtension = (typeof OUTPUT_ALL_EXTENSIONS)[number];

// =============================================================================
// Image Quality Settings
// =============================================================================

export type ImageQuality = {
  ".jpg": Percentage;
  ".png": "png-24" | "png-8";
  ".webp": Percentage | "lossless";
  ".heic": Percentage;
  ".tiff": "deflate" | "lzw";
  ".avif": Percentage;
};

// =============================================================================
// Audio Quality Settings
// =============================================================================

export const AUDIO_BITRATES = ["64", "96", "128", "160", "192", "224", "256", "320"] as const;
export type AudioBitrate = (typeof AUDIO_BITRATES)[number];
export const AUDIO_SAMPLE_RATES = ["22050", "44100", "48000", "96000"] as const;
export type AudioSampleRate = (typeof AUDIO_SAMPLE_RATES)[number];
export const AUDIO_BIT_DEPTH = ["16", "24", "32"] as const;
export type AudioBitDepth = (typeof AUDIO_BIT_DEPTH)[number];
export const AUDIO_PROFILES = ["aac_low", "aac_he", "aac_he_v2"] as const;
export type AudioProfile = (typeof AUDIO_PROFILES)[number];
export const AUDIO_COMPRESSION_LEVEL = ["0", "1", "2", "3", "4", "5", "6", "7", "8"] as const;
export type AudioCompressionLevel = (typeof AUDIO_COMPRESSION_LEVEL)[number];

export type AudioControlType = "bitrate" | "vbr" | "profile" | "sampleRate" | "bitDepth" | "compressionLevel";

export type AudioQuality = {
  ".mp3": { bitrate: AudioBitrate; vbr?: boolean };
  ".aac": { bitrate: AudioBitrate; profile?: AudioProfile };
  ".m4a": AudioQuality[".aac"];
  ".wav": { sampleRate: AudioSampleRate; bitDepth: AudioBitDepth };
  ".flac": {
    compressionLevel: AudioCompressionLevel;
    sampleRate: AudioSampleRate;
    bitDepth: "16" | "24";
  };
};

// =============================================================================
// Video Quality Settings
// =============================================================================

export const VIDEO_ENCODING_MODES = ["crf", "vbr", "vbr-2-pass"] as const;
export type VideoEncodingMode = (typeof VIDEO_ENCODING_MODES)[number];
export type VideoCrf = Percentage; // 0-100 for user-friendly quality (converted to FFmpeg CRF 0-51 internally)
export const VIDEO_BITRATE = [
  "50000",
  "40000",
  "30000",
  "25000",
  "20000",
  "15000",
  "10000",
  "8000",
  "5000",
  "4000",
  "3000",
  "2000",
  "1500",
  "1000",
  "750",
  "500",
] as const;
export type VideoBitrate = (typeof VIDEO_BITRATE)[number];
export const VIDEO_MAX_BITRATE = ["", ...VIDEO_BITRATE] as const;
export type VideoMaxBitrate = (typeof VIDEO_MAX_BITRATE)[number];
export const VIDEO_PRESET = [
  "veryslow",
  "slower",
  "slow",
  "medium",
  "fast",
  "faster",
  "veryfast",
  "superfast",
  "ultrafast",
] as const;
export type VideoPreset = (typeof VIDEO_PRESET)[number];
export const PRORES_VARIANTS = ["4444xq", "4444", "hq", "standard", "lt", "proxy"] as const;
export type ProResVariant = (typeof PRORES_VARIANTS)[number];
export const VP9_QUALITY = ["best", "good", "realtime"] as const;
export type VP9Quality = (typeof VP9_QUALITY)[number];

export type VideoControlType =
  | "encodingMode"
  | "crf"
  | "vbr"
  | "vbr-2-pass"
  | "bitrate"
  | "maxBitrate"
  | "preset"
  | "quality"
  | "variant";

export type VideoQuality = {
  ".mp4":
    | { encodingMode: "crf"; crf: VideoCrf; preset: VideoPreset }
    | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate: VideoMaxBitrate; preset: VideoPreset };
  ".avi":
    | { encodingMode: "crf"; crf: VideoCrf }
    | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate: VideoMaxBitrate };
  ".mov": { variant: ProResVariant };
  ".mkv":
    | { encodingMode: "crf"; crf: VideoCrf; preset: VideoPreset }
    | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate: VideoMaxBitrate; preset: VideoPreset };
  ".mpg":
    | { encodingMode: "crf"; crf: VideoCrf }
    | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate: VideoMaxBitrate };
  ".webm":
    | { encodingMode: "crf"; crf: VideoCrf; quality: VP9Quality }
    | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate: VideoMaxBitrate; quality: VP9Quality };
};

// =============================================================================
// Universal Quality Type
// =============================================================================

export type QualitySettings = ImageQuality | AudioQuality | VideoQuality;
export type AllControlType = VideoControlType | AudioControlType | "qualityLevel";

// =============================================================================
// Simple Quality Level Mappings
// =============================================================================

export const SIMPLE_QUALITY_MAPPINGS = {
  // Audio quality mappings
  ".mp3": {
    lowest: { bitrate: "96", vbr: false },
    low: { bitrate: "128", vbr: false },
    medium: { bitrate: "192", vbr: true },
    high: { bitrate: "256", vbr: true },
    highest: { bitrate: "320", vbr: true },
  },
  ".aac": {
    lowest: { bitrate: "96", profile: "aac_low" },
    low: { bitrate: "128", profile: "aac_low" },
    medium: { bitrate: "192", profile: "aac_low" },
    high: { bitrate: "256", profile: "aac_low" },
    highest: { bitrate: "320", profile: "aac_low" },
  },
  ".m4a": {
    lowest: { bitrate: "96", profile: "aac_low" },
    low: { bitrate: "128", profile: "aac_low" },
    medium: { bitrate: "192", profile: "aac_low" },
    high: { bitrate: "256", profile: "aac_low" },
    highest: { bitrate: "320", profile: "aac_low" },
  },
  ".wav": {
    lowest: { sampleRate: "22050", bitDepth: "16" },
    low: { sampleRate: "44100", bitDepth: "16" },
    medium: { sampleRate: "44100", bitDepth: "16" },
    high: { sampleRate: "48000", bitDepth: "24" },
    highest: { sampleRate: "96000", bitDepth: "24" },
  },
  ".flac": {
    lowest: { compressionLevel: "8", sampleRate: "44100", bitDepth: "16" },
    low: { compressionLevel: "5", sampleRate: "44100", bitDepth: "16" },
    medium: { compressionLevel: "5", sampleRate: "44100", bitDepth: "16" },
    high: { compressionLevel: "3", sampleRate: "48000", bitDepth: "24" },
    highest: { compressionLevel: "0", sampleRate: "96000", bitDepth: "24" },
  },

  // Video quality mappings
  ".mp4": {
    lowest: { encodingMode: "crf", crf: 30, preset: "fast" },
    low: { encodingMode: "crf", crf: 50, preset: "medium" },
    medium: { encodingMode: "crf", crf: 75, preset: "medium" },
    high: { encodingMode: "crf", crf: 85, preset: "slow" },
    highest: { encodingMode: "crf", crf: 95, preset: "slower" },
  },
  ".avi": {
    lowest: { encodingMode: "crf", crf: 30 },
    low: { encodingMode: "crf", crf: 50 },
    medium: { encodingMode: "crf", crf: 75 },
    high: { encodingMode: "crf", crf: 85 },
    highest: { encodingMode: "crf", crf: 95 },
  },
  ".mov": {
    lowest: { variant: "proxy" },
    low: { variant: "lt" },
    medium: { variant: "standard" },
    high: { variant: "hq" },
    highest: { variant: "4444" },
  },
  ".mkv": {
    lowest: { encodingMode: "crf", crf: 30, preset: "fast" },
    low: { encodingMode: "crf", crf: 50, preset: "medium" },
    medium: { encodingMode: "crf", crf: 75, preset: "medium" },
    high: { encodingMode: "crf", crf: 85, preset: "slow" },
    highest: { encodingMode: "crf", crf: 95, preset: "slower" },
  },
  ".mpg": {
    lowest: { encodingMode: "crf", crf: 30 },
    low: { encodingMode: "crf", crf: 50 },
    medium: { encodingMode: "crf", crf: 75 },
    high: { encodingMode: "crf", crf: 85 },
    highest: { encodingMode: "crf", crf: 95 },
  },
  ".webm": {
    lowest: { encodingMode: "crf", crf: 30, quality: "realtime" },
    low: { encodingMode: "crf", crf: 50, quality: "good" },
    medium: { encodingMode: "crf", crf: 60, quality: "good" },
    high: { encodingMode: "crf", crf: 75, quality: "good" },
    highest: { encodingMode: "crf", crf: 90, quality: "best" },
  },
} as const;

export const DEFAULT_SIMPLE_QUALITY: QualityLevel = "high";

// =============================================================================
// Default Quality Settings
// =============================================================================

export const DEFAULT_QUALITIES = {
  // Image defaults
  ".jpg": 80,
  ".png": "png-24",
  ".webp": 80,
  ".heic": 80,
  ".tiff": "deflate",
  ".avif": 80,

  // Audio defaults
  ".mp3": { bitrate: "192", vbr: true },
  ".aac": { bitrate: "192", profile: "aac_low" },
  ".m4a": { bitrate: "192", profile: "aac_low" },
  ".wav": { sampleRate: "44100", bitDepth: "16" },
  ".flac": {
    compressionLevel: "5",
    sampleRate: "44100",
    bitDepth: "16",
  },

  // Video defaults (CRF mode)
  ".mp4": { encodingMode: "crf", crf: 75, preset: "medium" },
  ".avi": { encodingMode: "crf", crf: 75 },
  ".mov": { variant: "standard" },
  ".mkv": { encodingMode: "crf", crf: 75, preset: "medium" },
  ".mpg": { encodingMode: "crf", crf: 75 },
  ".webm": { encodingMode: "crf", crf: 60, quality: "good" },
} as const;

// Video VBR defaults (for when switching to VBR modes)
export const DEFAULT_VBR_QUALITIES = {
  ".mp4": { encodingMode: "vbr", bitrate: "2000", maxBitrate: "", preset: "medium" },
  ".avi": { encodingMode: "vbr", bitrate: "2000", maxBitrate: "" },
  ".mkv": { encodingMode: "vbr", bitrate: "2000", maxBitrate: "", preset: "medium" },
  ".mpg": { encodingMode: "vbr", bitrate: "2000", maxBitrate: "" },
  ".webm": { encodingMode: "vbr", bitrate: "2000", maxBitrate: "", quality: "good" },
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

export function getMediaType(extension: string): MediaType | null {
  extension = extension.toLowerCase();
  if (INPUT_IMAGE_EXTENSIONS.includes(extension as InputImageExtension)) return "image";
  if (INPUT_AUDIO_EXTENSIONS.includes(extension as InputAudioExtension)) return "audio";
  if (INPUT_VIDEO_EXTENSIONS.includes(extension as InputVideoExtension)) return "video";
  return null;
}

type SimpleQualityMappingExtension = keyof typeof SIMPLE_QUALITY_MAPPINGS;

export function getDefaultQuality(
  format: AllOutputExtension,
  preferences: PreferenceValues,
  qualityLevel?: QualityLevel,
): QualitySettings {
  // For images or when advanced settings are enabled, use DEFAULT_QUALITIES
  if (!preferences) {
    throw new Error(`fn getDefaultQuality: Provide preferences`);
  }

  if (getMediaType(format) === "image" || preferences.moreConversionSettings) {
    return {
      [format]: DEFAULT_QUALITIES[format],
    } as QualitySettings;
  }

  if (!qualityLevel) {
    throw new Error(`fn getDefaultQuality: Simple quality mapping is true, provide qualityLevel`);
  }

  if ((format as SimpleQualityMappingExtension) in SIMPLE_QUALITY_MAPPINGS) {
    return {
      [format]: SIMPLE_QUALITY_MAPPINGS[format as SimpleQualityMappingExtension][qualityLevel],
    } as QualitySettings;
  }

  throw new Error(`Unsupported format for simple quality mapping: ${format}`);
}
