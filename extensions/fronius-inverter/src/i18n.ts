// src/i18n.ts
import { getPreferenceValues } from "@raycast/api";
import enRaw from "./locales/en.json";
import deRaw from "./locales/de.json";
import frRaw from "./locales/fr.json";
import esRaw from "./locales/es.json";

interface Preferences {
  language: string;
}

const preferences = getPreferenceValues<Preferences>();
const lang = preferences.language?.toLowerCase() || "en";

const en = enRaw as Record<string, string>;
const de = deRaw as Record<string, string>;
const fr = frRaw as Record<string, string>;
const es = esRaw as Record<string, string>;

const translations: Record<string, Record<string, string>> = {
  en,
  de,
  fr,
  es,
};

const t = (key: string): string => {
  return translations[lang]?.[key] || en[key] || key;
};

export default t;
