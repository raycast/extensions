export interface Surah {
  id: number;
  name: string;
  name_en: string;
  name_translation: string;
  start_page: number;
  end_page: number;
  words: number;
  letters: number;
  type: string;
  type_en: string;
  ar: string;
  en: string;
  array: Array<SurahVerses>;
}

export interface SurahVerses {
  id: number;
  ar: string;
  en: string;
}
