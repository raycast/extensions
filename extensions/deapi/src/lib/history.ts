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

/** Each record is stored under its own key, so overlapping writes never drop each other's changes. */
const RECORD_PREFIX = "job:";
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

function parseRecord(serialized: string): HistoryRecord | undefined {
  try {
    const record = JSON.parse(serialized);
    return record && typeof record.requestId === "string" ? record : undefined;
  } catch {
    return undefined;
  }
}

/** All records, newest first. */
export async function getHistory(): Promise<HistoryRecord[]> {
  const items = await LocalStorage.allItems<Record<string, string>>();
  const records: HistoryRecord[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(RECORD_PREFIX)) continue;
    const record = parseRecord(value);
    if (record) records.push(record);
  }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addRecord(record: HistoryRecord) {
  await LocalStorage.setItem(recordKey(record.requestId), JSON.stringify(record));
  const records = await getHistory();
  for (const old of records.slice(MAX_RECORDS)) {
    await LocalStorage.removeItem(recordKey(old.requestId));
  }
}

export async function updateRecord(requestId: string, changes: Partial<HistoryRecord>) {
  const serialized = await LocalStorage.getItem<string>(recordKey(requestId));
  const record = serialized ? parseRecord(serialized) : undefined;
  if (!record) return;
  await LocalStorage.setItem(recordKey(requestId), JSON.stringify({ ...record, ...changes, requestId }));
}

export async function deleteRecord(requestId: string) {
  await LocalStorage.removeItem(recordKey(requestId));
}

export async function clearHistory() {
  const items = await LocalStorage.allItems<Record<string, string>>();
  for (const key of Object.keys(items)) {
    if (key.startsWith(RECORD_PREFIX)) await LocalStorage.removeItem(key);
  }
}
