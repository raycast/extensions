import { homedir } from "node:os";
import { isAbsolute, normalize } from "node:path";

// Bound input before it reaches filesystem readers or a native worker.
export const MAX_ROOTS = 20;
export const MAX_QUERY_CHARS = 2000;
export const MAX_RESULTS = 50;
export const MAX_BODY_BYTES = 32 * 1024;
export const MIN_MEMORY_MB = 1024;
export const MAX_MEMORY_MB = 4096;
export const PROTOCOL_VERSION = 1;
export const CONFIG_CONFLICT = "ConfigurationConflict";

export interface Config {
  roots: string[];
  excludedFolders: string[];
  excludedExtensions: string[];
  paused: boolean;
  powerMode: "balanced" | "ac-only";
  memoryLimitMb: number;
}

export interface Hit {
  path: string;
  kind: string;
  segment: string;
  score: number;
  loc?: number;
  loc_end?: number;
  focus?: number;
  excerpt?: string;
}

export interface Status {
  version: number;
  config: Config;
  activity: string;
  progress?: { done: number; total: number; path: string };
  counts?: {
    files: number;
    searchable: number;
    pending: number;
    vectors: number;
  };
  missingRoots: string[];
  error?: string;
  modelReady: boolean;
}

export const DEFAULT_CONFIG: Config = {
  roots: [],
  excludedFolders: [],
  excludedExtensions: [],
  paused: false,
  powerMode: "balanced",
  memoryLimitMb: 2048,
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected an object");
  }
  return value as Record<string, unknown>;
}

function strings(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > MAX_ROOTS ||
    value.some((item) => typeof item !== "string")
  ) {
    throw new Error(`Expected at most ${MAX_ROOTS} strings`);
  }
  return value;
}

function folder(value: string): string {
  if (!isAbsolute(value) || value.includes("\0")) {
    throw new Error("Choose an absolute folder path");
  }
  const path = normalize(value).replace(/\/$/, "") || "/";
  const broad = [
    "/",
    "/Users",
    "/Volumes",
    "/System",
    "/Applications",
    "/Library",
    homedir(),
  ];
  if (
    broad.includes(path) ||
    path.startsWith("/System/") ||
    path.startsWith("/Library/") ||
    path.startsWith(`${homedir()}/Library/`) ||
    path.split("/").some((part) => part.startsWith("."))
  ) {
    throw new Error(
      "Choose a specific content folder, not a system, home, or hidden folder",
    );
  }
  return path;
}

export function validateConfig(value: unknown): Config {
  const input = record(value);
  if (
    typeof input.paused !== "boolean" ||
    !["balanced", "ac-only"].includes(String(input.powerMode))
  ) {
    throw new Error("Invalid pause or power setting");
  }
  if (
    !Number.isInteger(input.memoryLimitMb) ||
    Number(input.memoryLimitMb) < MIN_MEMORY_MB ||
    Number(input.memoryLimitMb) > MAX_MEMORY_MB
  ) {
    throw new Error(
      `Worker memory budget must be ${MIN_MEMORY_MB}–${MAX_MEMORY_MB} MB`,
    );
  }
  const extensions = strings(input.excludedExtensions);
  if (extensions.some((extension) => !/^[a-z0-9]{1,15}$/.test(extension))) {
    throw new Error("Extensions must be lowercase names without dots");
  }

  return {
    roots: [...new Set(strings(input.roots).map(folder))],
    excludedFolders: [...new Set(strings(input.excludedFolders).map(folder))],
    excludedExtensions: [...new Set(extensions)],
    paused: input.paused,
    powerMode: input.powerMode as Config["powerMode"],
    memoryLimitMb: Number(input.memoryLimitMb),
  };
}

export function validateQuery(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > MAX_QUERY_CHARS ||
    value.includes("\0")
  ) {
    throw new Error(`Enter a query of 1–${MAX_QUERY_CHARS} characters`);
  }
  return value.trim();
}

export function decodeHits(value: string): Hit[] {
  const rows: unknown = JSON.parse(value);
  if (!Array.isArray(rows) || rows.length > MAX_RESULTS) {
    throw new Error("Invalid native search results");
  }
  for (const row of rows) {
    const item = record(row);
    if (
      typeof item.path !== "string" ||
      !isAbsolute(item.path) ||
      typeof item.kind !== "string" ||
      typeof item.segment !== "string" ||
      typeof item.score !== "number" ||
      !Number.isFinite(item.score)
    ) {
      throw new Error("Invalid native search result");
    }
    for (const key of ["loc", "loc_end", "focus"]) {
      if (
        item[key] !== undefined &&
        (typeof item[key] !== "number" || !Number.isFinite(item[key]))
      ) {
        throw new Error("Invalid result location");
      }
    }
    if (item.excerpt !== undefined && typeof item.excerpt !== "string") {
      throw new Error("Invalid result excerpt");
    }
  }
  return rows as Hit[];
}
