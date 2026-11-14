export const API_BASE_URL = "https://kbbi.raf555.dev/api/v1";
export const KBBI_WEBSITE_URL = "https://kbbi.kemendikdasmen.go.id";

export interface Label {
  code: string;
  name: string;
  kind: string;
}

export interface Definition {
  definition: string;
  referencedLemma: string;
  labels: Label[];
  usageExamples: string[];
}

export interface Entry {
  entry: string;
  baseWord: string;
  entryVariants: string[];
  pronunciation: string;
  definitions: Definition[];
  nonStandardWords: string[];
  variants: string[];
  compoundWords: string[];
  derivedWords: string[];
  proverbs: string[];
  metaphors: string[];
  isPrecategorical?: boolean;
}

export interface Lemma {
  lemma: string;
  entries: Entry[];
}

export interface SearchResponse {
  lemmas: string[];
}

export function searchUrl(query: string, limit = 50): string {
  const params = new URLSearchParams({ entry: query.trim(), limit: String(limit) });
  return `${API_BASE_URL}/entry/_search?${params.toString()}`;
}

export function lemmaUrl(lemma: string): string {
  return `${API_BASE_URL}/entry/${encodeURIComponent(lemma.trim())}`;
}

export function kbbiWebsiteUrl(lemma: string): string {
  return `${KBBI_WEBSITE_URL}/entri/${encodeURIComponent(lemma.trim())}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function parseSearchResponse(response: Response): Promise<string[]> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const body = (await response.json()) as SearchResponse;
  return body.lemmas ?? [];
}

/** Returns `null` when the word is not in the dictionary (HTTP 404). */
export async function parseLemmaResponse(response: Response): Promise<Lemma | null> {
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return (await response.json()) as Lemma;
}
