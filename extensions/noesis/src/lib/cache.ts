import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  DashboardSnapshot,
  EngineSummary,
  MenuBarInsightSnapshot,
  RateLimitInfo,
  ReadingStat,
  ReadingSummary,
  RemoteSnapshot,
  ResourceTimestamps,
  UsageSnapshot,
  UserProfileSnapshot,
  WorkflowSummary,
} from "./types";

const SQLITE_BINARY = fs.existsSync("/usr/bin/sqlite3")
  ? "/usr/bin/sqlite3"
  : "sqlite3";
const SQLITE_MAX_BUFFER = 10 * 1024 * 1024;
const SQLITE_BUSY_TIMEOUT_MS = 5_000;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS health_snapshot (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  status TEXT NOT NULL,
  version TEXT NOT NULL,
  uptime_seconds INTEGER NOT NULL,
  engines_loaded INTEGER NOT NULL,
  workflows_loaded INTEGER NOT NULL,
  rate_limit_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS profile_snapshot (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  payload_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS usage_snapshot (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  payload_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS workflows (
  workflow_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  engine_count INTEGER NOT NULL,
  engine_ids_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS engines (
  engine_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  required_phase INTEGER NOT NULL,
  fetched_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS readings (
  reading_id TEXT PRIMARY KEY,
  engine_id TEXT NOT NULL,
  workflow_id TEXT,
  input_hash TEXT NOT NULL,
  witness_prompt TEXT,
  consciousness_level INTEGER NOT NULL,
  calculation_time_ms REAL,
  created_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS reading_stats (
  engine_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  fetched_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS menu_bar_insights (
  insight_kind TEXT PRIMARY KEY,
  engine_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  summary TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  refresh_after TEXT NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_engine ON readings(engine_id, created_at DESC);
`;

interface SqliteDatabase {
  exec(sql: string): void;
  get<T>(sql: string): T | undefined;
  all<T>(sql: string): T[];
}

export interface NoesisCacheOptions {
  readingHistoryLimit?: number;
}

export interface NoesisCacheRepository {
  readSnapshot(baseUrl: string, hasCredentials: boolean): DashboardSnapshot;
  readMenuBarInsights(): MenuBarInsightSnapshot[];
  saveRemoteSnapshot(snapshot: RemoteSnapshot): void;
  saveMenuBarInsights(insights: MenuBarInsightSnapshot[]): void;
  clearPersonalData(): void;
  clearAll(): void;
}

export function createNoesisCacheRepository(
  databasePath: string,
  options: NoesisCacheOptions = {},
): NoesisCacheRepository {
  ensureDatabaseDirectory(databasePath);
  const shouldBootstrap =
    !fs.existsSync(databasePath) || fs.statSync(databasePath).size === 0;
  const database = createSqliteDatabase(databasePath);
  if (shouldBootstrap) {
    initializeDatabase(database);
  } else {
    ensureSchema(database);
  }

  return {
    readSnapshot(baseUrl, hasCredentials) {
      return readSnapshot(database, baseUrl, hasCredentials);
    },
    readMenuBarInsights() {
      return readMenuBarInsights(database);
    },
    saveRemoteSnapshot(snapshot) {
      saveRemoteSnapshot(database, snapshot, options);
    },
    saveMenuBarInsights(insights) {
      saveMenuBarInsights(database, insights);
    },
    clearPersonalData() {
      clearPersonalData(database);
    },
    clearAll() {
      clearAll(database);
    },
  };
}

function createSqliteDatabase(databasePath: string): SqliteDatabase {
  const baseArgs = [
    "-cmd",
    `.timeout ${SQLITE_BUSY_TIMEOUT_MS}`,
    "-batch",
    "-bail",
  ];

  const run = (args: string[], sql: string): string => {
    const script = sql.endsWith("\n") ? sql : `${sql}\n`;
    return execFileSync(SQLITE_BINARY, args, {
      encoding: "utf8",
      input: script,
      maxBuffer: SQLITE_MAX_BUFFER,
    });
  };

  const exec = (sql: string): void => {
    run([...baseArgs, databasePath], sql);
  };

  const all = <T>(sql: string): T[] => {
    const output = run([...baseArgs, "-json", databasePath], sql).trim();
    if (output.length === 0) {
      return [];
    }

    return parseJson<T[]>(output);
  };

  return {
    exec,
    get<T>(sql: string): T | undefined {
      return all<T>(sql)[0];
    },
    all,
  };
}

function initializeDatabase(database: SqliteDatabase): void {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    ${SCHEMA}
  `);
}

function ensureSchema(database: SqliteDatabase): void {
  const hasMenuBarInsights = database.get<{ name: string }>(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'menu_bar_insights';
  `);

  if (!hasMenuBarInsights) {
    database.exec(SCHEMA);
  }
}

function readSnapshot(
  database: SqliteDatabase,
  baseUrl: string,
  hasCredentials: boolean,
): DashboardSnapshot {
  const healthRow = database.get<{
    status: string;
    version: string;
    uptime_seconds: number;
    engines_loaded: number;
    workflows_loaded: number;
    rate_limit_json: string;
    fetched_at: string;
  }>(`
    SELECT status, version, uptime_seconds, engines_loaded, workflows_loaded, rate_limit_json, fetched_at
    FROM health_snapshot
    WHERE singleton = 1;
  `);

  const profileRow = database.get<{
    payload_json: string;
    fetched_at: string;
  }>(`
    SELECT payload_json, fetched_at FROM profile_snapshot WHERE singleton = 1;
  `);

  const usageRow = database.get<{ payload_json: string; fetched_at: string }>(`
    SELECT payload_json, fetched_at FROM usage_snapshot WHERE singleton = 1;
  `);

  const workflows = database.all<{
    workflow_id: string;
    name: string;
    description: string;
    engine_count: number;
    engine_ids_json: string;
    fetched_at: string;
  }>(`
    SELECT workflow_id, name, description, engine_count, engine_ids_json, fetched_at
    FROM workflows
    ORDER BY name ASC;
  `);

  const engines = database.all<{
    engine_id: string;
    name: string;
    required_phase: number;
    fetched_at: string;
  }>(`
    SELECT engine_id, name, required_phase, fetched_at
    FROM engines
    ORDER BY required_phase ASC, name ASC;
  `);

  const readings = database.all<{
    reading_id: string;
    engine_id: string;
    workflow_id: string | null;
    input_hash: string;
    witness_prompt: string | null;
    consciousness_level: number;
    calculation_time_ms: number | null;
    created_at: string;
    payload_json: string;
    fetched_at: string;
  }>(`
    SELECT reading_id, engine_id, workflow_id, input_hash, witness_prompt, consciousness_level,
           calculation_time_ms, created_at, payload_json, fetched_at
    FROM readings
    ORDER BY created_at DESC
    LIMIT 25;
  `);

  const readingStats = database.all<{
    engine_id: string;
    count: number;
    fetched_at: string;
  }>(`
    SELECT engine_id, count, fetched_at FROM reading_stats ORDER BY count DESC, engine_id ASC;
  `);

  const timestamps = readTimestamps(database);
  const lastBaseUrl = readMetadata(database, "base_url") ?? baseUrl;
  const syncIssues = parseOptionalJson(
    readMetadata(database, "sync_issues_json"),
    [],
  ) as DashboardSnapshot["syncIssues"];

  const health =
    healthRow === undefined
      ? undefined
      : {
          status: healthRow.status,
          version: healthRow.version,
          uptimeSeconds: healthRow.uptime_seconds,
          enginesLoaded: healthRow.engines_loaded,
          workflowsLoaded: healthRow.workflows_loaded,
          fetchedAt: healthRow.fetched_at,
        };

  const profile = profileRow
    ? ({
        ...parseJson<UserProfileSnapshot>(profileRow.payload_json),
        fetchedAt: profileRow.fetched_at,
      } as UserProfileSnapshot)
    : undefined;

  const usage = usageRow
    ? ({
        ...parseJson<UsageSnapshot>(usageRow.payload_json),
        fetchedAt: usageRow.fetched_at,
      } as UsageSnapshot)
    : undefined;

  const workflowItems: WorkflowSummary[] = workflows.map((workflow) => ({
    id: workflow.workflow_id,
    name: workflow.name,
    description: workflow.description,
    engineCount: workflow.engine_count,
    engineIds: parseJson<string[]>(workflow.engine_ids_json),
    fetchedAt: workflow.fetched_at,
  }));

  const engineItems: EngineSummary[] = engines.map((engine) => ({
    id: engine.engine_id,
    name: engine.name,
    requiredPhase: engine.required_phase,
    fetchedAt: engine.fetched_at,
  }));

  const readingItems: ReadingSummary[] = readings.map((reading) => ({
    id: reading.reading_id,
    engineId: reading.engine_id,
    workflowId: reading.workflow_id ?? undefined,
    inputHash: reading.input_hash,
    witnessPrompt: reading.witness_prompt ?? undefined,
    consciousnessLevel: reading.consciousness_level,
    calculationTimeMs: reading.calculation_time_ms ?? undefined,
    createdAt: reading.created_at,
    payload: parseJson<Record<string, unknown>>(reading.payload_json),
    fetchedAt: reading.fetched_at,
  }));

  const readingStatItems: ReadingStat[] = readingStats.map((entry) => ({
    engineId: entry.engine_id,
    count: entry.count,
    fetchedAt: entry.fetched_at,
  }));

  const rateLimit = healthRow
    ? parseJson<RateLimitInfo>(healthRow.rate_limit_json)
    : {};
  const hasAnyData = Boolean(
    health ||
    profile ||
    workflowItems.length ||
    engineItems.length ||
    readingItems.length,
  );

  return {
    baseUrl: lastBaseUrl,
    hasCredentials,
    cacheState: hasAnyData ? "cached" : "empty",
    source: hasAnyData ? "cache" : "empty",
    health,
    profile,
    usage,
    workflows: workflowItems,
    engines: engineItems,
    readings: readingItems,
    readingStats: readingStatItems,
    rateLimit,
    timestamps,
    syncIssues,
  };
}

function readMenuBarInsights(
  database: SqliteDatabase,
): MenuBarInsightSnapshot[] {
  const rows = database.all<{
    insight_kind: MenuBarInsightSnapshot["kind"];
    engine_id: string;
    title: string;
    subtitle: string | null;
    summary: string;
    payload_json: string;
    fetched_at: string;
    refresh_after: string;
  }>(`
    SELECT insight_kind, engine_id, title, subtitle, summary, payload_json, fetched_at, refresh_after
    FROM menu_bar_insights
    ORDER BY insight_kind ASC;
  `);

  return rows.map((row) => ({
    kind: row.insight_kind,
    engineId: row.engine_id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    summary: row.summary,
    payload: parseJson<Record<string, unknown>>(row.payload_json),
    fetchedAt: row.fetched_at,
    refreshAfter: row.refresh_after,
  }));
}

function saveRemoteSnapshot(
  database: SqliteDatabase,
  snapshot: RemoteSnapshot,
  options: NoesisCacheOptions,
): void {
  const statements = ["BEGIN IMMEDIATE;"];
  const updatedAt = snapshot.fetchedAt;
  const readingHistoryLimit = Math.max(1, options.readingHistoryLimit ?? 50);

  statements.push(metadataUpsertSql("base_url", snapshot.baseUrl, updatedAt));
  statements.push(
    metadataUpsertSql("last_sync_at", snapshot.fetchedAt, updatedAt),
  );
  statements.push(
    metadataUpsertSql(
      "sync_issues_json",
      JSON.stringify(snapshot.syncIssues ?? []),
      updatedAt,
    ),
  );

  if (snapshot.health) {
    statements.push(`
      INSERT INTO health_snapshot (
        singleton, status, version, uptime_seconds, engines_loaded, workflows_loaded, rate_limit_json, fetched_at
      ) VALUES (
        1,
        ${sqlLiteral(snapshot.health.status)},
        ${sqlLiteral(snapshot.health.version)},
        ${sqlLiteral(snapshot.health.uptimeSeconds)},
        ${sqlLiteral(snapshot.health.enginesLoaded)},
        ${sqlLiteral(snapshot.health.workflowsLoaded)},
        ${sqlLiteral(JSON.stringify(snapshot.rateLimit ?? {}))},
        ${sqlLiteral(snapshot.health.fetchedAt)}
      )
      ON CONFLICT(singleton) DO UPDATE SET
        status = excluded.status,
        version = excluded.version,
        uptime_seconds = excluded.uptime_seconds,
        engines_loaded = excluded.engines_loaded,
        workflows_loaded = excluded.workflows_loaded,
        rate_limit_json = excluded.rate_limit_json,
        fetched_at = excluded.fetched_at;
    `);
    statements.push(
      metadataUpsertSql(
        "service_fetched_at",
        snapshot.health.fetchedAt,
        updatedAt,
      ),
    );
  }

  if (snapshot.profile) {
    statements.push(`
      INSERT INTO profile_snapshot (singleton, payload_json, fetched_at)
      VALUES (1, ${sqlLiteral(JSON.stringify(snapshot.profile))}, ${sqlLiteral(snapshot.profile.fetchedAt)})
      ON CONFLICT(singleton) DO UPDATE SET
        payload_json = excluded.payload_json,
        fetched_at = excluded.fetched_at;
    `);
    statements.push(
      metadataUpsertSql(
        "profile_fetched_at",
        snapshot.profile.fetchedAt,
        updatedAt,
      ),
    );
  }

  if (snapshot.usage) {
    statements.push(`
      INSERT INTO usage_snapshot (singleton, payload_json, fetched_at)
      VALUES (1, ${sqlLiteral(JSON.stringify(snapshot.usage))}, ${sqlLiteral(snapshot.usage.fetchedAt)})
      ON CONFLICT(singleton) DO UPDATE SET
        payload_json = excluded.payload_json,
        fetched_at = excluded.fetched_at;
    `);
    statements.push(
      metadataUpsertSql(
        "usage_fetched_at",
        snapshot.usage.fetchedAt,
        updatedAt,
      ),
    );
  }

  if (snapshot.workflows) {
    statements.push("DELETE FROM workflows;");
    for (const workflow of snapshot.workflows) {
      statements.push(`
        INSERT INTO workflows (workflow_id, name, description, engine_count, engine_ids_json, fetched_at)
        VALUES (
          ${sqlLiteral(workflow.id)},
          ${sqlLiteral(workflow.name)},
          ${sqlLiteral(workflow.description)},
          ${sqlLiteral(workflow.engineCount)},
          ${sqlLiteral(JSON.stringify(workflow.engineIds))},
          ${sqlLiteral(workflow.fetchedAt ?? snapshot.fetchedAt)}
        )
        ON CONFLICT(workflow_id) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          engine_count = excluded.engine_count,
          engine_ids_json = excluded.engine_ids_json,
          fetched_at = excluded.fetched_at;
      `);
    }

    statements.push(
      metadataUpsertSql(
        "catalog_fetched_at",
        snapshot.workflows[0]?.fetchedAt ?? snapshot.fetchedAt,
        updatedAt,
      ),
    );
  }

  if (snapshot.engines) {
    statements.push("DELETE FROM engines;");
    for (const engine of snapshot.engines) {
      statements.push(`
        INSERT INTO engines (engine_id, name, required_phase, fetched_at)
        VALUES (
          ${sqlLiteral(engine.id)},
          ${sqlLiteral(engine.name)},
          ${sqlLiteral(engine.requiredPhase)},
          ${sqlLiteral(engine.fetchedAt ?? snapshot.fetchedAt)}
        )
        ON CONFLICT(engine_id) DO UPDATE SET
          name = excluded.name,
          required_phase = excluded.required_phase,
          fetched_at = excluded.fetched_at;
      `);
    }

    statements.push(
      metadataUpsertSql(
        "catalog_fetched_at",
        snapshot.engines[0]?.fetchedAt ?? snapshot.fetchedAt,
        updatedAt,
      ),
    );
  }

  if (snapshot.readings) {
    for (const reading of snapshot.readings) {
      statements.push(`
        INSERT INTO readings (
          reading_id, engine_id, workflow_id, input_hash, witness_prompt, consciousness_level,
          calculation_time_ms, created_at, payload_json, fetched_at
        ) VALUES (
          ${sqlLiteral(reading.id)},
          ${sqlLiteral(reading.engineId)},
          ${sqlLiteral(reading.workflowId ?? null)},
          ${sqlLiteral(reading.inputHash)},
          ${sqlLiteral(reading.witnessPrompt ?? null)},
          ${sqlLiteral(reading.consciousnessLevel)},
          ${sqlLiteral(reading.calculationTimeMs ?? null)},
          ${sqlLiteral(reading.createdAt)},
          ${sqlLiteral(JSON.stringify(reading.payload))},
          ${sqlLiteral(reading.fetchedAt)}
        )
        ON CONFLICT(reading_id) DO UPDATE SET
          engine_id = excluded.engine_id,
          workflow_id = excluded.workflow_id,
          input_hash = excluded.input_hash,
          witness_prompt = excluded.witness_prompt,
          consciousness_level = excluded.consciousness_level,
          calculation_time_ms = excluded.calculation_time_ms,
          created_at = excluded.created_at,
          payload_json = excluded.payload_json,
          fetched_at = excluded.fetched_at;
      `);
    }

    statements.push(trimReadingsSql(readingHistoryLimit));
    statements.push(
      metadataUpsertSql(
        "readings_fetched_at",
        snapshot.readings[0]?.fetchedAt ?? snapshot.fetchedAt,
        updatedAt,
      ),
    );
  }

  if (snapshot.readingStats) {
    statements.push("DELETE FROM reading_stats;");
    for (const stat of snapshot.readingStats) {
      statements.push(`
        INSERT INTO reading_stats (engine_id, count, fetched_at)
        VALUES (
          ${sqlLiteral(stat.engineId)},
          ${sqlLiteral(stat.count)},
          ${sqlLiteral(stat.fetchedAt ?? snapshot.fetchedAt)}
        )
        ON CONFLICT(engine_id) DO UPDATE SET
          count = excluded.count,
          fetched_at = excluded.fetched_at;
      `);
    }

    statements.push(
      metadataUpsertSql(
        "readings_fetched_at",
        snapshot.readingStats[0]?.fetchedAt ?? snapshot.fetchedAt,
        updatedAt,
      ),
    );
  }

  statements.push("COMMIT;");
  database.exec(statements.join("\n"));
}

function saveMenuBarInsights(
  database: SqliteDatabase,
  insights: MenuBarInsightSnapshot[],
): void {
  if (insights.length === 0) {
    return;
  }

  const statements = ["BEGIN IMMEDIATE;"];

  for (const insight of insights) {
    statements.push(`
      INSERT INTO menu_bar_insights (
        insight_kind, engine_id, title, subtitle, summary, payload_json, fetched_at, refresh_after
      ) VALUES (
        ${sqlLiteral(insight.kind)},
        ${sqlLiteral(insight.engineId)},
        ${sqlLiteral(insight.title)},
        ${sqlLiteral(insight.subtitle ?? null)},
        ${sqlLiteral(insight.summary)},
        ${sqlLiteral(JSON.stringify(insight.payload))},
        ${sqlLiteral(insight.fetchedAt)},
        ${sqlLiteral(insight.refreshAfter)}
      )
      ON CONFLICT(insight_kind) DO UPDATE SET
        engine_id = excluded.engine_id,
        title = excluded.title,
        subtitle = excluded.subtitle,
        summary = excluded.summary,
        payload_json = excluded.payload_json,
        fetched_at = excluded.fetched_at,
        refresh_after = excluded.refresh_after;
    `);
  }

  statements.push("COMMIT;");
  database.exec(statements.join("\n"));
}

function clearAll(database: SqliteDatabase): void {
  database.exec(`
    DELETE FROM metadata;
    DELETE FROM health_snapshot;
    DELETE FROM profile_snapshot;
    DELETE FROM usage_snapshot;
    DELETE FROM workflows;
    DELETE FROM engines;
    DELETE FROM readings;
    DELETE FROM reading_stats;
    DELETE FROM menu_bar_insights;
  `);
}

function clearPersonalData(database: SqliteDatabase): void {
  database.exec(`
    DELETE FROM profile_snapshot;
    DELETE FROM usage_snapshot;
    DELETE FROM readings;
    DELETE FROM reading_stats;
    DELETE FROM menu_bar_insights;
    DELETE FROM metadata WHERE key IN (
      'profile_fetched_at',
      'usage_fetched_at',
      'readings_fetched_at',
      'sync_issues_json'
    );
  `);
}

function trimReadingsSql(maxRows: number): string {
  return `
    DELETE FROM readings
    WHERE reading_id NOT IN (
      SELECT reading_id FROM readings ORDER BY created_at DESC LIMIT ${sqlLiteral(maxRows)}
    );
  `;
}

function readTimestamps(database: SqliteDatabase): ResourceTimestamps {
  return {
    service: readMetadata(database, "service_fetched_at") ?? undefined,
    profile: readMetadata(database, "profile_fetched_at") ?? undefined,
    usage: readMetadata(database, "usage_fetched_at") ?? undefined,
    catalog: readMetadata(database, "catalog_fetched_at") ?? undefined,
    readings: readMetadata(database, "readings_fetched_at") ?? undefined,
    lastSyncAt: readMetadata(database, "last_sync_at") ?? undefined,
  };
}

function readMetadata(database: SqliteDatabase, key: string): string | null {
  const row = database.get<{ value: string }>(`
    SELECT value FROM metadata WHERE key = ${sqlLiteral(key)};
  `);
  return row?.value ?? null;
}

function metadataUpsertSql(
  key: string,
  value: string,
  updatedAt: string,
): string {
  return `
    INSERT INTO metadata (key, value, updated_at)
    VALUES (${sqlLiteral(key)}, ${sqlLiteral(value)}, ${sqlLiteral(updatedAt)})
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at;
  `;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function ensureDatabaseDirectory(databasePath: string): void {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function parseOptionalJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return parseJson<T>(value);
  } catch {
    return fallback;
  }
}
