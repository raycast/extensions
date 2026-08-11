const API_BASE_URL = "https://rae-api.com";

// A related word (synonym/antonym), optionally annotated with a label such as "desus."
export interface RelatedWord {
  word: string;
  label?: string;
}

// Geographic region where a sense applies (code is ISO 3166-1 alpha-2 when the region is a country)
export interface Region {
  code?: string;
  name: string;
}

// Definition of a word (senses)
export interface Definition {
  raw: string;
  meaning_number: number;
  category: string;
  verb_category?: string;
  gender?: string;
  article?: Article;
  usage: string;
  usage_notes?: string[];
  description: string;
  examples?: string[];
  fields?: string[];
  regions?: Region[];
  cross_references?: string[];
  synonyms: string[] | null;
  antonyms: string[] | null;
  synonyms_v2?: RelatedWord[];
  antonyms_v2?: RelatedWord[];
}

// Fixed expression or idiom attached to a word (e.g. "echar la casa por la ventana")
export interface Locution {
  expression: string;
  senses: Definition[];
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
  homonym_index?: number;
  origin?: Origin;
  senses: Definition[];
  locutions?: Locution[];
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
  retry_after?: number;
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

const MAX_RATE_LIMIT_RETRIES = 2;
const DEFAULT_RETRY_AFTER_SECONDS = 2;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry-After can be either a number of seconds or an HTTP date (RFC 9110)
function parseRetryAfterSeconds(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number(headerValue);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds);
  const dateMs = Date.parse(headerValue);
  if (Number.isNaN(dateMs)) return undefined;
  return Math.max(0, (dateMs - Date.now()) / 1000);
}

// Helper function to make API requests and handle errors.
// The anonymous API is rate limited; 429 responses (or rate-limit error
// bodies) carry a retry_after hint that we honor before retrying.
async function makeApiRequest<T>(url: string, attempt = 0): Promise<T> {
  const response = await fetch(url);

  if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
    const retryAfter = parseRetryAfterSeconds(response.headers.get("retry-after")) ?? DEFAULT_RETRY_AFTER_SECONDS;
    await delay(retryAfter * 1000);
    return makeApiRequest(url, attempt + 1);
  }

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
    if (res.error === "RATE_LIMIT_EXCEEDED" && attempt < MAX_RATE_LIMIT_RETRIES) {
      await delay((res.retry_after || DEFAULT_RETRY_AFTER_SECONDS) * 1000);
      return makeApiRequest(url, attempt + 1);
    }
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
