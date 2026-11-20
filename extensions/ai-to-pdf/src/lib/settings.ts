import { getPreferenceValues } from "@raycast/api";

export type BleedMode = "file" | "custom" | "off";

export type Settings = {
  defaultBleedMode: BleedMode;
  customBleedMm: number;
  pdfPreset: string;
  suffixBleed: string;
  suffixNoBleed: string;
  destination?: string;
  overwrite: boolean;
  revealInFinder: boolean;
  timeoutMs: number;
};

const DEFAULT_BLEED_MM = 3;
const DEFAULT_TIMEOUT_SECONDS = 180;

function toNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  // Accept both "3" and "3,5" — a comma is the decimal separator in most of Europe.
  const parsed = Number.parseFloat((value ?? "").replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function toBleedMode(value: string | undefined): BleedMode {
  return value === "custom" || value === "off" ? value : "file";
}

export function getSettings(): Settings {
  const preferences = getPreferenceValues<Preferences>();
  return {
    defaultBleedMode: toBleedMode(preferences.defaultBleedMode),
    customBleedMm: toNumber(preferences.customBleedMm, DEFAULT_BLEED_MM, 0, 100),
    pdfPreset: (preferences.pdfPreset ?? "").trim(),
    suffixBleed: preferences.suffixBleed ?? "",
    suffixNoBleed: preferences.suffixNoBleed ?? "",
    destination: preferences.destination?.trim() || undefined,
    overwrite: preferences.overwrite ?? false,
    revealInFinder: preferences.revealInFinder ?? false,
    timeoutMs: toNumber(preferences.timeoutSeconds, DEFAULT_TIMEOUT_SECONDS, 30, 3600) * 1000,
  };
}
