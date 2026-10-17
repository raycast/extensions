import { LocalStorage } from "@raycast/api";
import type { VoiceConfig } from "../api/types";

const VOICE_CACHE_KEY = "voice-list-cache-v1";
const FRESHNESS_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  voices: VoiceConfig[];
  fetchedAt: number;
  region: string;
  authMode: string;
}

export interface CachedVoices {
  voices: VoiceConfig[];
  fetchedAt: number;
  isFresh: boolean;
}

export async function readCachedVoices(region: string, authMode: string): Promise<CachedVoices | null> {
  const raw = await LocalStorage.getItem<string>(VOICE_CACHE_KEY);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.region !== region || entry.authMode !== authMode) return null;
    if (!Array.isArray(entry.voices) || entry.voices.length === 0) return null;
    const isFresh = Date.now() - entry.fetchedAt < FRESHNESS_MS;
    return { voices: entry.voices, fetchedAt: entry.fetchedAt, isFresh };
  } catch {
    return null;
  }
}

export async function writeCachedVoices(voices: VoiceConfig[], region: string, authMode: string): Promise<void> {
  const entry: CacheEntry = { voices, fetchedAt: Date.now(), region, authMode };
  await LocalStorage.setItem(VOICE_CACHE_KEY, JSON.stringify(entry));
}

export async function clearVoiceCache(): Promise<void> {
  await LocalStorage.removeItem(VOICE_CACHE_KEY);
}
