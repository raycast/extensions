import { createHash } from "node:crypto";
import { CheckTimeoutError, checkText, type CheckOptions, type CheckResult } from "./pangram";

/** Synchronous key-value storage; Raycast's `Cache` satisfies it. */
export interface Store {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface RunCheckOptions extends Omit<CheckOptions, "taskId" | "onSubmit"> {
  store: Store;
  /** Send a new Check, skipping any Cached Result or earlier task. */
  refresh: boolean;
  /** Ignore Cached Results from a Model Version older than the last one seen. */
  versionInvalidatesCache: boolean;
  /** Runs before credits are spent, with the trimmed text; throw to cancel the Check. */
  beforeSend?: (text: string) => Promise<void>;
  /** Runs instead of `beforeSend` when resuming an unfinished task that is already paid for. */
  onResume?: () => void;
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

/** Runs a Check on the trimmed text, resuming a paid task or serving a usable Cached Result unless `refresh`. */
export async function runCheck(
  text: string,
  { store, refresh, versionInvalidatesCache, beforeSend, onResume, ...options }: RunCheckOptions,
): Promise<CheckOutcome> {
  const trimmed = text.trim();
  const key = `check:${createHash("sha256").update(`${options.model}\0${trimmed}`).digest("hex")}`;
  const versionKey = `modelVersion:${options.model}`;
  const lastModelVersion = store.get(versionKey);

  // An unfinished task is paid for and newer than any Cached Result: resume it rather than pay again.
  const taskKey = `task:${key}`;
  const taskId = refresh ? undefined : store.get(taskKey);
  if (taskId) {
    onResume?.();
  } else {
    const cached = refresh ? undefined : store.get(key);
    if (cached) {
      const entry = JSON.parse(cached) as CacheEntry;
      if (!versionInvalidatesCache || entry.result.modelVersion === lastModelVersion)
        return { ...entry, isCached: true };
    }
    await beforeSend?.(trimmed);
  }
  let result: CheckResult;
  try {
    result = await checkText(trimmed, { ...options, taskId, onSubmit: (id) => store.set(taskKey, id) });
  } catch (error) {
    // A timed-out task may still finish, so Try Again resumes it. Any other failure ends it.
    if (!(error instanceof CheckTimeoutError)) store.remove(taskKey);
    throw error;
  }
  store.remove(taskKey);

  const entry: CacheEntry = { result, checkedAt: new Date().toISOString() };
  const { modelVersion } = entry.result;
  store.set(key, JSON.stringify(entry));
  store.set(versionKey, modelVersion);
  return {
    ...entry,
    isCached: false,
    previousModelVersion: lastModelVersion && lastModelVersion !== modelVersion ? lastModelVersion : undefined,
  };
}
