import { getPreferenceValues } from "@raycast/api";

/** Defaults shared by both commands (sourced from extension preferences). */
export interface SharedDefaults {
  quality?: number;
  stripMetadata: boolean;
  overwrite: boolean;
}

/** Convert-specific defaults (adds the target format and the compress toggle). */
export interface ConvertDefaults extends SharedDefaults {
  format?: string;
  /** Mirrors the app's "Compress after converting" setting. */
  compress: boolean;
}

function parseQuality(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function convertDefaults(): ConvertDefaults {
  const prefs = getPreferenceValues<Preferences.Convert>();
  const format = prefs.defaultFormat?.trim().toLowerCase().replace(/^\./, "");
  return {
    format: format || undefined,
    quality: parseQuality(prefs.defaultQuality),
    stripMetadata: prefs.stripMetadata ?? false,
    overwrite: prefs.overwrite ?? false,
    compress: prefs.compressAfterConverting ?? false,
  };
}

export function compressDefaults(): SharedDefaults {
  const prefs = getPreferenceValues<Preferences.Compress>();
  return {
    quality: parseQuality(prefs.defaultQuality),
    stripMetadata: prefs.stripMetadata ?? false,
    overwrite: prefs.overwrite ?? false,
  };
}
