import { LocalStorage } from "@raycast/api";
import { AllOutputExtension, QualitySettings, TrimOptions, MediaType } from "../types/media";
import {
  isFiniteNumber,
  isQualitySettings,
  isRecord,
  isStringArray,
  parseMediaType,
  parseOutputFormat,
  parseTrim,
} from "./storageValidation";

const STORAGE_KEY = "conversion-history";
const MAX_ENTRIES = 200;
const SCHEMA_VERSION = 2;

export type HistoryEntry = {
  id: string;
  timestampMs: number;
  inputs: string[];
  outputs: string[];
  outputFormat: AllOutputExtension;
  operation: "convert" | "merge" | "edit";
  quality?: QualitySettings;
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
    if (
      isRecord(parsed) &&
      (parsed.v === undefined || parsed.v === 1 || parsed.v === SCHEMA_VERSION) &&
      Array.isArray(parsed.entries)
    ) {
      const entries = parsed.entries
        .map(normaliseHistoryEntry)
        .filter((entry): entry is HistoryEntry => entry !== null);
      return { v: SCHEMA_VERSION, entries };
    }
  } catch (err) {
    console.warn("Failed to parse conversion history, resetting:", err);
  }
  return { v: SCHEMA_VERSION, entries: [] };
}

function normaliseHistoryEntry(value: unknown): HistoryEntry | null {
  if (!isRecord(value)) return null;
  const outputFormat = parseOutputFormat(value.outputFormat);
  const mediaType = parseMediaType(value.mediaType);
  const trim = parseTrim(value.trim);
  const operation =
    value.operation === "merge" || value.operation === "edit"
      ? value.operation
      : value.operation === "convert" || value.operation === undefined
        ? "convert"
        : null;
  if (
    !operation ||
    !outputFormat ||
    !mediaType ||
    trim === null ||
    typeof value.id !== "string" ||
    !isFiniteNumber(value.timestampMs) ||
    !isStringArray(value.inputs) ||
    !isStringArray(value.outputs) ||
    !isFiniteNumber(value.durationMs) ||
    !isFiniteNumber(value.inputBytes) ||
    !isFiniteNumber(value.outputBytes)
  ) {
    return null;
  }
  let quality: QualitySettings | undefined;
  if (operation === "convert") {
    if (!isQualitySettings(outputFormat, value.quality)) return null;
    quality = value.quality;
  }
  if (value.outputDir !== undefined && typeof value.outputDir !== "string") return null;
  if (value.stripMetadata !== undefined && typeof value.stripMetadata !== "boolean") return null;
  return {
    id: value.id,
    timestampMs: value.timestampMs,
    inputs: value.inputs,
    outputs: value.outputs,
    outputFormat,
    quality,
    operation,
    mediaType,
    trim,
    stripMetadata: value.stripMetadata,
    outputDir: value.outputDir,
    durationMs: value.durationMs,
    inputBytes: value.inputBytes,
    outputBytes: value.outputBytes,
  };
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
