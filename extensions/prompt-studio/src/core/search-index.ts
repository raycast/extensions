import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { PromptRecord } from "./prompt-store.ts";

const USAGE_SCHEMA_VERSION = 1;
const SQLITE_UNAVAILABLE =
  "SQLite search is not included in the initial Raycast Store release.";

export interface SearchFilters {
  target?: PromptRecord["target"];
  projectPath?: string;
  tag?: string;
  favorite?: boolean;
  includeArchived?: boolean;
  limit?: number;
}

export interface SearchResult {
  id: string;
  score: number;
  matchedBy: string[];
}

export interface SearchIndexHealth {
  path: string;
  status: "healthy" | "missing" | "stale" | "corrupt";
  schemaVersion?: number;
  recordCount: number;
  lastUpdated?: string;
  needsRebuild: boolean;
  message: string;
}

export interface PromptUsage {
  useCount: number;
  lastUsedAt: string;
}

interface UsageFile {
  schemaVersion: 1;
  prompts: Record<string, PromptUsage>;
}

export function defaultSearchIndexPath(): string {
  return join(
    homedir(),
    "Library",
    "Application Support",
    "Prompt Studio",
    "usage.json",
  );
}

export function promptLibraryFingerprint(records: PromptRecord[]): string {
  const digest = createHash("sha256");
  for (const record of [...records].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    digest.update(
      `${record.id}\0${record.updatedAt}\0${record.filePath}\0${record.body.length}\n`,
    );
  }
  return digest.digest("hex");
}

export function recordPromptUse(
  id: string,
  path = defaultSearchIndexPath(),
): void {
  const usage = loadPromptUsage(path);
  const previous = usage.get(id);
  usage.set(id, {
    useCount: (previous?.useCount ?? 0) + 1,
    lastUsedAt: new Date().toISOString(),
  });
  writeUsage(path, usage);
}

export function loadPromptUsage(
  path = defaultSearchIndexPath(),
): Map<string, PromptUsage> {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!isUsageFile(parsed)) return new Map();
    return new Map(Object.entries(parsed.prompts));
  } catch {
    return new Map();
  }
}

export function rankRecordsByUsage<T extends { id: string; updatedAt: string }>(
  records: readonly T[],
  usage: ReadonlyMap<string, PromptUsage>,
): T[] {
  return [...records].sort((left, right) => {
    const leftUse = usage.get(left.id);
    const rightUse = usage.get(right.id);
    if (leftUse && rightUse) {
      return (
        rightUse.lastUsedAt.localeCompare(leftUse.lastUsedAt) ||
        rightUse.useCount - leftUse.useCount ||
        right.updatedAt.localeCompare(left.updatedAt)
      );
    }
    if (leftUse) return -1;
    if (rightUse) return 1;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export function inspectSearchIndex(
  path = defaultSearchIndexPath(),
  _records: readonly PromptRecord[] = [],
): SearchIndexHealth {
  void _records;
  return {
    path,
    status: "missing",
    recordCount: 0,
    needsRebuild: true,
    message: SQLITE_UNAVAILABLE,
  };
}

export function ensureSearchIndex(..._args: unknown[]): SearchIndexHealth {
  void _args;
  return unavailable();
}

export function rebuildSearchIndex(..._args: unknown[]): SearchIndexHealth {
  void _args;
  return unavailable();
}

export function upsertSearchRecord(..._args: unknown[]): void {
  void _args;
  unavailable();
}

export function removeSearchRecord(..._args: unknown[]): void {
  void _args;
  unavailable();
}

export function searchPrompts(..._args: unknown[]): SearchResult[] {
  void _args;
  return unavailable();
}

export function markSearchIndexForRebuild(..._args: unknown[]): void {
  void _args;
  // The Store release uses the JSON usage cache and has no SQLite index.
}

function writeUsage(
  path: string,
  usage: ReadonlyMap<string, PromptUsage>,
): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  const value: UsageFile = {
    schemaVersion: USAGE_SCHEMA_VERSION,
    prompts: Object.fromEntries(usage),
  };
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

function isUsageFile(value: unknown): value is UsageFile {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== USAGE_SCHEMA_VERSION ||
    !("prompts" in value) ||
    typeof value.prompts !== "object" ||
    value.prompts === null ||
    Array.isArray(value.prompts)
  ) {
    return false;
  }

  return Object.values(value.prompts).every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      "useCount" in entry &&
      typeof entry.useCount === "number" &&
      Number.isFinite(entry.useCount) &&
      entry.useCount >= 0 &&
      "lastUsedAt" in entry &&
      typeof entry.lastUsedAt === "string",
  );
}

function unavailable(): never {
  throw new Error(SQLITE_UNAVAILABLE);
}
