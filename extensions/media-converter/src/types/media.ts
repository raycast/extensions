// =============================================================================
// Media Converter Type Declarations
// =============================================================================

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

export type ImageQualitySettings = {
  ".jpg": number;
  ".png": "png-24" | "png-8";
  ".webp": number | "lossless";
  ".heic": number;
  ".tiff": "deflate" | "lzw";
  ".avif": number;
};

export type ImageQuality<T extends OutputImageExtension> = ImageQualitySettings[T];

// =============================================================================
// Audio Quality Settings
// =============================================================================

export type AudioBitrate = "64" | "96" | "128" | "160" | "192" | "224" | "256" | "320";
export type AudioSampleRate = "22050" | "44100" | "48000" | "96000";

export type Mp3Quality = {
  bitrate: AudioBitrate;
  vbr?: boolean;
};

export type AacQuality = {
  bitrate: AudioBitrate;
  profile?: "aac_low" | "aac_he" | "aac_he_v2";
};

export type WavQuality = {
  sampleRate: AudioSampleRate;
  bitDepth: "16" | "24" | "32";
};

export type FlacQuality = {
  compressionLevel: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
  sampleRate: AudioSampleRate;
  bitDepth: "16" | "24";
};

export type AudioQualitySettings = {
  ".mp3": Mp3Quality;
  ".aac": AacQuality;
  ".m4a": AacQuality;
  ".wav": WavQuality;
  ".flac": FlacQuality;
};

export type AudioQuality<T extends OutputAudioExtension> = AudioQualitySettings[T];

// =============================================================================
// Video Quality Settings
// =============================================================================

export type VideoEncodingMode = "crf" | "vbr" | "vbr-2-pass";
export type VideoCrf =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16"
  | "17"
  | "18"
  | "19"
  | "20"
  | "21"
  | "22"
  | "23"
  | "24"
  | "25"
  | "26"
  | "27"
  | "28"
  | "29"
  | "30"
  | "31"
  | "32"
  | "33"
  | "34"
  | "35"
  | "36"
  | "37"
  | "38"
  | "39"
  | "40"
  | "41"
  | "42"
  | "43"
  | "44"
  | "45"
  | "46"
  | "47"
  | "48"
  | "49"
  | "50"
  | "51";
export type VideoBitrate =
  | "500"
  | "750"
  | "1000"
  | "1500"
  | "2000"
  | "3000"
  | "4000"
  | "5000"
  | "8000"
  | "10000"
  | "15000"
  | "20000"
  | "25000"
  | "30000"
  | "40000"
  | "50000";

export type H264Preset =
  | "ultrafast"
  | "superfast"
  | "veryfast"
  | "faster"
  | "fast"
  | "medium"
  | "slow"
  | "slower"
  | "veryslow";
export type H265Preset =
  | "ultrafast"
  | "superfast"
  | "veryfast"
  | "faster"
  | "fast"
  | "medium"
  | "slow"
  | "slower"
  | "veryslow";
export type ProResVariant = "proxy" | "lt" | "standard" | "hq" | "4444" | "4444xq";
export type VP9Quality = "good" | "best" | "realtime";

export type Mp4Quality = {
  encodingMode: VideoEncodingMode;
  preset: H264Preset;
} & (
  | { encodingMode: "crf"; crf: VideoCrf }
  | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate?: VideoBitrate }
);

export type AviQuality = {
  encodingMode: VideoEncodingMode;
} & ({ encodingMode: "crf"; crf: VideoCrf } | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate });

export type MovQuality = {
  variant: ProResVariant;
};

export type MkvQuality = {
  encodingMode: VideoEncodingMode;
  preset: H265Preset;
} & (
  | { encodingMode: "crf"; crf: VideoCrf }
  | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate?: VideoBitrate }
);

export type MpgQuality = {
  encodingMode: VideoEncodingMode;
} & ({ encodingMode: "crf"; crf: VideoCrf } | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate });

export type WebmQuality = {
  encodingMode: VideoEncodingMode;
  quality: VP9Quality;
} & (
  | { encodingMode: "crf"; crf: VideoCrf }
  | { encodingMode: "vbr" | "vbr-2-pass"; bitrate: VideoBitrate; maxBitrate?: VideoBitrate }
);

export type VideoQualitySettings = {
  ".mp4": Mp4Quality;
  ".avi": AviQuality;
  ".mov": MovQuality;
  ".mkv": MkvQuality;
  ".mpg": MpgQuality;
  ".webm": WebmQuality;
};

export type VideoQuality<T extends OutputVideoExtension> = VideoQualitySettings[T];

// =============================================================================
// Universal Quality Type (Conditional based on extension)
// =============================================================================

export type QualitySettings<T extends AllOutputExtension> = T extends OutputImageExtension
  ? ImageQuality<T>
  : T extends OutputAudioExtension
    ? AudioQuality<T>
    : T extends OutputVideoExtension
      ? VideoQuality<T>
      : never;

// =============================================================================
// Helper types for property extraction
// =============================================================================

// Helper union types for audio quality properties
export type AudioBitrateValue = Mp3Quality["bitrate"] | AacQuality["bitrate"];
export type AudioProfileValue = AacQuality["profile"];
export type AudioSampleRateValue = WavQuality["sampleRate"] | FlacQuality["sampleRate"];
export type AudioBitDepthValue = WavQuality["bitDepth"] | FlacQuality["bitDepth"];
export type AudioCompressionValue = FlacQuality["compressionLevel"];
export type AudioVbrValue = Mp3Quality["vbr"];

// Helper union types for video quality properties
export type VideoEncodingModeValue = VideoEncodingMode;
export type VideoCrfValue = VideoCrf;
export type VideoBitrateValue = VideoBitrate;
export type VideoPresetValue = H264Preset | H265Preset;
export type VideoVariantValue = ProResVariant;
export type VideoQualityValue = VP9Quality;

// Type guards for checking specific format types
export function isImageFormat(format: AllOutputExtension): format is OutputImageExtension {
  return OUTPUT_IMAGE_EXTENSIONS.includes(format as OutputImageExtension);
}

export function isAudioFormat(format: AllOutputExtension): format is OutputAudioExtension {
  return OUTPUT_AUDIO_EXTENSIONS.includes(format as OutputAudioExtension);
}

export function isVideoFormat(format: AllOutputExtension): format is OutputVideoExtension {
  return OUTPUT_VIDEO_EXTENSIONS.includes(format as OutputVideoExtension);
}

// =============================================================================
// Conversion Parameters
// =============================================================================

export interface ConversionParams<T extends AllOutputExtension> {
  inputPath: string;
  outputFormat: T;
  quality: QualitySettings<T>;
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

// =============================================================================
// Default Quality Settings
// =============================================================================

export const DEFAULT_IMAGE_QUALITY: ImageQualitySettings = {
  ".jpg": 80,
  ".png": "png-24",
  ".webp": 80,
  ".heic": 80,
  ".tiff": "deflate",
  ".avif": 80,
};

export const DEFAULT_AUDIO_QUALITY: AudioQualitySettings = {
  ".mp3": { bitrate: "192", vbr: false },
  ".aac": { bitrate: "192", profile: "aac_low" },
  ".wav": { sampleRate: "44100", bitDepth: "16" },
  ".flac": { compressionLevel: "5", sampleRate: "44100", bitDepth: "16" },
  ".m4a": { bitrate: "192", profile: "aac_low" },
};

export const DEFAULT_VIDEO_QUALITY: VideoQualitySettings = {
  ".mp4": { encodingMode: "crf", crf: "23", preset: "medium" },
  ".avi": { encodingMode: "crf", crf: "23" },
  ".mov": { variant: "standard" },
  ".mkv": { encodingMode: "crf", crf: "23", preset: "medium" },
  ".mpg": { encodingMode: "crf", crf: "23" },
  ".webm": { encodingMode: "crf", crf: "30", quality: "good" },
};

// =============================================================================
// Helper Functions
// =============================================================================

export function getDefaultQuality<T extends AllOutputExtension>(format: T): QualitySettings<T> {
  if (OUTPUT_IMAGE_EXTENSIONS.includes(format as OutputImageExtension)) {
    return DEFAULT_IMAGE_QUALITY[format as OutputImageExtension] as QualitySettings<T>;
  }
  if (OUTPUT_AUDIO_EXTENSIONS.includes(format as OutputAudioExtension)) {
    return DEFAULT_AUDIO_QUALITY[format as OutputAudioExtension] as QualitySettings<T>;
  }
  if (OUTPUT_VIDEO_EXTENSIONS.includes(format as OutputVideoExtension)) {
    return DEFAULT_VIDEO_QUALITY[format as OutputVideoExtension] as QualitySettings<T>;
  }
  throw new Error(`Unknown format: ${format}`);
}

export function getMediaType(extension: string): MediaType | null {
  const ext = extension.toLowerCase();
  if (INPUT_IMAGE_EXTENSIONS.includes(ext as InputImageExtension)) return "image";
  if (INPUT_AUDIO_EXTENSIONS.includes(ext as InputAudioExtension)) return "audio";
  if (INPUT_VIDEO_EXTENSIONS.includes(ext as InputVideoExtension)) return "video";
  return null;
}

export function isValidOutputFormat(format: string): format is AllOutputExtension {
  return OUTPUT_ALL_EXTENSIONS.includes(format as AllOutputExtension);
}
