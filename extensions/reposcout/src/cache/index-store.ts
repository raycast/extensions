import { INDEX_SCHEMA_VERSION, type RepositoryIndex } from "../types/index-state";
import type { RepositoryRecord } from "../types/repository";
import { createLogger } from "../utils/logger";
import { readJsonFile, writeJsonFileAtomic } from "./json-file";

const log = createLogger("index-store");

/**
 * Persists the {@link RepositoryIndex} — the search source of truth — to a JSON
 * file. The store is intentionally minimal: load, save. It performs schema
 * validation on load and discards anything it does not recognize so a stale or
 * corrupt cache degrades to "rebuild from scratch" rather than crashing.
 */
export interface IndexStore {
  /** Load the persisted index, or `null` when absent/invalid/outdated. */
  load(): Promise<RepositoryIndex | null>;
  /** Persist the index atomically. Returns whether the write succeeded. */
  save(index: RepositoryIndex): Promise<boolean>;
}

/** Narrow an unknown value to a well-formed {@link RepositoryRecord}. */
function isRecord(value: unknown): value is RepositoryRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<RepositoryRecord>;
  return (
    typeof candidate.path === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.kind === "string" &&
    typeof candidate.status === "string"
  );
}

/** Validate a parsed payload as a current-version {@link RepositoryIndex}. */
function validateIndex(value: unknown): RepositoryIndex | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as Partial<RepositoryIndex>;
  if (candidate.version !== INDEX_SCHEMA_VERSION) {
    log.info(`ignoring index with schema version ${candidate.version ?? "?"}`);
    return null;
  }
  if (!Array.isArray(candidate.records) || typeof candidate.updatedAt !== "number") {
    return null;
  }
  const records = candidate.records.filter(isRecord);
  return { version: INDEX_SCHEMA_VERSION, updatedAt: candidate.updatedAt, records };
}

/**
 * Create a file-backed {@link IndexStore}.
 *
 * @param filePath Absolute path to the JSON cache file (typically inside
 *                 Raycast's `environment.supportPath`).
 */
export function createFileIndexStore(filePath: string): IndexStore {
  return {
    async load(): Promise<RepositoryIndex | null> {
      const result = await readJsonFile<unknown>(filePath);
      if (!result.ok) {
        log.debug(`no readable index at ${filePath}`, result.error.message);
        return null;
      }
      const validated = validateIndex(result.value);
      if (validated === null) {
        log.warn(`discarding invalid index at ${filePath}`);
      }
      return validated;
    },

    async save(index: RepositoryIndex): Promise<boolean> {
      const result = await writeJsonFileAtomic(filePath, index, "reposcout-index");
      return result.ok;
    },
  };
}
