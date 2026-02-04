import { getPreferenceValues, LocalStorage } from "@raycast/api";

interface RawPreferences {
  sharpPath: string;
  outputToSource: boolean;
  customOutputDir?: string;
  webpQuality: string;
  avifQuality: string;
  jpegQuality: string;
  overwriteOriginal: boolean;
}

export interface Preferences {
  sharpPath: string;
  outputToSource: boolean;
  customOutputDir?: string;
  webpQuality: number;
  avifQuality: number;
  jpegQuality: number;
  overwriteOriginal: boolean;
}

interface StoredSettings {
  webpQuality?: string;
  avifQuality?: string;
  jpegQuality?: string;
  overwriteOriginal?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

let cachedSettings: StoredSettings | null = null;

export async function loadStoredSettings(): Promise<StoredSettings> {
  const stored = await LocalStorage.getItem<string>("sharp-image-settings");
  if (stored) {
    cachedSettings = JSON.parse(stored);
    return cachedSettings;
  }
  return {};
}

export function getPreferences(): Preferences {
  const raw = getPreferenceValues<RawPreferences>();
  const stored = cachedSettings || {};

  return {
    sharpPath: raw.sharpPath || "/usr/local/bin/sharp",
    outputToSource: raw.outputToSource ?? true,
    customOutputDir: raw.customOutputDir,
    webpQuality: clamp(parseInt(stored.webpQuality || raw.webpQuality, 10) || 80, 1, 100),
    avifQuality: clamp(parseInt(stored.avifQuality || raw.avifQuality, 10) || 65, 1, 100),
    jpegQuality: clamp(parseInt(stored.jpegQuality || raw.jpegQuality, 10) || 85, 1, 100),
    overwriteOriginal: stored.overwriteOriginal ?? raw.overwriteOriginal ?? false,
  };
}
