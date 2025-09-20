import fetch from "node-fetch";

const API_BASE_URL = "https://rae-api.com";

// Definition of a word (senses)
export interface Definition {
  raw: string;
  meaning_number: number;
  category: string;
  verb_category?: string;
  gender?: string;
  article?: Article;
  usage: string;
  description: string;
  synonyms: string[];
  antonyms: string[];
}

export interface Article {
  category: string;
  gender: string;
}

export interface Origin {
  raw: string;
  type: string;
  voice: string;
  text: string;
}

export interface Conjugation {
  singular_first_person: string;
  singular_second_person: string;
  singular_formal_second_person: string;
  singular_third_person: string;
  plural_first_person: string;
  plural_second_person: string;
  plural_formal_second_person: string;
  plural_third_person: string;
}

export interface ConjugationNonPersonal {
  infinitive: string;
  participle: string;
  gerund: string;
  compound_infinitive: string;
  compound_gerund: string;
}

export interface ConjugationIndicative {
  present: Conjugation;
  present_perfect: Conjugation;
  imperfect: Conjugation;
  past_perfect: Conjugation;
  preterite: Conjugation;
  past_anterior: Conjugation;
  future: Conjugation;
  future_perfect: Conjugation;
  conditional: Conjugation;
  conditional_perfect: Conjugation;
}

export interface ConjugationSubjunctive {
  present: Conjugation;
  present_perfect: Conjugation;
  imperfect: Conjugation;
  past_perfect: Conjugation;
  future: Conjugation;
  future_perfect: Conjugation;
}

export interface ConjugationImperative {
  singular_second_person: string;
  singular_formal_second_person: string;
  plural_second_person: string;
  plural_formal_second_person: string;
}

export interface Conjugations {
  non_personal: ConjugationNonPersonal;
  indicative: ConjugationIndicative;
  subjunctive: ConjugationSubjunctive;
  imperative: ConjugationImperative;
}

export interface Meaning {
  origin?: Origin;
  senses: Definition[];
  conjugations?: Conjugations;
}

export interface WordEntry {
  word: string;
  meanings: Meaning[];
  suggestions: string[];
}

export interface Word {
  word: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data: T;
  error?: string;
  suggestions: string[];
}

export type WordOnlyResponse = ApiResponse<Word>;
export type WordEntryResponse = ApiResponse<WordEntry>;

export class ApiError extends Error {
  suggestions: string[];
  constructor(message: string, suggestions: string[]) {
    super(message);
    this.suggestions = suggestions;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Helper function to make API requests and handle errors
async function makeApiRequest<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    try {
      const errorData = (await response.json()) as ApiResponse<T>;
      if (errorData.error === "NOT_FOUND") {
        throw new ApiError("Word not found", errorData.suggestions);
      }
    } catch (parseError) {
      if (parseError instanceof ApiError) {
        throw parseError;
      }
    }
    throw new Error(`Request error: ${response.statusText}`);
  }

  const res = (await response.json()) as ApiResponse<T>;

  if (!res.ok) {
    const errorMsg = res.error === "NOT_FOUND" ? "Word not found" : res.error;
    throw new ApiError(`API response error: ${errorMsg}`, res.suggestions);
  }

  return res.data;
}

export const searchWord = async (word: string): Promise<WordEntry> => {
  return makeApiRequest<WordEntry>(`${API_BASE_URL}/api/words/${encodeURIComponent(word)}`);
};

export const getDailyWord = async (): Promise<WordEntry> => {
  const res = await makeApiRequest<Word>(`${API_BASE_URL}/api/daily`);
  return searchWord(res.word);
};

export const getRandomWord = async (minLength?: number, maxLength?: number): Promise<WordEntry> => {
  let url = `${API_BASE_URL}/api/random`;
  const params = new URLSearchParams();

  if (minLength) params.append("min_length", minLength.toString());
  if (maxLength) params.append("max_length", maxLength.toString());

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const res = await makeApiRequest<Word>(url);
  return searchWord(res.word);
};
