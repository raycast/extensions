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

const HISTORY_KEY = "history";
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

export async function getHistory(): Promise<HistoryRecord[]> {
  const serialized = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!serialized) return [];
  try {
    const records = JSON.parse(serialized);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

async function saveHistory(records: HistoryRecord[]) {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
}

export async function addRecord(record: HistoryRecord) {
  const records = await getHistory();
  await saveHistory([record, ...records.filter((entry) => entry.requestId !== record.requestId)]);
}

export async function updateRecord(requestId: string, changes: Partial<HistoryRecord>) {
  const records = await getHistory();
  await saveHistory(records.map((record) => (record.requestId === requestId ? { ...record, ...changes } : record)));
}

export async function deleteRecord(requestId: string) {
  const records = await getHistory();
  await saveHistory(records.filter((record) => record.requestId !== requestId));
}

export async function clearHistory() {
  await LocalStorage.removeItem(HISTORY_KEY);
}
