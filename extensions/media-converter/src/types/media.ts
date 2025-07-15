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
type Percentage = Range<0, 100>;

// Quality level presets (user-friendly)
export type QualityLevel = "low" | "medium" | "high" | "lossless";

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

// Common audio values
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

// Common video values
export type VideoEncodingMode = "crf" | "vbr" | "vbr-2-pass";
export type VideoCrf = Range<0, 51>;
export const VIDEO_BITRATE = [
  "500",
  "750",
  "1000",
  "1500",
  "2000",
  "3000",
  "4000",
  "5000",
  "8000",
  "10000",
  "15000",
  "20000",
  "25000",
  "30000",
  "40000",
  "50000",
] as const;
export type VideoBitrate = (typeof VIDEO_BITRATE)[number];
export const VIDEO_PRESET = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
];
export type VideoPreset = (typeof VIDEO_PRESET)[number];
export type ProResVariant = "proxy" | "lt" | "standard" | "hq" | "4444" | "4444xq";
export type VP9Quality = "good" | "best" | "realtime";

export type VideoQuality = {
  ".mp4":
    | { encodingMode: "crf"; crf: VideoCrf; preset: VideoPreset }
    | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate?: VideoBitrate; preset: VideoPreset };
  ".avi":
    | { encodingMode: "crf"; crf: VideoCrf }
    | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate?: VideoBitrate };
  ".mov": { variant: ProResVariant };
  ".mkv":
    | { encodingMode: "crf"; crf: VideoCrf; preset: VideoPreset }
    | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate?: VideoBitrate; preset: VideoPreset };
  ".mpg":
    | { encodingMode: "crf"; crf: VideoCrf }
    | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate?: VideoBitrate };
  ".webm":
    | { encodingMode: "crf"; crf: VideoCrf; quality: VP9Quality }
    | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate?: VideoBitrate; quality: VP9Quality };
};

// =============================================================================
// Universal Quality Type
// =============================================================================

export type QualitySettings = ImageQuality | AudioQuality | VideoQuality;

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
    compressionLevel: 5,
    sampleRate: "44100",
    bitDepth: "16",
  },

  // Video defaults
  ".mp4": { encodingMode: "crf", crf: 23, preset: "medium" },
  ".avi": { encodingMode: "crf", crf: 23 },
  ".mov": { variant: "standard" },
  ".mkv": { encodingMode: "crf", crf: 23, preset: "medium" },
  ".mpg": { encodingMode: "crf", crf: 23 },
  ".webm": { encodingMode: "crf", crf: 30, quality: "good" },
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

export function getMediaType(extension: string): MediaType | null {
  const ext = extension.toLowerCase();
  if (INPUT_IMAGE_EXTENSIONS.includes(ext as InputImageExtension)) return "image";
  if (INPUT_AUDIO_EXTENSIONS.includes(ext as InputAudioExtension)) return "audio";
  if (INPUT_VIDEO_EXTENSIONS.includes(ext as InputVideoExtension)) return "video";
  return null;
}
