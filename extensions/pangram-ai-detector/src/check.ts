import { createHash } from "node:crypto";
import { checkText, type CheckOptions, type CheckResult } from "./pangram";

/** Synchronous key-value storage; Raycast's `Cache` satisfies it. */
export interface Store {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

export interface RunCheckOptions extends CheckOptions {
  store: Store;
  /** Skip any Cached Result. */
  refresh: boolean;
  /** Ignore Cached Results from a Model Version older than the last one seen. */
  versionInvalidatesCache: boolean;
  /** Runs before credits are spent, with the trimmed text; throw to cancel the Check. */
  beforeSend?: (text: string) => Promise<void>;
}

interface CacheEntry {
  result: CheckResult;
  checkedAt: string;
}

export interface CheckOutcome extends CacheEntry {
  isCached: boolean;
  /** The Model Version seen before this Check, when this Check found a new one. */
  previousModelVersion?: string;
}

/** Runs a Check on the trimmed text, serving a Cached Result when one is usable. */
export async function runCheck(
  text: string,
  { store, refresh, versionInvalidatesCache, beforeSend, ...options }: RunCheckOptions,
): Promise<CheckOutcome> {
  const trimmed = text.trim();
  const key = `check:${createHash("sha256").update(`${options.model}\0${trimmed}`).digest("hex")}`;
  const versionKey = `modelVersion:${options.model}`;
  const lastModelVersion = store.get(versionKey);

  const cached = refresh ? undefined : store.get(key);
  if (cached) {
    const entry = JSON.parse(cached) as CacheEntry;
    if (!versionInvalidatesCache || entry.result.modelVersion === lastModelVersion) return { ...entry, isCached: true };
  }

  await beforeSend?.(trimmed);
  const entry: CacheEntry = { result: await checkText(trimmed, options), checkedAt: new Date().toISOString() };
  const { modelVersion } = entry.result;
  store.set(key, JSON.stringify(entry));
  store.set(versionKey, modelVersion);
  return {
    ...entry,
    isCached: false,
    previousModelVersion: lastModelVersion && lastModelVersion !== modelVersion ? lastModelVersion : undefined,
  };
}
