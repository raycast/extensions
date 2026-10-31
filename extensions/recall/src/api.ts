import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://backend.getrecall.ai/api/v1";

export interface Card {
  id: string;
  title: string;
  created_at: string;
  image?: string;
  source_url?: string;
}

export interface Chunk {
  chunk_id: string;
  content: string;
  source?: string;
  timestamps?: string[];
}

export interface CardDetail {
  card_id: string;
  title: string;
  chunks: Chunk[];
  created_at: string;
  image?: string;
  source_url?: string;
}

export class RecallError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RecallError";
  }
}

async function request<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.append(key, value);
  }
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  } catch (e) {
    throw new RecallError(`Could not reach Recall: ${e instanceof Error ? e.message : String(e)}`, 0);
  }
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body: unknown = await res.json();
      const detail = (body as { detail?: { message?: unknown } })?.detail;
      if (detail && typeof detail.message === "string") message = detail.message;
    } catch {
      // non-JSON error body; keep the status text
    }
    if (res.status === 401) {
      message = "Invalid or expired API key. Check Settings → Extensions → Recall → API Key.";
    }
    throw new RecallError(message, res.status);
  }
  return (await res.json()) as T;
}

export interface CardFilters {
  dateFrom?: string;
  dateTo?: string;
  sourceUrlContains?: string;
}

export async function listCards(filters: CardFilters = {}): Promise<Card[]> {
  const data = await request<{ results: Card[]; total_count: number }>("/cards", {
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    // API accepts 1-500 chars; search text can be longer
    source_url_contains: filters.sourceUrlContains?.slice(0, 500),
  });
  return data.results;
}

export async function getCard(cardId: string, focusQuery?: string): Promise<CardDetail> {
  return request<CardDetail>(`/cards/${encodeURIComponent(cardId)}`, {
    focus_query: focusQuery?.slice(0, 1000),
  });
}
