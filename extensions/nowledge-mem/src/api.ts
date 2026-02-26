import { getPreferenceValues } from "@raycast/api";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

function getBaseUrl(): string {
  const { serverUrl } = getPreferenceValues<Preferences>();
  return serverUrl || "http://127.0.0.1:14242";
}

/** Memory as returned by the search endpoint. */
export interface SearchMemory {
  id: string;
  title: string;
  content: string;
  importance: number;
  labels: string[];
  created_at: string;
  unit_type?: string;
}

/** Memory as returned by the list endpoint. */
export interface ListMemory {
  id: string;
  title: string;
  content: string;
  rating: number;
  time: string;
  label_ids: string[];
  is_favorite: boolean;
  confidence: number;
  source?: string;
}

export interface SearchResult {
  memory: SearchMemory;
  similarity_score: number;
  relevance_reason?: string;
}

export async function searchMemories(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  const url = `${getBaseUrl()}/memories/search`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit, mode: "fast" }),
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as SearchResult[];
}

export async function listMemories(limit = 20): Promise<ListMemory[]> {
  const url = `${getBaseUrl()}/memories?limit=${limit}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`List failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { memories: ListMemory[] };
  return data.memories;
}

export interface CreateMemoryRequest {
  content: string;
  title?: string;
  importance?: number;
  labels?: string[];
}

export async function createMemory(
  req: CreateMemoryRequest,
): Promise<SearchMemory> {
  const url = `${getBaseUrl()}/memories`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(`Create failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as SearchMemory;
}

export async function readWorkingMemory(): Promise<string> {
  const filePath = join(homedir(), "ai-now", "memory.md");
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}
