/**
 * HistoryService.ts
 *
 * Persists recently-tested URLs together with the strategy used
 * and a timestamp. Storage key bumped to "url_history_v2" to avoid
 * deserialisation conflicts with the old plain string[] format.
 */

import { LocalStorage } from "@raycast/api";
import type { Strategy } from "../types";

export interface HistoryEntry {
  url: string;
  strategy: Strategy;
  /** Unix timestamp (ms) when this analysis ran. */
  timestamp: number;
}

export class HistoryService {
  private readonly MAX_HISTORY = 10;
  private readonly STORAGE_KEY = "url_history_v2";

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Saves url + strategy. Deduplicates by URL (moves to top) and
   * trims the list to MAX_HISTORY entries.
   */
  async save(url: string, strategy: Strategy): Promise<void> {
    const history = await this.getAll();
    const filtered = history.filter((e) => e.url !== url);
    const updated: HistoryEntry[] = [{ url, strategy, timestamp: Date.now() }, ...filtered].slice(0, this.MAX_HISTORY);
    await LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  /** Returns all entries, most-recent first. */
  async getAll(): Promise<HistoryEntry[]> {
    const raw = await LocalStorage.getItem<string>(this.STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
    } catch {
      return [];
    }
  }

  /** Removes a single entry by URL. No-op if not present. */
  async remove(url: string): Promise<void> {
    const history = await this.getAll();
    const updated = history.filter((e) => e.url !== url);
    await LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  /** Wipes the entire history. */
  async clear(): Promise<void> {
    await LocalStorage.removeItem(this.STORAGE_KEY);
  }
}
