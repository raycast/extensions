import {
  AUDIO_BITRATES,
  AUDIO_BIT_DEPTH,
  AUDIO_COMPRESSION_LEVEL,
  AUDIO_PROFILES,
  AUDIO_SAMPLE_RATES,
  DEFAULT_QUALITIES,
  SIMPLE_QUALITY_MAPPINGS,
  buildVideoQuality,
  type AudioQuality,
  type ImageQuality,
  type MediaType,
  type OutputAudioExtension,
  type OutputImageExtension,
  type OutputVideoExtension,
  type ProResVariant,
  type QualityLevel,
  type QualitySettings,
  type VideoBitrate,
  type VideoEncodingMode,
  type VideoMaxBitrate,
  type VideoPreset,
  type VideoQuality,
} from "../types/media";

export type QualityOverrides = {
  imageQualityPercent?: number;
  webpLossless?: boolean;
  pngVariant?: "png-24" | "png-8";
  tiffCompression?: "deflate" | "lzw";
  audioBitrate?: (typeof AUDIO_BITRATES)[number];
  audioVbr?: boolean;
  audioProfile?: (typeof AUDIO_PROFILES)[number];
  audioSampleRate?: (typeof AUDIO_SAMPLE_RATES)[number];
  audioBitDepth?: (typeof AUDIO_BIT_DEPTH)[number];
  flacCompressionLevel?: (typeof AUDIO_COMPRESSION_LEVEL)[number];
  videoEncodingMode?: VideoEncodingMode;
  videoCrf?: number;
  videoBitrate?: VideoBitrate;
  videoMaxBitrate?: VideoMaxBitrate;
  videoPreset?: VideoPreset;
  proresVariant?: ProResVariant;
  vp9Quality?: "best" | "good" | "realtime";
};

export function clampPercent(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function oneOf<T extends readonly (string | number)[]>(
  value: T[number] | undefined,
  allowed: T,
  fallback: T[number],
): T[number] {
  return value !== undefined && allowed.includes(value) ? value : fallback;
}

export function resolveQualitySettings(
  mediaType: MediaType,
  outputFileType: OutputImageExtension | OutputAudioExtension | OutputVideoExtension,
  quality: QualityLevel | undefined,
  overrides: QualityOverrides = {},
  baseQuality?: QualitySettings,
): QualitySettings {
  const baseDefault =
    (baseQuality as Record<string, unknown> | undefined)?.[outputFileType] ?? DEFAULT_QUALITIES[outputFileType];

  if (mediaType === "image") {
    const format = outputFileType as OutputImageExtension;
    const current = baseDefault as ImageQuality[OutputImageExtension];
    let value: ImageQuality[OutputImageExtension] = current;
    const pct = clampPercent(overrides.imageQualityPercent);
    switch (format) {
      case ".jpg":
      case ".heic":
      case ".avif":
        if (format === ".heic" && process.platform !== "darwin")
          throw new Error("HEIC output is only supported on macOS.");
        value = (pct ?? current) as ImageQuality[OutputImageExtension];
        break;
      case ".webp":
        value = overrides.webpLossless ? "lossless" : ((pct ?? current) as ImageQuality[".webp"]);
        break;
      case ".png":
        value = oneOf(overrides.pngVariant, ["png-24", "png-8"] as const, current as ImageQuality[".png"]);
        break;
      case ".tiff":
        value = oneOf(overrides.tiffCompression, ["deflate", "lzw"] as const, current as ImageQuality[".tiff"]);
        break;
    }
    return { [format]: value } as QualitySettings;
  }

  if (mediaType === "audio") {
    const format = outputFileType as OutputAudioExtension;
    const advanced = Boolean(
      overrides.audioBitrate ||
        typeof overrides.audioVbr === "boolean" ||
        overrides.audioProfile ||
        overrides.audioSampleRate ||
        overrides.audioBitDepth ||
        overrides.flacCompressionLevel,
    );
    let value = (
      advanced ? baseDefault : quality ? (SIMPLE_QUALITY_MAPPINGS[format]?.[quality] ?? baseDefault) : baseDefault
    ) as AudioQuality[keyof AudioQuality];
    switch (format) {
      case ".mp3": {
        const current = value as AudioQuality[".mp3"];
        value = {
          bitrate: oneOf(overrides.audioBitrate, AUDIO_BITRATES, current.bitrate),
          vbr: overrides.audioVbr ?? current.vbr,
        };
        break;
      }
      case ".aac":
      case ".m4a": {
        const current = value as AudioQuality[".aac"];
        value = {
          bitrate: oneOf(overrides.audioBitrate, AUDIO_BITRATES, current.bitrate),
          profile: oneOf(overrides.audioProfile, AUDIO_PROFILES, current.profile ?? "aac_low"),
        };
        break;
      }
      case ".wav": {
        const current = value as AudioQuality[".wav"];
        value = {
          sampleRate: oneOf(overrides.audioSampleRate, AUDIO_SAMPLE_RATES, current.sampleRate),
          bitDepth: oneOf(overrides.audioBitDepth, AUDIO_BIT_DEPTH, current.bitDepth),
        };
        break;
      }
      case ".flac": {
        const current = value as AudioQuality[".flac"];
        value = {
          compressionLevel: oneOf(overrides.flacCompressionLevel, AUDIO_COMPRESSION_LEVEL, current.compressionLevel),
          sampleRate: oneOf(overrides.audioSampleRate, AUDIO_SAMPLE_RATES, current.sampleRate),
          bitDepth:
            overrides.audioBitDepth === "32"
              ? "24"
              : oneOf(overrides.audioBitDepth, ["16", "24"] as const, current.bitDepth),
        };
        break;
      }
    }
    return { [format]: value } as QualitySettings;
  }

  const format = outputFileType as OutputVideoExtension;
  const advanced = Boolean(
    overrides.videoEncodingMode ||
      typeof overrides.videoCrf === "number" ||
      overrides.videoBitrate ||
      typeof overrides.videoMaxBitrate === "string" ||
      overrides.videoPreset ||
      overrides.proresVariant ||
      overrides.vp9Quality,
  );
  const current = (
    advanced ? baseDefault : quality ? (SIMPLE_QUALITY_MAPPINGS[format]?.[quality] ?? baseDefault) : baseDefault
  ) as VideoQuality[OutputVideoExtension];
  const built = buildVideoQuality(
    format,
    {
      encodingMode: overrides.videoEncodingMode,
      crf: clampPercent(overrides.videoCrf),
      bitrate: overrides.videoBitrate,
      maxBitrate: overrides.videoMaxBitrate,
      preset: overrides.videoPreset,
      quality: overrides.vp9Quality,
      variant: overrides.proresVariant,
    },
    current,
  );
  return { [format]: built } as QualitySettings;
}
