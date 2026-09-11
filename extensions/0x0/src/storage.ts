import { LocalStorage, getPreferenceValues } from "@raycast/api";

const HISTORY_KEY = "upload-history";
const DEFAULT_INSTANCE_URL = "https://0x0.st";

export const USER_AGENT = "0x0-raycast/1.0";

export interface UploadHistoryItem {
  /** The uploaded file URL, also used as the unique id. */
  url: string;
  fileName: string;
  /** Management token from the `X-Token` response header, used to delete the file. */
  token?: string;
  uploadedAt: number;
  /** Epoch ms when the file expires, from the `X-Expires` header, if provided. */
  expiresAt?: number;
  instanceUrl: string;
}

export function getInstanceUrl(): string {
  const { instanceUrl } = getPreferenceValues<Preferences>();
  const trimmed = instanceUrl?.trim();
  if (!trimmed) {
    return DEFAULT_INSTANCE_URL;
  }
  return trimmed.replace(/\/+$/, "");
}

function isExpired(item: UploadHistoryItem): boolean {
  return typeof item.expiresAt === "number" && item.expiresAt <= Date.now();
}

async function writeHistory(items: UploadHistoryItem[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

/**
 * Returns the upload history sorted newest first. Expired entries are
 * auto-cleared and persisted back before returning.
 */
export async function getHistory(): Promise<UploadHistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) {
    return [];
  }

  let items: UploadHistoryItem[];
  try {
    items = JSON.parse(raw) as UploadHistoryItem[];
  } catch {
    return [];
  }

  const active = items.filter((item) => !isExpired(item));
  if (active.length !== items.length) {
    await writeHistory(active);
  }

  return active.sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export async function addHistoryItem(item: UploadHistoryItem): Promise<void> {
  const items = await getHistory();
  const deduped = items.filter((existing) => existing.url !== item.url);
  deduped.unshift(item);
  await writeHistory(deduped);
}

export async function removeHistoryItem(url: string): Promise<void> {
  const items = await getHistory();
  await writeHistory(items.filter((item) => item.url !== url));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

/**
 * Deletes the remote file on the 0x0 instance using its management token.
 * Throws if the request fails or no token is stored.
 */
export async function deleteRemoteFile(item: UploadHistoryItem): Promise<void> {
  if (!item.token) {
    throw new Error("No management token stored for this file");
  }

  const formData = new FormData();
  formData.append("token", item.token);
  formData.append("delete", "");

  const response = await fetch(item.url, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}${errorText ? ` - ${errorText.trim()}` : ""}`);
  }
}
