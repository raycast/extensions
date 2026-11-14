import { LocalStorage } from "@raycast/api";

export type JobKind = "image" | "edit" | "video" | "speech" | "transcription" | "background" | "upscale";

export interface HistoryRecord {
  requestId: string;
  kind: JobKind;
  model: string;
  /** The prompt, text or source the job was started from. */
  input: string;
  createdAt: string;
  status: "pending" | "done" | "error";
  resultUrl?: string;
  /** Transcribed text, for transcription jobs. */
  text?: string;
  /** Where the result was saved on this computer. */
  filePath?: string;
  error?: string;
  width?: number;
  height?: number;
}

/** Each record is stored under its own key, so writes to different records never touch each other. */
const RECORD_PREFIX = "job:";
/**
 * A deleted record leaves a short-lived marker. An update that was already in flight when the record was
 * deleted (for example a job finishing in another command) sees it and removes what it wrote, so a
 * deleted job never comes back.
 */
const DELETED_PREFIX = "deleted:";
const DELETED_MARKER_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RECORDS = 200;

export const KIND_TITLES: Record<JobKind, string> = {
  image: "Image",
  edit: "Edited Image",
  video: "Video",
  speech: "Speech",
  transcription: "Transcription",
  background: "Background Removed",
  upscale: "Upscaled Image",
};

export function isImageKind(kind: JobKind): boolean {
  return kind === "image" || kind === "edit" || kind === "background" || kind === "upscale";
}

function recordKey(requestId: string): string {
  return `${RECORD_PREFIX}${requestId}`;
}

function deletedKey(requestId: string): string {
  return `${DELETED_PREFIX}${requestId}`;
}

function parseRecord(serialized: string): HistoryRecord | undefined {
  try {
    const record = JSON.parse(serialized);
    return record && typeof record.requestId === "string" ? record : undefined;
  } catch {
    return undefined;
  }
}

/** Runs history changes made by this command one at a time, so read-modify-write updates can't interleave. */
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(change: () => Promise<T>): Promise<T> {
  const next = queue.then(change, change);
  queue = next.catch(() => undefined);
  return next;
}

/** All records, newest first. */
export async function getHistory(): Promise<HistoryRecord[]> {
  const items = await LocalStorage.allItems<Record<string, string>>();
  const records: HistoryRecord[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (key.startsWith(DELETED_PREFIX)) {
      if (Date.now() - Number(value) > DELETED_MARKER_TTL_MS) await LocalStorage.removeItem(key);
      continue;
    }
    if (!key.startsWith(RECORD_PREFIX)) continue;
    const record = parseRecord(value);
    if (record && !(deletedKey(record.requestId) in items)) records.push(record);
  }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addRecord(record: HistoryRecord) {
  return serialize(async () => {
    await LocalStorage.setItem(recordKey(record.requestId), JSON.stringify(record));
    const records = await getHistory();
    for (const old of records.slice(MAX_RECORDS)) {
      await LocalStorage.removeItem(recordKey(old.requestId));
    }
  });
}

export function updateRecord(requestId: string, changes: Partial<HistoryRecord>) {
  return serialize(async () => {
    const serialized = await LocalStorage.getItem<string>(recordKey(requestId));
    const record = serialized ? parseRecord(serialized) : undefined;
    if (!record) return;
    await LocalStorage.setItem(recordKey(requestId), JSON.stringify({ ...record, ...changes, requestId }));
    // The record may have been deleted while this update was running. If so, undo the write.
    if (await LocalStorage.getItem(deletedKey(requestId))) {
      await LocalStorage.removeItem(recordKey(requestId));
    }
  });
}

async function markDeleted(requestId: string) {
  await LocalStorage.setItem(deletedKey(requestId), String(Date.now()));
  await LocalStorage.removeItem(recordKey(requestId));
}

export function deleteRecord(requestId: string) {
  return serialize(() => markDeleted(requestId));
}

export function clearHistory() {
  return serialize(async () => {
    const items = await LocalStorage.allItems<Record<string, string>>();
    for (const key of Object.keys(items)) {
      if (key.startsWith(RECORD_PREFIX)) await markDeleted(key.slice(RECORD_PREFIX.length));
    }
  });
}
