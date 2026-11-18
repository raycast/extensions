import { LocalStorage } from "@raycast/api";
import type { ScanResult } from "../types";

const CACHE_KEY = "scan-results";
const CACHE_TIMESTAMP_KEY = "scan-timestamp";

export async function getCachedResults(): Promise<ScanResult[] | null> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScanResult[];
  } catch {
    return null;
  }
}

export async function setCachedResults(results: ScanResult[]): Promise<void> {
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(results));
  await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
}

export async function getCacheAge(): Promise<string> {
  const ts = await LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY);
  if (!ts) return "never";
  const parsed = parseInt(ts, 10);
  if (Number.isNaN(parsed)) return "never";
  const minutes = Math.floor((Date.now() - parsed) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
