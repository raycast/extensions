export interface UseQuranOptions<T> {
  apiFn: () => Promise<T>;
  cacheKey: string;
}

export interface Edition {
  edition: string;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
}

export interface FavoriteAyah {
  text: string;
  ayahNumber: number;
  surah: string;
  surahNumber: number;
}
