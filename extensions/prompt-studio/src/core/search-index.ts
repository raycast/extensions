import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { PromptRecord } from "./prompt-store.ts";

const SCHEMA_VERSION = 4;

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

interface SearchRow {
  id: string;
  title: string;
  summary: string;
  body: string;
  target: string;
  project_name: string | null;
  project_path: string | null;
  favorite: number;
  tags: string;
  aliases: string;
  search_terms: string;
  score: number;
}

interface CountRow {
  count: number;
}

interface ValueRow {
  value: string;
}

interface IntegrityRow {
  quick_check: string;
}

export function defaultSearchIndexPath(): string {
  return join(
    homedir(),
    "Library",
    "Application Support",
    "Prompt Studio",
    "search.sqlite",
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

export function rebuildSearchIndex(
  records: PromptRecord[],
  path = defaultSearchIndexPath(),
  versions: ReadonlyMap<string, readonly PromptRecord[]> = new Map(),
): SearchIndexHealth {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.rebuild-${randomUUID()}.tmp`;
  let database: DatabaseSync | undefined;

  try {
    database = new DatabaseSync(temporaryPath, { timeout: 5_000 });
    createSchema(database);
    database.exec("BEGIN IMMEDIATE");
    try {
      for (const record of records) {
        insertRecord(database, record);
        for (const version of versions.get(record.id) ?? []) {
          insertVersion(database, record.id, version);
        }
      }
      setMetadata(
        database,
        promptLibraryFingerprint(records),
        new Date().toISOString(),
        "",
      );
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    database.close();
    database = undefined;
    renameSync(temporaryPath, path);
  } finally {
    database?.close();
    rmSync(temporaryPath, { force: true });
  }

  return inspectSearchIndex(path, records);
}

export function ensureSearchIndex(
  records: PromptRecord[],
  path = defaultSearchIndexPath(),
): SearchIndexHealth {
  const health = inspectSearchIndex(path, records);
  if (health.needsRebuild) return rebuildSearchIndex(records, path);
  return health;
}

export function upsertSearchRecord(
  record: PromptRecord,
  versions: readonly PromptRecord[] = [],
  path = defaultSearchIndexPath(),
  libraryFingerprint = "",
): void {
  const database = openHealthyDatabase(path);
  try {
    database.exec("BEGIN IMMEDIATE");
    try {
      clearDerivedRecordMetadata(database, record.id);
      insertRecord(database, record);
      for (const version of versions)
        insertVersion(database, record.id, version);
      setMetadata(database, libraryFingerprint, new Date().toISOString(), "");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } finally {
    database.close();
  }
}

export function removeSearchRecord(
  id: string,
  path = defaultSearchIndexPath(),
  libraryFingerprint = "",
): void {
  const database = openHealthyDatabase(path);
  try {
    database.exec("BEGIN IMMEDIATE");
    try {
      deleteRecord(database, id);
      setMetadata(database, libraryFingerprint, new Date().toISOString(), "");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } finally {
    database.close();
  }
}

export function recordPromptUse(
  id: string,
  path = defaultSearchIndexPath(),
): void {
  const database = openHealthyDatabase(path);
  try {
    const result = database
      .prepare(
        `
          INSERT INTO usage (prompt_id, use_count, last_used_at)
          SELECT id, 1, ? FROM records WHERE id = ?
          ON CONFLICT(prompt_id) DO UPDATE SET
            use_count = usage.use_count + 1,
            last_used_at = excluded.last_used_at
        `,
      )
      .run(new Date().toISOString(), id);
    if (Number(result.changes) !== 1) {
      throw new Error(`Prompt is not present in the search index: ${id}.`);
    }
  } finally {
    database.close();
  }
}

export interface PromptUsage {
  useCount: number;
  lastUsedAt: string;
}

export function loadPromptUsage(
  path = defaultSearchIndexPath(),
): Map<string, PromptUsage> {
  const usage = new Map<string, PromptUsage>();
  let database: DatabaseSync;
  try {
    database = openHealthyDatabase(path);
  } catch {
    // ponytail: a missing or unhealthy index only loses ranking, never data.
    return usage;
  }
  try {
    const rows = database
      .prepare(`SELECT prompt_id, use_count, last_used_at FROM usage`)
      .all() as Array<{
      prompt_id: string;
      use_count: number;
      last_used_at: string;
    }>;
    for (const row of rows) {
      usage.set(row.prompt_id, {
        useCount: Number(row.use_count),
        lastUsedAt: String(row.last_used_at),
      });
    }
  } finally {
    database.close();
  }
  return usage;
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

export function markSearchIndexForRebuild(
  reason: string,
  path = defaultSearchIndexPath(),
): void {
  try {
    const database = openHealthyDatabase(path);
    try {
      setMetadata(database, "", new Date().toISOString(), reason);
    } finally {
      database.close();
    }
  } catch {
    // A missing or unreadable database is already a rebuild signal.
  }
}

export function searchPrompts(
  query: string,
  filters: SearchFilters = {},
  path = defaultSearchIndexPath(),
): SearchResult[] {
  const database = openHealthyDatabase(path);
  try {
    const normalizedQuery = query.trim();
    const parameters: Array<string | number> = [];
    const predicates: string[] = [];

    if (!filters.includeArchived) predicates.push("r.archived_at IS NULL");
    if (filters.target) {
      predicates.push("r.target = ?");
      parameters.push(filters.target);
    }
    if (filters.projectPath) {
      predicates.push("r.project_path = ?");
      parameters.push(filters.projectPath);
    }
    if (filters.tag) {
      predicates.push(
        "EXISTS (SELECT 1 FROM tags ft WHERE ft.prompt_id = r.id AND ft.tag = ?)",
      );
      parameters.push(filters.tag);
    }
    if (filters.favorite !== undefined) {
      predicates.push("r.favorite = ?");
      parameters.push(filters.favorite ? 1 : 0);
    }

    const where = predicates.length ? `WHERE ${predicates.join(" AND ")}` : "";
    const limit = clampLimit(filters.limit);
    let rows: SearchRow[];

    if (normalizedQuery) {
      const ftsQuery = toFtsQuery(normalizedQuery);
      rows = database
        .prepare(
          `
            WITH ranked AS (
              SELECT id
              FROM prompt_fts
              WHERE prompt_fts MATCH ?
            )
            SELECT
              r.id,
              r.title,
              r.summary,
              r.body,
              r.target,
              r.project_name,
              r.project_path,
              r.favorite,
              group_concat(DISTINCT t.tag) AS tags,
              group_concat(DISTINCT a.alias) AS aliases,
              group_concat(DISTINCT s.term) AS search_terms,
              (
                CASE WHEN lower(r.title) = ? THEN 100 ELSE 0 END
                + CASE WHEN instr(lower(r.title), ?) > 0 THEN 40 ELSE 0 END
                + CASE WHEN EXISTS (
                    SELECT 1 FROM tags exact_tag
                    WHERE exact_tag.prompt_id = r.id AND lower(exact_tag.tag) = ?
                  ) THEN 70 ELSE 0 END
                + CASE WHEN EXISTS (
                    SELECT 1 FROM tags partial_tag
                    WHERE partial_tag.prompt_id = r.id
                      AND instr(lower(partial_tag.tag), ?) > 0
                  ) THEN 35 ELSE 0 END
                + CASE WHEN EXISTS (
                    SELECT 1 FROM aliases matched_alias
                    WHERE matched_alias.prompt_id = r.id
                      AND instr(lower(matched_alias.alias), ?) > 0
                  ) THEN 32 ELSE 0 END
                + CASE WHEN EXISTS (
                    SELECT 1 FROM search_terms matched_term
                    WHERE matched_term.prompt_id = r.id
                      AND instr(lower(matched_term.term), ?) > 0
                  ) THEN 30 ELSE 0 END
                + CASE WHEN instr(
                    lower(coalesce(r.project_name, '') || ' ' || coalesce(r.project_path, '')),
                    ?
                  ) > 0 THEN 25 ELSE 0 END
                + CASE WHEN instr(lower(r.summary), ?) > 0 THEN 10 ELSE 0 END
                + CASE WHEN instr(lower(r.body), ?) > 0 THEN 1 ELSE 0 END
                + CASE WHEN r.favorite = 1 THEN 2 ELSE 0 END
                + min(coalesce(u.use_count, 0), 20) * 0.05
              ) AS score
            FROM ranked
            JOIN records r ON r.id = ranked.id
            LEFT JOIN tags t ON t.prompt_id = r.id
            LEFT JOIN aliases a ON a.prompt_id = r.id
            LEFT JOIN search_terms s ON s.prompt_id = r.id
            LEFT JOIN usage u ON u.prompt_id = r.id
            ${where}
            GROUP BY r.id
            ORDER BY score DESC, r.updated_at DESC, r.title ASC
            LIMIT ?
          `,
        )
        .all(
          ftsQuery,
          normalizedQuery.toLocaleLowerCase(),
          normalizedQuery.toLocaleLowerCase(),
          normalizedQuery.toLocaleLowerCase(),
          normalizedQuery.toLocaleLowerCase(),
          normalizedQuery.toLocaleLowerCase(),
          normalizedQuery.toLocaleLowerCase(),
          normalizedQuery.toLocaleLowerCase(),
          normalizedQuery.toLocaleLowerCase(),
          normalizedQuery.toLocaleLowerCase(),
          ...parameters,
          limit,
        ) as unknown as SearchRow[];
    } else {
      rows = database
        .prepare(
          `
            SELECT
              r.id,
              r.title,
              r.summary,
              r.body,
              r.target,
              r.project_name,
              r.project_path,
              r.favorite,
              group_concat(DISTINCT t.tag) AS tags,
              group_concat(DISTINCT a.alias) AS aliases,
              group_concat(DISTINCT s.term) AS search_terms,
              (
                CASE WHEN r.favorite = 1 THEN 2 ELSE 0 END
                + min(coalesce(u.use_count, 0), 20) * 0.05
              ) AS score
            FROM records r
            LEFT JOIN tags t ON t.prompt_id = r.id
            LEFT JOIN aliases a ON a.prompt_id = r.id
            LEFT JOIN search_terms s ON s.prompt_id = r.id
            LEFT JOIN usage u ON u.prompt_id = r.id
            ${where}
            GROUP BY r.id
            ORDER BY r.favorite DESC, u.last_used_at DESC, r.updated_at DESC, r.title ASC
            LIMIT ?
          `,
        )
        .all(...parameters, limit) as unknown as SearchRow[];
    }

    return rows.map((row) => ({
      id: row.id,
      score: row.score,
      matchedBy: explainMatch(row, normalizedQuery),
    }));
  } finally {
    database.close();
  }
}

export function inspectSearchIndex(
  path = defaultSearchIndexPath(),
  records?: PromptRecord[],
): SearchIndexHealth {
  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(path, {
      readOnly: true,
      timeout: 2_000,
    });
    const integrity = database.prepare("PRAGMA quick_check").get() as
      | IntegrityRow
      | undefined;
    if (integrity?.quick_check !== "ok") {
      return unhealthy(path, "corrupt", "SQLite integrity check failed.");
    }

    const schemaVersion = Number(
      database.prepare("PRAGMA user_version").get()?.user_version ?? 0,
    );
    if (schemaVersion !== SCHEMA_VERSION) {
      return {
        ...unhealthy(
          path,
          "stale",
          `Index schema ${schemaVersion} must be rebuilt as schema ${SCHEMA_VERSION}.`,
        ),
        schemaVersion,
      };
    }

    const count =
      (
        database.prepare("SELECT count(*) AS count FROM records").get() as
          | CountRow
          | undefined
      )?.count ?? 0;
    const lastUpdated = metadataValue(database, "last_updated");
    const rebuildReason = metadataValue(database, "rebuild_reason");
    const savedFingerprint = metadataValue(database, "library_fingerprint");
    const currentFingerprint = records
      ? promptLibraryFingerprint(records)
      : undefined;
    const stale =
      Boolean(rebuildReason) ||
      (currentFingerprint !== undefined &&
        savedFingerprint !== currentFingerprint);

    return {
      path,
      status: stale ? "stale" : "healthy",
      schemaVersion,
      recordCount: count,
      ...(lastUpdated ? { lastUpdated } : {}),
      needsRebuild: stale,
      message: rebuildReason
        ? `Rebuild required: ${rebuildReason}`
        : stale
          ? "Prompt files changed since the index was built."
          : "Index is healthy and rebuildable from Markdown.",
    };
  } catch (error) {
    const code = errorCode(error);
    return unhealthy(
      path,
      code === "ERR_SQLITE_CANTOPEN" || code === "ENOENT"
        ? "missing"
        : "corrupt",
      code === "ERR_SQLITE_CANTOPEN" || code === "ENOENT"
        ? "Index does not exist yet."
        : `Index cannot be read: ${errorMessage(error)}`,
    );
  } finally {
    database?.close();
  }
}

function createSchema(database: DatabaseSync): void {
  database.exec(`
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;
    PRAGMA user_version = ${SCHEMA_VERSION};

    CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    ) STRICT;

    CREATE TABLE records (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      body TEXT NOT NULL,
      target TEXT NOT NULL,
      project_name TEXT,
      project_path TEXT,
      project_branch TEXT,
      project_commit TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      favorite INTEGER NOT NULL CHECK (favorite IN (0, 1)),
      archived_at TEXT,
      assumptions_json TEXT NOT NULL,
      missing_information_json TEXT NOT NULL,
      validation_steps_json TEXT NOT NULL
    ) STRICT;

    CREATE TABLE tags (
      prompt_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (prompt_id, tag)
    ) STRICT;

    CREATE TABLE aliases (
      prompt_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      alias TEXT NOT NULL,
      PRIMARY KEY (prompt_id, alias)
    ) STRICT;

    CREATE TABLE search_terms (
      prompt_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      term TEXT NOT NULL,
      PRIMARY KEY (prompt_id, term)
    ) STRICT;

    CREATE TABLE projects (
      path TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      current_branch TEXT,
      current_commit TEXT
    ) STRICT;

    CREATE TABLE prompt_projects (
      prompt_id TEXT PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
      project_path TEXT NOT NULL REFERENCES projects(path) ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE usage (
      prompt_id TEXT PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
      use_count INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT
    ) STRICT;

    CREATE TABLE feedback (
      id INTEGER PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      prompt_updated_at TEXT NOT NULL,
      rating INTEGER,
      critique TEXT,
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE versions (
      prompt_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      version_path TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      body TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      PRIMARY KEY (prompt_id, version_path)
    ) STRICT;

    CREATE TABLE sources (
      prompt_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      retrieved_at TEXT NOT NULL,
      supports_json TEXT NOT NULL,
      PRIMARY KEY (prompt_id, title, url, retrieved_at)
    ) STRICT;

    CREATE VIRTUAL TABLE prompt_fts USING fts5(
      id UNINDEXED,
      title,
      summary,
      body,
      tags,
      aliases,
      search_terms,
      project,
      target,
      taxonomy,
      tokenize = 'unicode61 remove_diacritics 2'
    );

    CREATE INDEX records_updated_at ON records(updated_at DESC);
    CREATE INDEX records_target ON records(target);
    CREATE INDEX records_project_path ON records(project_path);
    CREATE INDEX records_favorite ON records(favorite);
    CREATE INDEX tags_tag ON tags(tag);
  `);
}

function insertRecord(database: DatabaseSync, record: PromptRecord): void {
  database
    .prepare(
      `
        INSERT INTO records (
          id, file_path, title, summary, body, target,
          project_name, project_path, project_branch, project_commit,
          created_at, updated_at, favorite, archived_at,
          assumptions_json, missing_information_json, validation_steps_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          file_path = excluded.file_path,
          title = excluded.title,
          summary = excluded.summary,
          body = excluded.body,
          target = excluded.target,
          project_name = excluded.project_name,
          project_path = excluded.project_path,
          project_branch = excluded.project_branch,
          project_commit = excluded.project_commit,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          favorite = excluded.favorite,
          archived_at = excluded.archived_at,
          assumptions_json = excluded.assumptions_json,
          missing_information_json = excluded.missing_information_json,
          validation_steps_json = excluded.validation_steps_json
      `,
    )
    .run(
      record.id,
      record.filePath,
      record.title,
      record.summary,
      record.body,
      record.target,
      record.project?.name ?? null,
      record.project?.path ?? null,
      record.project?.branch ?? null,
      record.project?.commit ?? null,
      record.createdAt,
      record.updatedAt,
      record.favorite ? 1 : 0,
      record.archivedAt ?? null,
      JSON.stringify(record.assumptions ?? []),
      JSON.stringify(record.missingInformation ?? []),
      JSON.stringify(record.validationSteps ?? []),
    );

  const insertTag = database.prepare(
    "INSERT INTO tags (prompt_id, tag) VALUES (?, ?)",
  );
  for (const tag of record.tags) insertTag.run(record.id, tag);

  const insertAlias = database.prepare(
    "INSERT INTO aliases (prompt_id, alias) VALUES (?, ?)",
  );
  const insertSearchTerm = database.prepare(
    "INSERT INTO search_terms (prompt_id, term) VALUES (?, ?)",
  );
  for (const alias of record.aliases) insertAlias.run(record.id, alias);
  for (const term of record.searchTerms) insertSearchTerm.run(record.id, term);

  if (record.project) {
    database
      .prepare(
        `
          INSERT INTO projects (path, name, current_branch, current_commit)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(path) DO UPDATE SET
            name = excluded.name,
            current_branch = excluded.current_branch,
            current_commit = excluded.current_commit
        `,
      )
      .run(
        record.project.path,
        record.project.name,
        record.project.branch ?? null,
        record.project.commit ?? null,
      );
    database
      .prepare(
        "INSERT INTO prompt_projects (prompt_id, project_path) VALUES (?, ?)",
      )
      .run(record.id, record.project.path);
  }

  const insertSource = database.prepare(
    "INSERT INTO sources (prompt_id, title, url, retrieved_at, supports_json) VALUES (?, ?, ?, ?, ?)",
  );
  for (const source of record.sources ?? []) {
    insertSource.run(
      record.id,
      source.title,
      source.url ?? "",
      source.retrievedAt,
      JSON.stringify(source.supports ?? []),
    );
  }

  database
    .prepare(
      `
        INSERT INTO prompt_fts (
          id, title, summary, body, tags, aliases, search_terms, project, target,
          taxonomy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      record.id,
      record.title,
      record.summary,
      record.body,
      record.tags.join(" "),
      record.aliases.join(" "),
      record.searchTerms.join(" "),
      record.project
        ? `${record.project.name} ${record.project.path} ${record.project.branch ?? ""}`
        : "",
      record.target,
      [
        ...record.tags,
        ...(record.assumptions ?? []),
        ...(record.missingInformation ?? []),
        ...(record.validationSteps ?? []),
        ...(record.sources ?? []).flatMap((source) => [
          source.title,
          ...(source.supports ?? []),
        ]),
        ...Object.values(record.taxonomy ?? {}).flat(),
      ].join(" "),
    );
}

function insertVersion(
  database: DatabaseSync,
  promptId: string,
  version: PromptRecord,
): void {
  const metadata: Record<string, unknown> = { ...version };
  delete metadata.body;
  delete metadata.filePath;
  database
    .prepare(
      `
        INSERT OR REPLACE INTO versions (
          prompt_id, version_path, updated_at, title, summary, body, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      promptId,
      version.filePath,
      version.updatedAt,
      version.title,
      version.summary,
      version.body,
      JSON.stringify(metadata),
    );
}

function deleteRecord(database: DatabaseSync, id: string): void {
  database.prepare("DELETE FROM prompt_fts WHERE id = ?").run(id);
  database.prepare("DELETE FROM records WHERE id = ?").run(id);
}

function clearDerivedRecordMetadata(database: DatabaseSync, id: string): void {
  database.prepare("DELETE FROM prompt_fts WHERE id = ?").run(id);
  database.prepare("DELETE FROM tags WHERE prompt_id = ?").run(id);
  database.prepare("DELETE FROM aliases WHERE prompt_id = ?").run(id);
  database.prepare("DELETE FROM search_terms WHERE prompt_id = ?").run(id);
  database.prepare("DELETE FROM prompt_projects WHERE prompt_id = ?").run(id);
  database.prepare("DELETE FROM versions WHERE prompt_id = ?").run(id);
  database.prepare("DELETE FROM sources WHERE prompt_id = ?").run(id);
}

function setMetadata(
  database: DatabaseSync,
  fingerprint: string,
  updatedAt: string,
  rebuildReason: string,
): void {
  const upsert = database.prepare(
    `
      INSERT INTO metadata (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
  );
  if (fingerprint) upsert.run("library_fingerprint", fingerprint);
  upsert.run("last_updated", updatedAt);
  upsert.run("rebuild_reason", rebuildReason);
}

function metadataValue(database: DatabaseSync, key: string): string {
  return (
    (
      database.prepare("SELECT value FROM metadata WHERE key = ?").get(key) as
        | ValueRow
        | undefined
    )?.value ?? ""
  );
}

function openHealthyDatabase(path: string): DatabaseSync {
  const database = new DatabaseSync(path, { timeout: 5_000 });
  const schemaVersion = Number(
    database.prepare("PRAGMA user_version").get()?.user_version ?? 0,
  );
  if (schemaVersion !== SCHEMA_VERSION) {
    database.close();
    throw new Error("Search index is missing or has the wrong schema.");
  }
  return database;
}

function toFtsQuery(query: string): string {
  const tokens = query
    .normalize("NFKC")
    .split(/\s+/u)
    .map((token) => token.replaceAll('"', '""').trim())
    .filter(Boolean);
  if (tokens.length === 0)
    throw new Error("Search query has no searchable text.");
  return tokens.map((token) => `"${token}"*`).join(" AND ");
}

function explainMatch(row: SearchRow, query: string): string[] {
  if (!query) {
    return row.favorite ? ["favorite"] : ["recent"];
  }
  const needle = query.toLocaleLowerCase();
  const matches: string[] = [];
  if (row.title.toLocaleLowerCase().includes(needle)) matches.push("title");
  if ((row.tags ?? "").toLocaleLowerCase().includes(needle))
    matches.push("tag");
  if ((row.aliases ?? "").toLocaleLowerCase().includes(needle))
    matches.push("alias");
  if (
    `${row.project_name ?? ""} ${row.project_path ?? ""}`
      .toLocaleLowerCase()
      .includes(needle)
  ) {
    matches.push("project");
  }
  if ((row.search_terms ?? "").toLocaleLowerCase().includes(needle)) {
    matches.push("hidden search term");
  }
  if (row.summary.toLocaleLowerCase().includes(needle)) matches.push("summary");
  if (row.body.toLocaleLowerCase().includes(needle))
    matches.push("prompt body");
  if (row.target.toLocaleLowerCase().includes(needle)) matches.push("target");
  return matches.length > 0 ? matches : ["full text"];
}

function clampLimit(limit = 100): number {
  return Math.max(1, Math.min(500, Math.trunc(limit)));
}

function unhealthy(
  path: string,
  status: SearchIndexHealth["status"],
  message: string,
): SearchIndexHealth {
  return {
    path,
    status,
    recordCount: 0,
    needsRebuild: true,
    message,
  };
}

function errorCode(error: unknown): string | undefined {
  return isObject(error) && typeof error.code === "string"
    ? error.code
    : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
