/**
 * ReportService.ts
 *
 * Persists a rolling window of ReportSnapshot objects in LocalStorage.
 * After every successful analysis the caller saves a new snapshot;
 * before displaying results it fetches the previous snapshot for the
 * same URL + strategy to compute ▲/▼ score trend deltas.
 */

import { LocalStorage } from "@raycast/api";
import type { ReportSnapshot } from "../models/Metrics";
import type { Strategy } from "../types";

/** Signed score difference between the current and previous run. */
export interface ScoreDelta {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export class ReportService {
  private readonly MAX_SNAPSHOTS = 50;
  private readonly STORAGE_KEY = "report_snapshots_v1";

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Saves a snapshot, keeping at most one per URL + strategy.
   * Evicts the oldest entry when MAX_SNAPSHOTS is reached.
   */
  async save(snapshot: ReportSnapshot): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter(
      (s) => !(s.url === snapshot.url && s.strategy === snapshot.strategy),
    );
    const updated = [snapshot, ...filtered].slice(0, this.MAX_SNAPSHOTS);
    await LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  /**
   * Returns the most-recently saved snapshot for the given
   * URL + strategy, or null if no previous run exists.
   */
  async getLast(
    url: string,
    strategy: Strategy,
  ): Promise<ReportSnapshot | null> {
    const all = await this.getAll();
    return all.find((s) => s.url === url && s.strategy === strategy) ?? null;
  }

  /** Returns all stored snapshots, newest first. */
  async getAll(): Promise<ReportSnapshot[]> {
    const raw = await LocalStorage.getItem<string>(this.STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ReportSnapshot[]) : [];
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    await LocalStorage.removeItem(this.STORAGE_KEY);
  }

  // ── Static helpers ──────────────────────────────────────────────

  /**
   * Computes the signed delta between current and previous scores.
   * Positive = improved, negative = regressed.
   */
  static computeDelta(
    current: ReportSnapshot,
    previous: ReportSnapshot,
  ): ScoreDelta {
    return {
      performance: current.scores.performance - previous.scores.performance,
      accessibility:
        current.scores.accessibility - previous.scores.accessibility,
      bestPractices:
        current.scores.bestPractices - previous.scores.bestPractices,
      seo: current.scores.seo - previous.scores.seo,
    };
  }
}
