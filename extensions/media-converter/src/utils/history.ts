import { LocalStorage } from "@raycast/api";
import { AllOutputExtension, QualitySettings, TrimOptions, MediaType } from "../types/media";

const STORAGE_KEY = "conversion-history";
const MAX_ENTRIES = 200;
const SCHEMA_VERSION = 1;

export type HistoryEntry = {
  id: string;
  timestampMs: number;
  inputs: string[];
  outputs: string[];
  outputFormat: AllOutputExtension;
  quality: QualitySettings;
  mediaType: MediaType | "gif";
  trim?: TrimOptions;
  stripMetadata?: boolean;
  outputDir?: string;
  durationMs: number;
  inputBytes: number;
  outputBytes: number;
};

type StoredShape = {
  v: number;
  entries: HistoryEntry[];
};

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll(): Promise<StoredShape> {
  const raw = (await LocalStorage.getItem<string>(STORAGE_KEY)) ?? "";
  if (!raw) return { v: SCHEMA_VERSION, entries: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.entries)) {
      return { v: parsed.v ?? SCHEMA_VERSION, entries: parsed.entries };
    }
  } catch (err) {
    console.warn("Failed to parse conversion history, resetting:", err);
  }
  return { v: SCHEMA_VERSION, entries: [] };
}

async function writeAll(data: StoredShape): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function appendHistory(entry: Omit<HistoryEntry, "id" | "timestampMs">): Promise<HistoryEntry> {
  const full: HistoryEntry = { id: newId(), timestampMs: Date.now(), ...entry };
  const data = await readAll();
  data.entries.unshift(full);
  if (data.entries.length > MAX_ENTRIES) data.entries.length = MAX_ENTRIES;
  await writeAll(data);
  return full;
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const data = await readAll();
  return data.entries;
}

export async function removeHistory(id: string): Promise<void> {
  const data = await readAll();
  data.entries = data.entries.filter((e) => e.id !== id);
  await writeAll(data);
}

export async function clearHistory(): Promise<void> {
  await writeAll({ v: SCHEMA_VERSION, entries: [] });
}

export async function getHistoryEntry(id: string): Promise<HistoryEntry | null> {
  const data = await readAll();
  return data.entries.find((e) => e.id === id) ?? null;
}
