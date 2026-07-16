import type { RepositoryUserData } from "../types/repository";
import { createLogger } from "../utils/logger";
import { readJsonFile, writeJsonFileAtomic } from "./json-file";

const log = createLogger("user-data-store");

/**
 * Persists per-repository {@link RepositoryUserData} (favorites, pins, open
 * history) independently of the repository index, so that re-scanning the
 * filesystem never destroys user intent. Stored as a JSON object keyed by
 * repository path.
 */
export interface UserDataStore {
  /** Load all user data as a Map. Missing/corrupt files yield an empty Map. */
  load(): Promise<Map<string, RepositoryUserData>>;
  /** Persist the full user-data map atomically. */
  save(data: ReadonlyMap<string, RepositoryUserData>): Promise<boolean>;
}

/** Narrow an unknown value to well-formed {@link RepositoryUserData}. */
function isUserData(value: unknown): value is RepositoryUserData {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<RepositoryUserData>;
  return (
    typeof candidate.pinned === "boolean" &&
    typeof candidate.favorite === "boolean" &&
    typeof candidate.openCount === "number" &&
    (candidate.lastOpenedAt === null || typeof candidate.lastOpenedAt === "number")
  );
}

/**
 * Create a file-backed {@link UserDataStore}.
 *
 * @param filePath Absolute path to the JSON user-data file.
 */
export function createFileUserDataStore(filePath: string): UserDataStore {
  return {
    async load(): Promise<Map<string, RepositoryUserData>> {
      const result = await readJsonFile<Record<string, unknown>>(filePath);
      const map = new Map<string, RepositoryUserData>();
      if (!result.ok) {
        log.debug(`no readable user data at ${filePath}`, result.error.message);
        return map;
      }
      const parsed = result.value;
      if (typeof parsed !== "object" || parsed === null) {
        return map;
      }
      for (const [path, value] of Object.entries(parsed)) {
        if (isUserData(value)) {
          map.set(path, value);
        }
      }
      return map;
    },

    async save(data: ReadonlyMap<string, RepositoryUserData>): Promise<boolean> {
      const record: Record<string, RepositoryUserData> = {};
      for (const [path, value] of data) {
        record[path] = value;
      }
      const result = await writeJsonFileAtomic(filePath, record, "reposcout-userdata");
      return result.ok;
    },
  };
}
