import { LocalStorage } from "@raycast/api";
import type { UploadRecord } from "./types";

const STORAGE_KEY = "uploads";
const MAX_ENTRIES = 200;

export async function getUploads(): Promise<UploadRecord[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as UploadRecord[];
  } catch {
    return [];
  }
}

export async function addUpload(record: UploadRecord): Promise<void> {
  const uploads = await getUploads();
  const updated = [record, ...uploads].slice(0, MAX_ENTRIES);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function removeUpload(id: string): Promise<void> {
  const uploads = await getUploads();
  const updated = uploads.filter((upload) => upload.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function updateUpload(id: string, patch: Partial<UploadRecord>): Promise<UploadRecord[]> {
  const uploads = await getUploads();
  const updated = uploads.map((upload) => (upload.id === id ? { ...upload, ...patch } : upload));
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
