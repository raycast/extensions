import { Client, type ClientConfig, type FieldDef } from "pg";
import type { Connection } from "./connections";
import { maxRows, statementTimeoutMs } from "./connections";

export type Row = Record<string, unknown>;

export interface QueryResult {
  /** The rows kept, capped at the Row Limit preference. */
  rows: Row[];
  fields: FieldDef[];
  /** The tag PostgreSQL returns, e.g. "SELECT", "UPDATE". */
  command: string;
  /** Rows affected for a write; `null` when the server reports none. */
  rowCount: number | null;
  /** How many rows the statement actually produced, before the Row Limit was applied. */
  totalRows: number;
  /** True when `rows` holds fewer rows than the statement produced. */
  truncated: boolean;
  durationMs: number;
}

function sslOption(connection: Connection): ClientConfig["ssl"] {
  if (connection.ssl === "off") return false;
  if (connection.ssl === "insecure") return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

async function connect(connection: Connection): Promise<Client> {
  const client = new Client({
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    database: connection.database,
    ssl: sslOption(connection),
    connectionTimeoutMillis: 15_000,
    // Server-side cap. Also set per transaction below, but this covers statements run outside one.
    statement_timeout: statementTimeoutMs(),
    application_name: "Raycast",
  });
  await client.connect();
  return client;
}

/**
 * Runs a single statement and returns its rows plus timing.
 *
 * With `readOnly`, the statement runs inside a `READ ONLY` transaction. That is the server-side
 * backstop behind {@link isReadOnly}: a statement the classifier waved through without asking the
 * user still cannot write, because PostgreSQL rejects the write with error 25006 instead of
 * applying it — including writes reached indirectly through a function or trigger.
 */
export async function runQuery(
  connection: Connection,
  sql: string,
  options: { readOnly?: boolean } = {},
): Promise<QueryResult> {
  const client = await connect(connection);
  const start = Date.now();
  try {
    if (options.readOnly) {
      await client.query("BEGIN TRANSACTION READ ONLY");
      try {
        const result = await client.query(sql);
        await client.query("COMMIT");
        return toResult(result, Date.now() - start);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      }
    }
    const result = await client.query(sql);
    return toResult(result, Date.now() - start);
  } finally {
    await client.end().catch(() => {});
  }
}

type PgResult = { rows?: unknown; fields?: FieldDef[]; command?: string; rowCount?: number | null };

function toResult(result: PgResult | PgResult[], durationMs: number): QueryResult {
  // A statement that produces several results (rare here, since multi-statement input is rejected
  // upstream) comes back as an array; the last one is what the user asked for.
  const last = Array.isArray(result) ? result[result.length - 1] : result;
  const all = Array.isArray(last?.rows) ? (last.rows as Row[]) : [];
  // The Row Limit preference caps what is carried onward: a `SELECT *` over a large table would
  // otherwise be rendered row by row into a Markdown table. The statement itself is not rewritten —
  // the server-side guard against a runaway query is the statement timeout, not this.
  const limit = maxRows();
  const truncated = all.length > limit;
  return {
    rows: truncated ? all.slice(0, limit) : all,
    fields: last?.fields ?? [],
    command: last?.command ?? "",
    rowCount: last?.rowCount ?? null,
    totalRows: all.length,
    truncated,
    durationMs,
  };
}

async function readRows(connection: Connection, sql: string, params: unknown[] = []): Promise<Row[]> {
  const client = await connect(connection);
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    const result = await client.query(sql, params);
    await client.query("COMMIT");
    return Array.isArray(result.rows) ? (result.rows as Row[]) : [];
  } finally {
    await client.end().catch(() => {});
  }
}

/** Server version string, used to validate a connection. */
export async function serverVersion(connection: Connection): Promise<string> {
  const rows = await readRows(connection, "SELECT version() AS version");
  return String(rows[0]?.version ?? "");
}

/**
 * Every database on the server. Used to explain an empty schema: connecting to the right server
 * but the wrong database looks identical to an empty one, and the fix is in this list.
 */
export async function listDatabases(connection: Connection): Promise<string[]> {
  const rows = await readRows(
    connection,
    `SELECT datname
       FROM pg_database
      WHERE NOT datistemplate
        AND has_database_privilege(datname, 'CONNECT')
      ORDER BY datname`,
  );
  return rows.map((row) => String(row.datname));
}

export async function listSchemas(connection: Connection): Promise<string[]> {
  const rows = await readRows(
    connection,
    `SELECT nspname
       FROM pg_namespace
      WHERE nspname NOT IN ('pg_catalog', 'information_schema')
        AND nspname NOT LIKE 'pg_toast%'
        AND nspname NOT LIKE 'pg_temp%'
      ORDER BY nspname`,
  );
  return rows.map((row) => String(row.nspname));
}

export interface TableInfo {
  schema: string;
  name: string;
  /** "table", "view", "materialized view", "foreign table", or "partitioned table". */
  kind: string;
  /** Planner estimate from pg_class.reltuples — cheap, but only as fresh as the last ANALYZE. */
  estimatedRows: number | null;
  /** Total on-disk size including indexes and TOAST, e.g. "12 MB". */
  size: string | null;
  comment: string | null;
}

const RELKIND = `CASE c.relkind
        WHEN 'r' THEN 'table'
        WHEN 'p' THEN 'partitioned table'
        WHEN 'v' THEN 'view'
        WHEN 'm' THEN 'materialized view'
        WHEN 'f' THEN 'foreign table'
        ELSE c.relkind::text
      END`;

function estimateOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function listTables(connection: Connection, schema?: string): Promise<TableInfo[]> {
  const rows = await readRows(
    connection,
    `SELECT n.nspname AS schema,
            c.relname AS name,
            ${RELKIND} AS kind,
            c.reltuples::bigint AS estimated_rows,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
            obj_description(c.oid, 'pg_class') AS comment
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND n.nspname NOT LIKE 'pg_toast%'
        AND ($1::text IS NULL OR n.nspname = $1)
      ORDER BY n.nspname, c.relname`,
    [schema ?? null],
  );
  return rows.map((row) => ({
    schema: String(row.schema),
    name: String(row.name),
    kind: String(row.kind),
    // pg_class.reltuples is -1 for a relation that has never been analyzed (and for most views),
    // which is "unknown", not a count. Showing it raw produced "~-1 rows" in the schema browser.
    estimatedRows: estimateOrNull(row.estimated_rows),
    size: row.size === null ? null : String(row.size),
    comment: row.comment === null ? null : String(row.comment),
  }));
}

export interface ColumnInfo {
  schema: string;
  table: string;
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  primaryKey: boolean;
  comment: string | null;
}

export async function listColumns(connection: Connection, schema?: string, table?: string): Promise<ColumnInfo[]> {
  const rows = await readRows(
    connection,
    `SELECT n.nspname AS schema,
            c.relname AS "table",
            a.attname AS name,
            format_type(a.atttypid, a.atttypmod) AS type,
            NOT a.attnotnull AS nullable,
            pg_get_expr(d.adbin, d.adrelid) AS "default",
            COALESCE(pk.is_pk, false) AS primary_key,
            col_description(c.oid, a.attnum) AS comment
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
       LEFT JOIN LATERAL (
              SELECT true AS is_pk
                FROM pg_constraint pc
               WHERE pc.conrelid = c.oid AND pc.contype = 'p' AND a.attnum = ANY (pc.conkey)
            ) pk ON true
      WHERE a.attnum > 0
        AND NOT a.attisdropped
        AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND ($1::text IS NULL OR n.nspname = $1)
        AND ($2::text IS NULL OR c.relname = $2)
      ORDER BY n.nspname, c.relname, a.attnum`,
    [schema ?? null, table ?? null],
  );
  return rows.map((row) => ({
    schema: String(row.schema),
    table: String(row.table),
    name: String(row.name),
    type: String(row.type),
    nullable: Boolean(row.nullable),
    default: row.default === null ? null : String(row.default),
    primaryKey: Boolean(row.primary_key),
    comment: row.comment === null ? null : String(row.comment),
  }));
}

export interface IndexInfo {
  schema: string;
  table: string;
  name: string;
  definition: string;
  isUnique: boolean;
  isPrimary: boolean;
  size: string | null;
  /** Times the planner has chosen this index; 0 is a hint that it may be dead weight. */
  scans: number | null;
}

export async function listIndexes(connection: Connection, schema?: string, table?: string): Promise<IndexInfo[]> {
  const rows = await readRows(
    connection,
    `SELECT n.nspname AS schema,
            t.relname AS "table",
            i.relname AS name,
            pg_get_indexdef(x.indexrelid) AS definition,
            x.indisunique AS is_unique,
            x.indisprimary AS is_primary,
            pg_size_pretty(pg_relation_size(i.oid)) AS size,
            s.idx_scan AS scans
       FROM pg_index x
       JOIN pg_class i ON i.oid = x.indexrelid
       JOIN pg_class t ON t.oid = x.indrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = i.oid
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        -- Every TOAST table carries its own index; without this the list is mostly noise.
        AND n.nspname NOT LIKE 'pg_toast%'
        AND t.relkind IN ('r', 'p', 'm')
        AND ($1::text IS NULL OR n.nspname = $1)
        AND ($2::text IS NULL OR t.relname = $2)
      ORDER BY n.nspname, t.relname, i.relname`,
    [schema ?? null, table ?? null],
  );
  return rows.map((row) => ({
    schema: String(row.schema),
    table: String(row.table),
    name: String(row.name),
    definition: String(row.definition),
    isUnique: Boolean(row.is_unique),
    isPrimary: Boolean(row.is_primary),
    size: row.size === null ? null : String(row.size),
    scans: row.scans === null || row.scans === undefined ? null : Number(row.scans),
  }));
}

export interface ForeignKey {
  constraint: string;
  fromSchema: string;
  fromTable: string;
  toSchema: string;
  toTable: string;
  definition: string;
}

/** Foreign keys this table declares (outgoing) and those pointing at it (incoming). */
export async function listForeignKeys(
  connection: Connection,
  schema?: string,
  table?: string,
): Promise<{ outgoing: ForeignKey[]; incoming: ForeignKey[] }> {
  const rows = await readRows(
    connection,
    `SELECT c.conname AS constraint,
            sn.nspname AS from_schema,
            s.relname AS from_table,
            tn.nspname AS to_schema,
            t.relname AS to_table,
            pg_get_constraintdef(c.oid) AS definition
       FROM pg_constraint c
       JOIN pg_class s ON s.oid = c.conrelid
       JOIN pg_namespace sn ON sn.oid = s.relnamespace
       JOIN pg_class t ON t.oid = c.confrelid
       JOIN pg_namespace tn ON tn.oid = t.relnamespace
      WHERE c.contype = 'f'
        AND (($1::text IS NULL OR sn.nspname = $1) AND ($2::text IS NULL OR s.relname = $2)
             OR ($1::text IS NULL OR tn.nspname = $1) AND ($2::text IS NULL OR t.relname = $2))
      ORDER BY c.conname`,
    [schema ?? null, table ?? null],
  );
  const map = (row: Row): ForeignKey => ({
    constraint: String(row.constraint),
    fromSchema: String(row.from_schema),
    fromTable: String(row.from_table),
    toSchema: String(row.to_schema),
    toTable: String(row.to_table),
    definition: String(row.definition),
  });
  const all = rows.map(map);
  if (!table) return { outgoing: all, incoming: [] };
  return {
    outgoing: all.filter((fk) => fk.fromTable === table && (!schema || fk.fromSchema === schema)),
    incoming: all.filter((fk) => fk.toTable === table && (!schema || fk.toSchema === schema)),
  };
}

export interface SlowQuery {
  query: string;
  calls: number;
  totalExecMs: number;
  meanExecMs: number;
  rows: number;
  /** Share of buffer reads served from shared buffers; low values mean the query hits disk. */
  cacheHitRatio: number | null;
}

/** Raised when pg_stat_statements is not installed, so callers can say so instead of retrying. */
export class MissingExtensionError extends Error {}

export async function findSlowQueries(
  connection: Connection,
  options: { limit?: number; orderBy?: "total" | "mean" } = {},
): Promise<SlowQuery[]> {
  const installed = await readRows(connection, `SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'`);
  if (installed.length === 0) {
    throw new MissingExtensionError(
      "The pg_stat_statements extension is not installed on this database. Install it with `CREATE EXTENSION pg_stat_statements;` (it also has to be listed in shared_preload_libraries).",
    );
  }

  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const order = options.orderBy === "mean" ? "mean_exec_time" : "total_exec_time";
  const rows = await readRows(
    connection,
    `SELECT query,
            calls,
            total_exec_time AS total_exec_ms,
            mean_exec_time AS mean_exec_ms,
            rows,
            CASE WHEN shared_blks_hit + shared_blks_read = 0 THEN NULL
                 ELSE shared_blks_hit::float / (shared_blks_hit + shared_blks_read)
            END AS cache_hit_ratio
       FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY ${order} DESC
      LIMIT $1`,
    [limit],
  );
  return rows.map((row) => ({
    query: String(row.query).replace(/\s+/g, " ").trim(),
    calls: Number(row.calls),
    totalExecMs: Math.round(Number(row.total_exec_ms)),
    meanExecMs: Math.round(Number(row.mean_exec_ms) * 100) / 100,
    rows: Number(row.rows),
    cacheHitRatio: row.cache_hit_ratio === null ? null : Math.round(Number(row.cache_hit_ratio) * 1000) / 1000,
  }));
}
