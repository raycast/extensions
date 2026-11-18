export const GETCOMPRESS_BUNDLE_ID = "com.getcompress";
export const GETCOMPRESS_SCHEME = "getcompress";

export const CURRENT_PRESET_VALUE = "current";
export const PRESET_QUALITY_VALUE = "preset";
export const SAME_OUTPUT_FORMAT_VALUE = "same";

export const VALID_QUALITIES = [
  "balanced",
  "original",
  "high",
  "medium",
  "low",
] as const;
export type Quality = (typeof VALID_QUALITIES)[number];

export const FALLBACK_QUALITY_OPTIONS: Quality[] = [
  "balanced",
  "original",
  "high",
  "medium",
  "low",
];

export const VIDEO_OUTPUT_FORMATS = ["mp4", "gif", "webm", "mov"] as const;
export const IMAGE_OUTPUT_FORMATS = ["jpeg", "png", "webp", "avif"] as const;

export type OutputFormat =
  | (typeof VIDEO_OUTPUT_FORMATS)[number]
  | (typeof IMAGE_OUTPUT_FORMATS)[number];

export function isQuality(value: string): value is Quality {
  return isOneOf(VALID_QUALITIES, value);
}

export function isOutputFormat(value: string): value is OutputFormat {
  return (
    isOneOf(VIDEO_OUTPUT_FORMATS, value) || isOneOf(IMAGE_OUTPUT_FORMATS, value)
  );
}

export function parseQualityOverride(
  value: string | undefined,
): Quality | undefined {
  if (!value || value === PRESET_QUALITY_VALUE) {
    return undefined;
  }

  return isQuality(value) ? value : undefined;
}

export function parseOutputFormatOverride(
  value: string | undefined,
): OutputFormat | undefined {
  if (!value || value === SAME_OUTPUT_FORMAT_VALUE) {
    return undefined;
  }

  return isOutputFormat(value) ? value : undefined;
}

export function parseQuickPresetIndex(
  value: string | undefined,
): number | undefined {
  if (!value || value === CURRENT_PRESET_VALUE) {
    return undefined;
  }

  const match = /^preset-(\d+)$/.exec(value);
  if (!match) {
    return undefined;
  }

  const index = Number(match[1]);
  return Number.isSafeInteger(index) && index >= 0 ? index : undefined;
}

function isOneOf<const T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return values.some((allowedValue) => allowedValue === value);
}
