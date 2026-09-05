import ayahsData from "../data/ayahs.json";
import surahsData from "../data/surahs.json";
import { normalizeArabic } from "./normalize";
import type { Ayah, IndexedAyah } from "./types";

interface Surah {
  id: number;
  transliteration: string;
}

const transliterationById = new Map<number, string>(
  (surahsData as Surah[]).map((surah) => [surah.id, surah.transliteration]),
);

type RawAyah = Omit<Ayah, "surah_name_en">;

export const AYAHS: IndexedAyah[] = (ayahsData as RawAyah[]).map((ayah) => ({
  ...ayah,
  surah_name_en: transliterationById.get(ayah.surah_id) ?? "",
  normalized_text: normalizeArabic(ayah.text),
  normalized_surah_name: normalizeArabic(ayah.surah_name),
}));
