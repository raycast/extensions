import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  serviceUrl?: string;
  serviceDirectory?: string;
}

export interface FileHit {
  path: string;
  name: string;
  snippet: string;
  tags: string[];
  score?: number;
  match?: "semantic" | "content" | "fuzzy" | "tag" | "year";
  createdAt?: number | null;
  modifiedAt?: number | null;
  year?: number;
}

export interface StatusResponse {
  ok: boolean;
  modelLoaded: boolean;
  model: string;
  modelId: string;
  fileCount: number;
  chunkCount: number;
  folders: string[];
  pending: number;
  scanning: boolean;
  configPath: string;
  lastError: string | null;
  tools?: { ripgrep: boolean; fzf: boolean };
}

export class ServiceDownError extends Error {
  constructor(message = "The indexer service is not running.") {
    super(message);
    this.name = "ServiceDownError";
  }
}

export function serviceUrl(): string {
  const prefs = getPreferenceValues<Preferences>();
  return (prefs.serviceUrl || "http://127.0.0.1:3921").replace(/\/$/, "");
}

export function serviceDirectory(): string | undefined {
  const directory = getPreferenceValues<Preferences>().serviceDirectory;
  return directory && directory.trim() ? directory : undefined;
}

export async function serviceFetch<T>(pathname: string, init: { method?: string; body?: unknown; timeoutMs: number }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs);
  try {
    const response = await fetch(`${serviceUrl()}${pathname}`, {
      method: init.method ?? "GET",
      headers: init.body ? { "content-type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ServiceDownError("The indexer did not respond in time.");
    }
    if (error instanceof TypeError) throw new ServiceDownError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchFiles(query: string): Promise<FileHit[]> {
  const payload = await serviceFetch<{ results: FileHit[] }>("/search", {
    method: "POST",
    body: { query, limit: 30 },
    timeoutMs: 180_000,
  });
  return payload.results.map((result) => ({ ...result, tags: result.tags ?? [] }));
}

export async function recentFiles(): Promise<FileHit[]> {
  const payload = await serviceFetch<{ files: FileHit[] }>("/recent", { timeoutMs: 2_000 });
  return payload.files.map((file) => ({ ...file, tags: file.tags ?? [] }));
}

export function getStatus(): Promise<StatusResponse> {
  return serviceFetch<StatusResponse>("/status", { timeoutMs: 2_000 });
}

export function reindex(): Promise<{ started: boolean }> {
  return serviceFetch("/reindex", { method: "POST", timeoutMs: 10_000 });
}

export function addFolder(folderPath: string): Promise<{ folders: string[] }> {
  return serviceFetch("/folders", { method: "POST", body: { path: folderPath }, timeoutMs: 15_000 });
}

export function removeFolder(folderPath: string): Promise<{ folders: string[] }> {
  return serviceFetch("/folders", { method: "DELETE", body: { path: folderPath }, timeoutMs: 15_000 });
}
