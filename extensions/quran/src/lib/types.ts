export interface Ayah {
  surah_id: number;
  ayah_id: number;
  text: string;
  surah_name: string;
  surah_name_en: string;
  page: number;
}

export interface IndexedAyah extends Ayah {
  normalized_text: string;
  normalized_surah_name: string;
}
