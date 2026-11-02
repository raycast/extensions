import { createHash } from "node:crypto";
import { fetchLeaderboard, LeaderboardError, type FetchResult } from "./api";
import { finiteMetric, isRecord, type LeaderboardSnapshot } from "./models";

export const CACHE_TTL_MS = 60 * 60 * 1000;

export interface CacheStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

interface ServiceOptions {
  now?: () => number;
  loader?: (signal?: AbortSignal) => Promise<FetchResult>;
}

export function credentialCacheKey(apiKey: string, schemaVersion = 2): string {
  return `v${schemaVersion}:${createHash("sha256").update(apiKey.trim()).digest("hex")}`;
}

export function isFresh(snapshot: LeaderboardSnapshot, now: number): boolean {
  const age = now - snapshot.fetchedAt;
  return age >= 0 && age < CACHE_TTL_MS;
}

function isSnapshot(value: unknown): value is LeaderboardSnapshot {
  if (
    !isRecord(value) ||
    typeof value.fetchedAt !== "number" ||
    !Number.isFinite(value.fetchedAt) ||
    value.fetchedAt < 0 ||
    typeof value.indexVersion !== "number" ||
    !Number.isFinite(value.indexVersion) ||
    value.indexVersion <= 0 ||
    !Array.isArray(value.models)
  ) {
    return false;
  }
  const ids = new Set<string>();
  return value.models.every((model: unknown) => {
    if (!isRecord(model)) return false;
    if (
      !["id", "name", "slug", "creator", "creatorId"].every(
        (field) => typeof model[field] === "string" && model[field].trim(),
      )
    ) {
      return false;
    }
    const id = model.id as string;
    if (ids.has(id)) return false;
    ids.add(id);
    return ["intelligence", "coding", "inputPrice", "outputPrice", "speed", "latency"].every(
      (field) => model[field] === null || finiteMetric(model[field]) !== null,
    );
  });
}

export class LeaderboardService {
  private readonly snapshotKey: string;
  private readonly cooldownKey: string;
  private readonly now: () => number;
  private readonly loader: (signal?: AbortSignal) => Promise<FetchResult>;
  private pending?: Promise<LeaderboardSnapshot>;
  private pendingSignal?: AbortSignal;

  constructor(
    apiKey: string,
    private readonly cache: CacheStore,
    options: ServiceOptions = {},
  ) {
    this.snapshotKey = credentialCacheKey(apiKey);
    // Quota metadata stays compatible when the model snapshot schema changes.
    this.cooldownKey = `${credentialCacheKey(apiKey, 1)}:retry-at`;
    this.now = options.now ?? Date.now;
    this.loader = options.loader ?? ((signal) => fetchLeaderboard(apiKey, { signal, now: this.now }));
  }

  readSnapshot(): LeaderboardSnapshot | undefined {
    try {
      const raw = this.cache.get(this.snapshotKey);
      if (!raw) return undefined;
      const value: unknown = JSON.parse(raw);
      return isSnapshot(value) ? value : undefined;
    } catch {
      return undefined;
    }
  }

  getRetryAt(): number | undefined {
    const raw = this.cache.get(this.cooldownKey);
    if (!raw) return undefined;
    const time = Number(raw);
    return Number.isFinite(time) && time > this.now() ? time : undefined;
  }

  refresh(force = false, signal?: AbortSignal): Promise<LeaderboardSnapshot> {
    if (this.pending && !this.pendingSignal?.aborted) return this.pending;
    const cached = this.readSnapshot();
    if (!force && cached && isFresh(cached, this.now())) return Promise.resolve(cached);
    const retryAt = this.getRetryAt();
    if (retryAt !== undefined) {
      return Promise.reject(
        new LeaderboardError(
          "rate-limit",
          "Refresh is paused until Artificial Analysis's request limit resets.",
          retryAt,
        ),
      );
    }
    const pending = this.update(signal).finally(() => {
      if (this.pending === pending) {
        this.pending = undefined;
        this.pendingSignal = undefined;
      }
    });
    this.pending = pending;
    this.pendingSignal = signal;
    return pending;
  }

  private async update(signal?: AbortSignal): Promise<LeaderboardSnapshot> {
    try {
      const result = await this.loader(signal);
      signal?.throwIfAborted();
      this.cache.set(this.snapshotKey, JSON.stringify(result.snapshot));
      if (result.retryAt !== undefined) this.cache.set(this.cooldownKey, String(result.retryAt));
      else this.cache.remove(this.cooldownKey);
      return result.snapshot;
    } catch (error) {
      if (error instanceof LeaderboardError && error.retryAt !== undefined) {
        this.cache.set(this.cooldownKey, String(error.retryAt));
      }
      throw error;
    }
  }
}
