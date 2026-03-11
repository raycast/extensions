import { getPreferenceValues } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface ConfigFile {
  apiUrl?: string;
  apiKey?: string;
}

export interface ConnectionConfig {
  baseUrl: string;
  apiKey?: string;
}

const DEFAULT_BASE_URL = "http://127.0.0.1:14242";
const CONFIG_PATH = join(homedir(), ".nowledge-mem", "config.json");

function normalizeUrl(url?: string): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/$/, "");
}

function readConfigFile(): ConfigFile {
  try {
    if (!existsSync(CONFIG_PATH)) return {};
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as ConfigFile;
    return {
      apiUrl: normalizeUrl(raw.apiUrl),
      apiKey: raw.apiKey?.trim() || undefined,
    };
  } catch {
    return {};
  }
}

export function getConnectionConfig(): ConnectionConfig {
  const { serverUrl, apiKey } = getPreferenceValues<Preferences>();
  const config = readConfigFile();

  return {
    baseUrl: normalizeUrl(serverUrl) || config.apiUrl || DEFAULT_BASE_URL,
    apiKey: apiKey?.trim() || config.apiKey,
  };
}

export function isLocalConnection(): boolean {
  const { baseUrl } = getConnectionConfig();
  try {
    const url = new URL(baseUrl);
    return ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  } catch {
    return (
      baseUrl.startsWith("http://127.0.0.1") ||
      baseUrl.startsWith("http://localhost")
    );
  }
}

function buildHeaders(initHeaders?: HeadersInit): Headers {
  const headers = new Headers(initHeaders);
  const { apiKey } = getConnectionConfig();

  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
    headers.set("X-NMEM-API-Key", apiKey);
  }

  return headers;
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string; message?: string };
    return data.detail || data.message || `${res.status} ${res.statusText}`;
  } catch {
    const text = await res.text();
    return text || `${res.status} ${res.statusText}`;
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const { baseUrl } = getConnectionConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: buildHeaders(init?.headers),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res;
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

export interface WorkingMemoryResponse {
  exists: boolean;
  content: string;
  date: string;
  file_path?: string;
  parsed?: Record<string, unknown> | null;
}

export async function searchMemories(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  const res = await apiFetch("/memories/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit, mode: "fast" }),
  });

  return (await res.json()) as SearchResult[];
}

export async function listMemories(limit = 20): Promise<ListMemory[]> {
  const res = await apiFetch(`/memories?limit=${limit}`);
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
  const res = await apiFetch("/memories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  return (await res.json()) as SearchMemory;
}

export async function readWorkingMemory(): Promise<WorkingMemoryResponse> {
  const res = await apiFetch("/agent/working-memory");
  return (await res.json()) as WorkingMemoryResponse;
}
