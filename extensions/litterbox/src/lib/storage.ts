import { LocalStorage } from "@raycast/api";
import type { ExpiryTime } from "./api";

const STORAGE_KEY = "litterbox-recent-uploads";

export interface StoredUpload {
  url: string;
  time: ExpiryTime;
  uploadedAt: number;
  filename: string;
}

const EXPIRY_MS: Record<ExpiryTime, number> = {
  "1h": 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "72h": 72 * 60 * 60 * 1000,
};

export function isUploadExpired(upload: StoredUpload): boolean {
  const expiryMs = EXPIRY_MS[upload.time];
  return Date.now() > upload.uploadedAt + expiryMs;
}

export function getExpiresAt(upload: StoredUpload): Date {
  const expiryMs = EXPIRY_MS[upload.time];
  return new Date(upload.uploadedAt + expiryMs);
}

export async function getRecentUploads(): Promise<StoredUpload[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredUpload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getNonExpiredUploads(): Promise<StoredUpload[]> {
  const all = await getRecentUploads();
  const valid = all.filter((u) => !isUploadExpired(u));
  if (valid.length !== all.length) {
    await saveRecentUploads(valid);
  }
  return valid.reverse();
}

export async function addRecentUpload(upload: StoredUpload): Promise<void> {
  const all = await getRecentUploads();
  const valid = all.filter((u) => !isUploadExpired(u));
  valid.push(upload);
  await saveRecentUploads(valid);
}

export async function removeRecentUpload(upload: StoredUpload): Promise<void> {
  const all = await getRecentUploads();
  const valid = all.filter((u) => !(u.url === upload.url && u.uploadedAt === upload.uploadedAt));
  await saveRecentUploads(valid);
}

export async function clearRecentUploads(): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}

async function saveRecentUploads(uploads: StoredUpload[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(uploads));
}
