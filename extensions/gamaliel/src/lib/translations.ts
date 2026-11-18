/**
 * Bible translations offered in the Raycast picker.
 *
 * TODO: Fetch this catalog from the Gamaliel API when one exists. The web app
 * loads translations from GET /api/bibles; the public chat API
 * (developer.gamaliel.ai) does not yet expose an equivalent list. Until it
 * does, keep this table in sync with BIBLE_METADATA in
 * gamaliel-web/gamaliel/models/bible.py (skip internal IDs such as es-eng-web.tr).
 */

export const DEFAULT_BIBLE_ID = "eng-us-niv";

export interface BibleTranslation {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
}

export const BIBLE_TRANSLATIONS: BibleTranslation[] = [
  { id: "eng-us-niv", abbreviation: "NIV", name: "New International Version", language: "English" },
  { id: "eng-kjv", abbreviation: "KJV", name: "King James Version", language: "English" },
  { id: "eng-esv", abbreviation: "ESV", name: "English Standard Version", language: "English" },
  { id: "eng-web", abbreviation: "WEB", name: "World English Bible", language: "English" },
  { id: "spa-niv-2022", abbreviation: "NVI", name: "Nueva Versión Internacional", language: "Español" },
  { id: "por-niv-23", abbreviation: "NVI", name: "Nova Versão Internacional", language: "Português" },
  { id: "kor-niv-1985", abbreviation: "현대인", name: "Korean Living Bible (현대인의 성경)", language: "한국어" },
  {
    id: "arb-onav-2012",
    abbreviation: "الحياة",
    name: "كتاب الحياة مجانى (Ketab El Hayat Majani)",
    language: "العربية",
  },
  {
    id: "ukr-onpu-2022",
    abbreviation: "ВНПУ",
    name: "Відкритий Новий Переклад Українською 2022",
    language: "Українська",
  },
];

export function translationsByLanguage(): { language: string; translations: BibleTranslation[] }[] {
  const groups = new Map<string, BibleTranslation[]>();
  const order: string[] = [];

  for (const translation of BIBLE_TRANSLATIONS) {
    const existing = groups.get(translation.language);
    if (existing) {
      existing.push(translation);
      continue;
    }
    groups.set(translation.language, [translation]);
    order.push(translation.language);
  }

  return order.map((language) => ({ language, translations: groups.get(language) ?? [] }));
}

export function translationLabel(translation: BibleTranslation): string {
  return `${translation.abbreviation} — ${translation.name}`;
}

export function resolveBibleId(bibleId?: string): string {
  return findTranslation(bibleId)?.id ?? DEFAULT_BIBLE_ID;
}

export function findTranslation(bibleId?: string): BibleTranslation | undefined {
  return BIBLE_TRANSLATIONS.find((translation) => translation.id === bibleId);
}
