// Ported from the web app's `lib/api/schemas/names.ts` (Name entity).
// JSON-array fields (meanings, tags, nicknames, etc.) arrive as JSON strings
// and must be parsed before use.

export type Gender = "male" | "female" | "neutral";

export interface Name {
  id: number;
  uuid: string;
  name: string;
  gender: Gender;
  origin: string;
  meanings: string | null;
  currentRank: number | null;
  usBirthsRank: number | null;
  tags: string | null;
  alternativeSpellings: string | null;
  relatedNames: string | null;
  celebrityBabies: string | null;
  songs: string | null;
  nicknames: string | null;
  longDescription: string | null;
  hasWikipediaPage: boolean | number | null;
  ssaRank: number | null;
  ssaYear: number | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NamesResponse {
  names: Name[];
}

export interface NameDetailResponse {
  name: Name;
}

export interface CelebrityBaby {
  parent: string;
  child: string;
}

/**
 * Safely parse a JSON-array string field into a typed array.
 * Ported from `name-detail-client.tsx`.
 */
export function safeParseArray<T>(value: string | null | undefined, fallback: T[] = []): T[] {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return fallback;
  try {
    return JSON.parse(trimmed) as T[];
  } catch {
    return fallback;
  }
}

export const genderLabel: Record<Gender, string> = {
  male: "Boy",
  female: "Girl",
  neutral: "Neutral",
};
