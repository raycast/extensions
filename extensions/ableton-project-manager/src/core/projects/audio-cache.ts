import { LocalStorage } from "@raycast/api";
import fs from "node:fs";
import type { AudioAnalysis } from "./audio-analysis";

export type AudioAnalysisCacheEntry = {
  signature: string;
  analysis: AudioAnalysis;
};

const AUDIO_ANALYSIS_CACHE_LIMIT = 300;
const AUDIO_ANALYSIS_STORAGE_KEY = "audio-analysis-cache-v1";
const AUDIO_ANALYZER_VERSION = 4;

const audioAnalysisCache = new Map<string, AudioAnalysisCacheEntry>();

let persistentCacheLoaded: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

export function audioFileSignature(stats: fs.Stats): string {
  return `${AUDIO_ANALYZER_VERSION}:${stats.mtimeMs}:${stats.size}`;
}

function evictOldest() {
  while (audioAnalysisCache.size > AUDIO_ANALYSIS_CACHE_LIMIT) {
    const oldestKey = audioAnalysisCache.keys().next().value;
    if (oldestKey === undefined) break;
    audioAnalysisCache.delete(oldestKey);
  }
}

export async function loadPersistentAudioAnalysisCache() {
  if (!persistentCacheLoaded) {
    persistentCacheLoaded = (async () => {
      try {
        const raw = await LocalStorage.getItem<string>(AUDIO_ANALYSIS_STORAGE_KEY);

        if (!raw) {
          return;
        }

        const entries = JSON.parse(raw) as Record<string, AudioAnalysisCacheEntry>;

        for (const [filePath, entry] of Object.entries(entries)) {
          if (
            typeof entry?.signature !== "string" ||
            typeof entry?.analysis?.duration !== "number" ||
            typeof entry?.analysis?.rms !== "number" ||
            typeof entry?.analysis?.peak !== "number" ||
            typeof entry?.analysis?.centroid !== "number" ||
            typeof entry?.analysis?.flux !== "number"
          ) {
            continue;
          }

          audioAnalysisCache.set(filePath, entry);
        }

        evictOldest();
      } catch (error) {
        console.error("[Ableton Project Manager] Failed to load audio analysis cache:", error);
      }
    })();
  }

  await persistentCacheLoaded;
}

function schedulePersistAudioAnalysisCache() {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    persistTimer = undefined;

    const snapshot = Object.fromEntries(audioAnalysisCache);

    void LocalStorage.setItem(AUDIO_ANALYSIS_STORAGE_KEY, JSON.stringify(snapshot)).catch((error) => {
      console.error("[Ableton Project Manager] Failed to persist audio analysis cache:", error);
    });
  }, 200);
}

export function cacheAudioAnalysis(filePath: string, signature: string, analysis: AudioAnalysis) {
  audioAnalysisCache.delete(filePath);
  audioAnalysisCache.set(filePath, { signature, analysis });

  evictOldest();
  schedulePersistAudioAnalysisCache();
}

export function getCachedAudioAnalysisEntry(filePath: string): AudioAnalysisCacheEntry | undefined {
  return audioAnalysisCache.get(filePath);
}
