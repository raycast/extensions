import { LocalStorage } from "@raycast/api";

export type TransferStatus = "success" | "failed" | "cancelled" | "in_progress";
export type TransferType = "send" | "receive";

export interface TransferRecord {
  id: string;
  type: TransferType;
  files: string[];
  phrase: string;
  timestamp: number;
  status: TransferStatus;
  size?: number;
  sessionId?: string;
}

const STORAGE_KEY = "croc-transfer-history";
const MAX_RECORDS = 100;

export async function loadHistory(): Promise<TransferRecord[]> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TransferRecord[];
  } catch {
    return [];
  }
}

export async function addRecord(
  record: Omit<TransferRecord, "id" | "timestamp">,
): Promise<TransferRecord> {
  const history = await loadHistory();
  const newRecord: TransferRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };

  const updated = [newRecord, ...history].slice(0, MAX_RECORDS);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newRecord;
}

export async function updateRecord(
  id: string,
  patch: Partial<TransferRecord>,
): Promise<void> {
  const history = await loadHistory();
  const updated = history.map((r) => (r.id === id ? { ...r, ...patch } : r));
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function deleteRecord(id: string): Promise<void> {
  const history = await loadHistory();
  const updated = history.filter((r) => r.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

/** Clean up stale in_progress records from previous sessions */
export async function cleanStaleInProgressRecords(
  currentSessionId: string,
): Promise<void> {
  const history = await loadHistory();
  const hasStale = history.some(
    (r) => r.status === "in_progress" && r.sessionId !== currentSessionId,
  );
  if (!hasStale) return;
  const updated = history.map((r) =>
    r.status === "in_progress" && r.sessionId !== currentSessionId
      ? { ...r, status: "failed" as TransferStatus }
      : r,
  );
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function formatFileNames(files: string[]): string {
  if (files.length === 0) return "Unknown";
  if (files.length === 1) return files[0].split("/").pop() ?? files[0];
  return `${files[0].split("/").pop()} +${files.length - 1} more`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes < 1024 * 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`;
}
