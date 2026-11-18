import { homedir } from "os";
import path from "path";
import { readFile } from "fs/promises";
import { FALLBACK_QUALITY_OPTIONS, isQuality, Quality } from "./constants";

const FALLBACK_MEDIA_TYPES_MAPPING: Record<string, string> = {
  // Images
  avif: "image",
  bmp: "image",
  heic: "image",
  heif: "image",
  jpeg: "image",
  jpg: "image",
  png: "image",
  svg: "image",
  tif: "image",
  tiff: "image",
  webp: "image",

  // GIF is handled as its own media type by GetCompress.
  gif: "gif",

  // PDF
  pdf: "pdf",

  // Video
  "3g2": "video",
  "3gp": "video",
  avi: "video",
  m4v: "video",
  mkv: "video",
  mov: "video",
  mp4: "video",
  mpeg: "video",
  mpg: "video",
  webm: "video",
  wmv: "video",
};

export interface ReusablePresetOption {
  id: string;
  title: string;
}

export interface SharedData {
  reusablePresets: ReusablePresetOption[];
  presetsOptions: Record<string, { quality?: Array<{ type: string }> }>;
  mediaTypesMapping: Record<string, string>;
}

export async function readSharedData(): Promise<SharedData> {
  try {
    const bytes = await readFile(getSharedDataPath(), "utf8");
    const json: unknown = JSON.parse(bytes);
    return parseSharedData(json);
  } catch {
    return emptySharedData();
  }
}

export function getMediaTypeForPath(
  filePath: string,
  sharedData: SharedData,
): string | undefined {
  const extension = path.extname(filePath).replace(/^\./, "").toLowerCase();
  if (!extension) {
    return undefined;
  }

  return (
    sharedData.mediaTypesMapping[extension] ??
    FALLBACK_MEDIA_TYPES_MAPPING[extension]
  );
}

export function getCommonMediaType(
  filePaths: string[],
  sharedData: SharedData,
): string | undefined {
  const mediaTypes = filePaths.map((filePath) =>
    getMediaTypeForPath(filePath, sharedData),
  );
  const firstMediaType = mediaTypes[0];

  if (
    !firstMediaType ||
    mediaTypes.some((mediaType) => mediaType !== firstMediaType)
  ) {
    return undefined;
  }

  return firstMediaType;
}

export function getQualityOptionsForMediaType(
  mediaType: string | undefined,
  sharedData: SharedData,
): Quality[] {
  const configuredQualities = mediaType
    ? sharedData.presetsOptions[mediaType]?.quality
        ?.map((option) => option.type)
        .filter((quality): quality is Quality => isQuality(quality))
    : undefined;

  if (configuredQualities && configuredQualities.length > 0) {
    return Array.from(new Set(configuredQualities));
  }

  return FALLBACK_QUALITY_OPTIONS;
}

function getSharedDataPath(): string {
  if (process.platform === "win32") {
    return path.join(
      process.env.LOCALAPPDATA || path.join(homedir(), "AppData", "Local"),
      "com.getcompress",
      "getcompress.json",
    );
  }

  return path.join(
    homedir(),
    "Library",
    "Application Support",
    "com.getcompress",
    "getcompress.json",
  );
}

function parseSharedData(json: unknown): SharedData {
  const document = isRecord(json) ? json : {};
  const reusablePresetsDocument = isRecord(document.reusable_presets)
    ? document.reusable_presets
    : {};
  const reusablePresetOptions = reusablePresetsDocument.options;

  const reusablePresets = Array.isArray(reusablePresetOptions)
    ? reusablePresetOptions.filter(isReusablePresetOption)
    : [];

  return {
    reusablePresets,
    presetsOptions: parsePresetsOptions(document.presets_options),
    mediaTypesMapping: parseMediaTypesMapping(document.media_types_mapping),
  };
}

function parsePresetsOptions(value: unknown): SharedData["presetsOptions"] {
  if (!isRecord(value)) {
    return {};
  }

  const result: SharedData["presetsOptions"] = {};
  for (const [mediaType, mediaOptions] of Object.entries(value)) {
    if (!isRecord(mediaOptions)) {
      continue;
    }

    const quality = Array.isArray(mediaOptions.quality)
      ? mediaOptions.quality.filter(
          (option): option is { type: string } =>
            isRecord(option) && typeof option.type === "string",
        )
      : undefined;

    result[mediaType] = { quality };
  }

  return result;
}

function parseMediaTypesMapping(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [extension, mediaType] of Object.entries(value)) {
    if (typeof mediaType === "string" && extension.trim()) {
      result[extension.toLowerCase()] = mediaType;
    }
  }

  return result;
}

function emptySharedData(): SharedData {
  return {
    reusablePresets: [],
    presetsOptions: {},
    mediaTypesMapping: {},
  };
}

function isReusablePresetOption(value: unknown): value is ReusablePresetOption {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
