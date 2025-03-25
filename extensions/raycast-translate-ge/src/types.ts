export interface Translation {
  id: number;
  ka: string;
  en: string;
  ka_description: string;
  en_description: string;
  source_id: number;
  created_at: string;
  updated_at: string;
  source: unknown;
}

export type Locale = "en" | "ka";

export interface Word {
  id: number;
  word: string;
  translation: string;
  from: Locale;
  to: Locale;
}

export interface TranslateResponse {
  from: Locale;
  to: Locale;
  str: string;
  found: Translation[];
}
