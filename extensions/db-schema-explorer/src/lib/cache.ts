import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

const CACHE_FILENAME_PREFIX = "schema-";
const CACHE_FILENAME_SUFFIX = ".json";
const OLD_CACHE_FILENAME = "schema-cache.json";

export type TableCacheEntry = {
  ddl: string;
  schema?: string;
  type: "table" | "view";
};

export type SchemaCache = {
  tables: Record<string, TableCacheEntry>;
  enums?: string;
};

export function getCachePath(dbId: string): string {
  return path.join(environment.supportPath, `${CACHE_FILENAME_PREFIX}${dbId}${CACHE_FILENAME_SUFFIX}`);
}

/** Legacy single-DB cache path (for migration). */
export function getLegacyCachePath(): string {
  return path.join(environment.supportPath, OLD_CACHE_FILENAME);
}

export function readSchemaCache(dbId: string): SchemaCache | null {
  try {
    const cachePath = getCachePath(dbId);
    if (!fs.existsSync(cachePath)) {
      return null;
    }
    const raw = fs.readFileSync(cachePath, "utf-8");
    const data = JSON.parse(raw) as SchemaCache;
    if (!data || typeof data.tables !== "object") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function writeSchemaCache(dbId: string, cache: SchemaCache): void {
  const dir = environment.supportPath;
  fs.mkdirSync(dir, { recursive: true });
  const cachePath = getCachePath(dbId);
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
}
