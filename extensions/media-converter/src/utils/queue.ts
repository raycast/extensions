import { LocalStorage } from "@raycast/api";
import {
  getMediaType,
  type AllOutputExtension,
  type MediaType,
  type QualitySettings,
  type TrimOptions,
} from "../types/media";
import { isQualitySettings, isRecord, parseOutputFormat, parseTrim } from "./storageValidation";

const STORAGE_KEY = "conversion-queue";
const SCHEMA_VERSION = 1;

export type QueueStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "interrupted";

export type QueueJob = {
  id: string;
  createdAt: number;
  updatedAt: number;
  input: string;
  outputFormat: AllOutputExtension;
  quality: QualitySettings;
  mediaType: MediaType;
  outputDir?: string;
  stripMetadata?: boolean;
  trim?: TrimOptions;
  targetSizeMb?: number;
  status: QueueStatus;
  progress: number;
  output?: string;
  error?: string;
};

type QueueStore = { v: number; jobs: QueueJob[] };

export async function listQueueJobs(): Promise<QueueJob[]> {
  const store = await readStore();
  return store.jobs;
}

export async function recoverInterruptedQueueJobs(): Promise<QueueJob[]> {
  const store = await readStore();
  let changed = false;
  for (const job of store.jobs) {
    if (job.status === "running") {
      job.status = "interrupted";
      job.error = "Raycast stopped while this job was running. Retry to start it again.";
      job.updatedAt = Date.now();
      changed = true;
    }
  }
  if (changed) await writeStore(store);
  return store.jobs;
}

export async function enqueueConversionJobs(
  inputs: string[],
  settings: {
    outputFormat: AllOutputExtension;
    quality: QualitySettings;
    outputDir?: string;
    stripMetadata?: boolean;
    trim?: TrimOptions;
    targetSizeMb?: number;
  },
): Promise<QueueJob[]> {
  const now = Date.now();
  const created = inputs.map((input, index): QueueJob => {
    const mediaType = getMediaType(input.slice(input.lastIndexOf(".")));
    if (!mediaType) throw new Error(`Unsupported input file: ${input}`);
    return {
      id: `queue-${now.toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
      input,
      outputFormat: settings.outputFormat,
      quality: settings.quality,
      mediaType,
      outputDir: settings.outputDir,
      stripMetadata: settings.stripMetadata,
      trim: settings.trim,
      targetSizeMb: settings.targetSizeMb,
      status: "pending",
      progress: 0,
    };
  });
  const store = await readStore();
  store.jobs.push(...created);
  await writeStore(store);
  return created;
}

export async function patchQueueJob(id: string, patch: Partial<QueueJob>): Promise<QueueJob | null> {
  const store = await readStore();
  const index = store.jobs.findIndex((job) => job.id === id);
  if (index < 0) return null;
  store.jobs[index] = { ...store.jobs[index], ...patch, id, updatedAt: Date.now() };
  await writeStore(store);
  return store.jobs[index];
}

export async function removeQueueJob(id: string): Promise<void> {
  const store = await readStore();
  store.jobs = store.jobs.filter((job) => job.id !== id);
  await writeStore(store);
}

export async function clearFinishedQueueJobs(): Promise<void> {
  const store = await readStore();
  store.jobs = store.jobs.filter((job) => job.status === "pending" || job.status === "running");
  await writeStore(store);
}

export async function moveQueueJob(id: string, direction: -1 | 1): Promise<void> {
  const store = await readStore();
  const index = store.jobs.findIndex((job) => job.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= store.jobs.length) return;
  if (store.jobs[index].status === "running" || store.jobs[next].status === "running") return;
  [store.jobs[index], store.jobs[next]] = [store.jobs[next], store.jobs[index]];
  await writeStore(store);
}

async function readStore(): Promise<QueueStore> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return { v: SCHEMA_VERSION, jobs: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.v !== SCHEMA_VERSION || !Array.isArray(parsed.jobs)) {
      return { v: SCHEMA_VERSION, jobs: [] };
    }
    return {
      v: SCHEMA_VERSION,
      jobs: parsed.jobs.map(normaliseQueueJob).filter((job): job is QueueJob => job !== null),
    };
  } catch {
    return { v: SCHEMA_VERSION, jobs: [] };
  }
}

function normaliseQueueJob(value: unknown): QueueJob | null {
  if (!isRecord(value)) return null;
  const outputFormat = parseOutputFormat(value.outputFormat);
  const trim = parseTrim(value.trim);
  const statuses: QueueStatus[] = ["pending", "running", "completed", "failed", "cancelled", "interrupted"];
  if (
    !outputFormat ||
    trim === null ||
    !isQualitySettings(outputFormat, value.quality) ||
    typeof value.id !== "string" ||
    typeof value.input !== "string" ||
    typeof value.createdAt !== "number" ||
    typeof value.updatedAt !== "number" ||
    typeof value.progress !== "number" ||
    typeof value.status !== "string" ||
    !statuses.includes(value.status as QueueStatus)
  ) {
    return null;
  }
  const mediaType = getMediaType(value.input.slice(value.input.lastIndexOf(".")));
  if (!mediaType) return null;
  return {
    id: value.id,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    input: value.input,
    outputFormat,
    quality: value.quality,
    mediaType,
    outputDir: typeof value.outputDir === "string" ? value.outputDir : undefined,
    stripMetadata: typeof value.stripMetadata === "boolean" ? value.stripMetadata : undefined,
    trim,
    targetSizeMb: typeof value.targetSizeMb === "number" && value.targetSizeMb > 0 ? value.targetSizeMb : undefined,
    status: value.status as QueueStatus,
    progress: Math.max(0, Math.min(100, value.progress)),
    output: typeof value.output === "string" ? value.output : undefined,
    error: typeof value.error === "string" ? value.error : undefined,
  };
}

async function writeStore(store: QueueStore): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
