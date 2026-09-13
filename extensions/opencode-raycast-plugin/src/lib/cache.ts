import type { Payload, PricingCatalog, PricingModel } from "./types";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CachePolicy {
  pricingTtlMs: number;
  picksTtlMs: number;
  usageTtlMs: number;
}

export const DEFAULT_POLICY: CachePolicy = {
  pricingTtlMs: 24 * 60 * 60 * 1000,
  picksTtlMs: 24 * 60 * 60 * 1000,
  usageTtlMs: 60_000,
};

const KEYS = {
  lastPayload: "ocg.lastPayload.v2",
  pricing: "ocg.pricing.v2",
  picksComputedAt: "ocg.picksComputedAt",
} as const;

interface PricingEntry {
  go: PricingModel[];
  zen: PricingModel[];
  fetchedAt: string;
}

function readJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isCatalog(v: unknown): v is { go: unknown[]; zen: unknown[] } {
  return (
    typeof v === "object" &&
    v !== null &&
    Array.isArray((v as { go?: unknown }).go) &&
    Array.isArray((v as { zen?: unknown }).zen)
  );
}

function isPricingEntry(v: unknown): v is PricingEntry {
  return (
    typeof v === "object" &&
    v !== null &&
    Array.isArray((v as { go?: unknown }).go) &&
    Array.isArray((v as { zen?: unknown }).zen) &&
    typeof (v as { fetchedAt?: unknown }).fetchedAt === "string"
  );
}

export class UsageCache {
  constructor(
    private readonly storage: StorageLike,
    private readonly policy: CachePolicy = DEFAULT_POLICY,
  ) {}

  readLastPayload(): Payload | null {
    const v = readJson<unknown>(this.storage.getItem(KEYS.lastPayload));
    if (!isCatalog((v as { models?: unknown } | null)?.models)) return null;
    return v as Payload;
  }

  writeLastPayload(payload: Payload): void {
    this.storage.setItem(KEYS.lastPayload, JSON.stringify(payload));
  }

  readPricing(): PricingEntry | null {
    const v = readJson<unknown>(this.storage.getItem(KEYS.pricing));
    return isPricingEntry(v) ? v : null;
  }

  writePricing(pricing: PricingCatalog, fetchedAt: string): void {
    this.storage.setItem(
      KEYS.pricing,
      JSON.stringify({ ...pricing, fetchedAt }),
    );
  }

  isPricingStale(now: Date): boolean {
    const entry = this.readPricing();
    if (!entry) return true;
    return (
      now.getTime() - new Date(entry.fetchedAt).getTime() >
      this.policy.pricingTtlMs
    );
  }

  setPicksComputedAt(iso: string): void {
    this.storage.setItem(KEYS.picksComputedAt, iso);
  }

  isPicksStale(now: Date): boolean {
    const at = this.storage.getItem(KEYS.picksComputedAt);
    if (!at) return true;
    return now.getTime() - new Date(at).getTime() > this.policy.picksTtlMs;
  }

  isUsageStale(payload: Payload, now: Date): boolean {
    return (
      now.getTime() - new Date(payload.updatedAt).getTime() >
      this.policy.usageTtlMs
    );
  }
}
