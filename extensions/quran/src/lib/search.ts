import { AYAHS } from "./data";
import { isNumericQuery, isSurahAyahQuery, normalizeArabic, parseNumericString } from "./normalize";
import type { IndexedAyah } from "./types";

const DEFAULT_LIMIT = 50;

export function searchAyahs(query: string, limit = DEFAULT_LIMIT): IndexedAyah[] {
  const trimmed = query.trim();
  if (!trimmed) return AYAHS.slice(0, limit);

  // surah:ayah reference, e.g. "2:255" or "٢:٢٥٥"
  const surahAyahMatch = isSurahAyahQuery(trimmed);
  if (surahAyahMatch) {
    const surahId = parseNumericString(surahAyahMatch[1]);
    const ayahId = parseNumericString(surahAyahMatch[2]);
    const found = AYAHS.find((ayah) => ayah.surah_id === surahId && ayah.ayah_id === ayahId);
    return found ? [found] : [];
  }

  // plain ayah number, matched across all surahs
  if (isNumericQuery(trimmed)) {
    const ayahId = parseNumericString(trimmed);
    const results: IndexedAyah[] = [];
    for (const ayah of AYAHS) {
      if (results.length >= limit) break;
      if (ayah.ayah_id === ayahId) results.push(ayah);
    }
    return results;
  }

  // text: every normalized query token must appear in the normalized ayah text
  const terms = normalizeArabic(trimmed)
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length === 0) return AYAHS.slice(0, limit);

  const results: IndexedAyah[] = [];
  for (const ayah of AYAHS) {
    if (results.length >= limit) break;
    if (
      terms.every(
        (term) =>
          ayah.normalized_text.includes(term) ||
          ayah.normalized_surah_name.includes(term) ||
          ayah.surah_name_en.toLowerCase().includes(term),
      )
    )
      results.push(ayah);
  }
  return results;
}
