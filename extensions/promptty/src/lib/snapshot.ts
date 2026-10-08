import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { MINIMUM_PROMPTTY_VERSION, isPrompttyVersionSupported } from "./compatibility.js";
import { SnapshotError, snapshotErrorFromFileSystem } from "./errors.js";
import type { ParsedSnapshot, PromptCategory, PromptRecord, PromptSnapshotV1 } from "../types/snapshot.js";

export const LAST_KNOWN_GOOD_CACHE_KEY = "promptty-snapshot-v1";
export const MAX_LAST_KNOWN_GOOD_BYTES = 8 * 1024 * 1024;
export const STALE_AFTER_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
const CACHE_FORMAT_VERSION = 2;

export interface StringCache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface LoadedSnapshot extends ParsedSnapshot {
  source: "file" | "cache";
  issue?: SnapshotError;
  cacheUpdated: boolean;
}

interface CachedSnapshot {
  cacheVersion: typeof CACHE_FORMAT_VERSION;
  sourceId: string;
  snapshot: PromptSnapshotV1;
}

export function parseSnapshotJSON(json: string): ParsedSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new SnapshotError("malformed", "The snapshot is not valid JSON.");
  }

  if (!isObject(value)) {
    throw new SnapshotError("malformed", "The snapshot envelope must be an object.");
  }

  if (typeof value.schemaVersion !== "number") {
    throw new SnapshotError("malformed", "The snapshot schema version is missing.");
  }
  if (value.schemaVersion !== 1) {
    throw new SnapshotError("incompatible", "The snapshot schema version is unsupported.", value.schemaVersion);
  }
  if (!isISO8601Date(value.generatedAt) || typeof value.appVersion !== "string") {
    throw new SnapshotError("malformed", "The snapshot metadata is invalid.");
  }
  if (!isPrompttyVersionSupported(value.appVersion)) {
    throw new SnapshotError(
      "unsupportedPrompttyVersion",
      `Promptty ${MINIMUM_PROMPTTY_VERSION} or later is required.`,
      undefined,
      value.appVersion,
    );
  }
  if (!Array.isArray(value.prompts)) {
    throw new SnapshotError("malformed", "The snapshot prompt collection is invalid.");
  }

  const prompts: PromptRecord[] = [];
  let skippedRecordCount = 0;
  for (const candidate of value.prompts) {
    const prompt = parsePromptRecord(candidate);
    if (prompt) {
      prompts.push(prompt);
    } else {
      skippedRecordCount += 1;
    }
  }

  return {
    snapshot: {
      schemaVersion: 1,
      generatedAt: value.generatedAt,
      appVersion: value.appVersion,
      prompts,
    },
    skippedRecordCount,
  };
}

export async function readSnapshotFile(path: string): Promise<ParsedSnapshot> {
  let json: string;
  try {
    json = await readFile(path, "utf8");
  } catch (error) {
    throw snapshotErrorFromFileSystem(error);
  }
  return parseSnapshotJSON(json);
}

export async function loadSnapshotWithCache(path: string, cache: StringCache): Promise<LoadedSnapshot> {
  const sourceId = snapshotSourceId(path);

  try {
    const parsed = await readSnapshotFile(path);
    const cacheValue = JSON.stringify({
      cacheVersion: CACHE_FORMAT_VERSION,
      sourceId,
      snapshot: parsed.snapshot,
    } satisfies CachedSnapshot);
    const cacheUpdated = Buffer.byteLength(cacheValue, "utf8") <= MAX_LAST_KNOWN_GOOD_BYTES;
    if (cacheUpdated) {
      cache.set(LAST_KNOWN_GOOD_CACHE_KEY, cacheValue);
    } else if (isCachedSourceId(cache.get(LAST_KNOWN_GOOD_CACHE_KEY), sourceId)) {
      // This source has a newer export than the cache holds, so the entry is no
      // longer last-known-good. Another source's entry is left untouched.
      cache.remove(LAST_KNOWN_GOOD_CACHE_KEY);
    }
    return { ...parsed, source: "file", cacheUpdated };
  } catch (error) {
    const issue =
      error instanceof SnapshotError
        ? error
        : new SnapshotError("unavailable", "The Promptty snapshot could not be loaded.");
    if (issue.kind === "unsupportedPrompttyVersion") {
      throw issue;
    }
    const cached = cache.get(LAST_KNOWN_GOOD_CACHE_KEY);
    if (cached) {
      try {
        const parsed = parseCachedSnapshot(cached, sourceId);
        if (parsed) {
          return { ...parsed, source: "cache", issue, cacheUpdated: false };
        }
      } catch {
        // A broken cache is ignored and never replaces the original read error.
        cache.remove(LAST_KNOWN_GOOD_CACHE_KEY);
      }
    }
    throw issue;
  }
}

export function isSnapshotStale(generatedAt: string, now = Date.now()): boolean {
  return now - Date.parse(generatedAt) > STALE_AFTER_MILLISECONDS;
}

function snapshotSourceId(path: string): string {
  const normalizedPath = resolve(path).normalize("NFC");
  return createHash("sha256").update(normalizedPath, "utf8").digest("hex");
}

function isCachedSourceId(json: string | undefined, expectedSourceId: string): boolean {
  if (!json) return false;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return false;
  }
  return isObject(value) && value.cacheVersion === CACHE_FORMAT_VERSION && value.sourceId === expectedSourceId;
}

function parseCachedSnapshot(json: string, expectedSourceId: string): ParsedSnapshot | undefined {
  const value: unknown = JSON.parse(json);
  if (
    !isObject(value) ||
    value.cacheVersion !== CACHE_FORMAT_VERSION ||
    typeof value.sourceId !== "string" ||
    !isObject(value.snapshot)
  ) {
    throw new Error("The cached snapshot envelope is invalid.");
  }
  if (value.sourceId !== expectedSourceId) return undefined;
  return parseSnapshotJSON(JSON.stringify(value.snapshot));
}

function parsePromptRecord(value: unknown): PromptRecord | undefined {
  if (!isObject(value)) return undefined;
  if (!isUUID(value.id) || typeof value.title !== "string" || typeof value.content !== "string") {
    return undefined;
  }
  if (typeof value.isFavorite !== "boolean") return undefined;

  const usageCount = value.usageCount ?? 0;
  if (!Number.isSafeInteger(usageCount) || (usageCount as number) < 0) return undefined;

  const createdAt = parseOptionalDate(value.createdAt);
  const updatedAt = parseOptionalDate(value.updatedAt);
  const lastUsedAt = parseOptionalDate(value.lastUsedAt);
  if (createdAt === false || updatedAt === false || lastUsedAt === false) return undefined;

  const category = parseCategory(value.category);
  if (category === false) return undefined;

  const tags = value.tags ?? [];
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) return undefined;

  return {
    id: value.id,
    title: value.title,
    content: value.content,
    isFavorite: value.isFavorite,
    usageCount: usageCount as number,
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(lastUsedAt ? { lastUsedAt } : {}),
    ...(category ? { category } : {}),
    tags,
  };
}

function parseCategory(value: unknown): PromptCategory | undefined | false {
  if (value === undefined || value === null) return undefined;
  if (!isObject(value) || typeof value.name !== "string") return false;
  if (!isOptionalString(value.iconName) || !isOptionalString(value.colorHex)) return false;
  return {
    name: value.name,
    ...(typeof value.iconName === "string" ? { iconName: value.iconName } : {}),
    ...(typeof value.colorHex === "string" ? { colorHex: value.colorHex } : {}),
  };
}

function parseOptionalDate(value: unknown): string | undefined | false {
  if (value === undefined || value === null) return undefined;
  return isISO8601Date(value) ? value : false;
}

function isISO8601Date(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
