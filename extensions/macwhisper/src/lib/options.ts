import { OutputFormat } from "./mw";

/** Keep in sync with the `defaultLanguage` preference in package.json. */
export const LANGUAGES: { code: string; title: string }[] = [
  { code: "auto", title: "Auto-detect" },
  { code: "en", title: "English" },
  { code: "fr", title: "French" },
  { code: "de", title: "German" },
  { code: "es", title: "Spanish" },
  { code: "it", title: "Italian" },
  { code: "pt", title: "Portuguese" },
  { code: "nl", title: "Dutch" },
  { code: "pl", title: "Polish" },
  { code: "sv", title: "Swedish" },
  { code: "da", title: "Danish" },
  { code: "no", title: "Norwegian" },
  { code: "fi", title: "Finnish" },
  { code: "ru", title: "Russian" },
  { code: "uk", title: "Ukrainian" },
  { code: "tr", title: "Turkish" },
  { code: "ar", title: "Arabic" },
  { code: "hi", title: "Hindi" },
  { code: "ja", title: "Japanese" },
  { code: "ko", title: "Korean" },
  { code: "zh", title: "Chinese" },
];

export const FORMAT_TITLES: Record<OutputFormat, string> = {
  txt: "Plain Text (.txt)",
  srt: "SubRip Subtitles (.srt)",
  vtt: "WebVTT Subtitles (.vtt)",
  json: "JSON with Segments (.json)",
  csv: "CSV (.csv)",
  md: "Markdown (.md)",
  html: "HTML (.html)",
  avid: "Avid DS Subtitles (.avid)",
};

/** Three-state toggle used by the forms: keep the app's setting, force on, force off. */
export type TriState = "default" | "on" | "off";

export function fromTriState(value: string): boolean | undefined {
  if (value === "on") return true;
  if (value === "off") return false;
  return undefined;
}

export function toTriState(value: boolean | undefined): TriState {
  if (value === true) return "on";
  if (value === false) return "off";
  return "default";
}

export function parsePositiveNumber(value: string | undefined): number | undefined {
  const parsed = Number(value?.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
