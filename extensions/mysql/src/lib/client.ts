import mysql, { type FieldPacket } from "mysql2/promise";
import type { Connection } from "./connections";

/** Quotes a database/table/column identifier, escaping embedded backticks. */
export function escapeId(identifier: string): string {
  return "`" + identifier.replace(/`/g, "``") + "`";
}

export interface QueryResult {
  /** Rows for a SELECT/SHOW, or a result header (affectedRows, insertId, …) for a write. */
  rows: unknown;
  fields: FieldPacket[] | undefined;
  durationMs: number;
}

function sslOption(connection: Connection) {
  if (connection.ssl === "off") return undefined;
  if (connection.ssl === "insecure") return { rejectUnauthorized: false };
  return {}; // "require": validate the server certificate
}

async function connect(connection: Connection) {
  return mysql.createConnection({
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    database: connection.database || undefined,
    ssl: sslOption(connection),
    multipleStatements: false,
    connectTimeout: 15000,
    dateStrings: true,
  });
}

/**
 * Runs a single SQL statement and returns the rows/header plus timing.
 *
 * When `readOnly` is set, the statement runs inside a `READ ONLY` transaction. This is a
 * server-enforced backstop for the AI tool: statements it classified as read-only (and therefore
 * ran without confirmation) cannot modify data even through a stored function or trigger — MySQL
 * rejects the write with ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION instead of applying it silently.
 */
export async function runQuery(
  connection: Connection,
  sql: string,
  options: { readOnly?: boolean } = {},
): Promise<QueryResult> {
  const conn = await connect(connection);
  try {
    const start = Date.now();
    if (options.readOnly) {
      await conn.query("START TRANSACTION READ ONLY");
      try {
        const [rows, fields] = await conn.query(sql);
        await conn.query("COMMIT");
        return { rows, fields, durationMs: Date.now() - start };
      } catch (error) {
        await conn.query("ROLLBACK").catch(() => {});
        throw error;
      }
    }
    const [rows, fields] = await conn.query(sql);
    return { rows, fields, durationMs: Date.now() - start };
  } finally {
    await conn.end();
  }
}

/** Server version string, used to validate a connection. */
export async function serverVersion(connection: Connection): Promise<string> {
  const conn = await connect(connection);
  try {
    const [rows] = await conn.query("SELECT VERSION() AS version");
    const list = rows as { version?: string }[];
    return list[0]?.version ?? "";
  } finally {
    await conn.end();
  }
}

async function queryValues(connection: Connection, sql: string, column: string): Promise<string[]> {
  const { rows } = await runQuery(connection, sql);
  if (!Array.isArray(rows)) return [];
  return (rows as Record<string, unknown>[]).map((row) => String(row[column])).filter(Boolean);
}

export function listDatabases(connection: Connection): Promise<string[]> {
  return queryValues(connection, "SHOW DATABASES", "Database");
}

export function listTables(connection: Connection, database: string): Promise<string[]> {
  return queryValues(connection, `SHOW FULL TABLES FROM ${escapeId(database)}`, `Tables_in_${database}`);
}

export interface ColumnInfo {
  field: string;
  type: string;
  nullable: string;
  key: string;
  default: string | null;
  extra: string;
}

export async function listColumns(connection: Connection, database: string, table: string): Promise<ColumnInfo[]> {
  const { rows } = await runQuery(connection, `SHOW COLUMNS FROM ${escapeId(database)}.${escapeId(table)}`);
  if (!Array.isArray(rows)) return [];
  return (rows as Record<string, unknown>[]).map((row) => ({
    field: String(row.Field ?? ""),
    type: String(row.Type ?? ""),
    nullable: String(row.Null ?? ""),
    key: String(row.Key ?? ""),
    default: row.Default === null || row.Default === undefined ? null : String(row.Default),
    extra: String(row.Extra ?? ""),
  }));
}

async function queryWithParams(
  connection: Connection,
  sql: string,
  params: unknown[],
): Promise<Record<string, unknown>[]> {
  const conn = await connect(connection);
  try {
    const [rows] = await conn.query(sql, params);
    return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  } finally {
    await conn.end();
  }
}

/** The `CREATE TABLE`/`CREATE VIEW` statement for a table. */
export async function showCreateTable(connection: Connection, database: string, table: string): Promise<string> {
  const { rows } = await runQuery(connection, `SHOW CREATE TABLE ${escapeId(database)}.${escapeId(table)}`);
  const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  const row = list[0] ?? {};
  return String(row["Create Table"] ?? row["Create View"] ?? "");
}

export interface ForeignKey {
  constraint: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

/** Foreign keys where this table references another (outgoing) and where others reference it (incoming). */
export async function listForeignKeys(
  connection: Connection,
  database: string,
  table: string,
): Promise<{ outgoing: ForeignKey[]; incoming: ForeignKey[] }> {
  const outgoing = await queryWithParams(
    connection,
    `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`,
    [database, table],
  );
  const incoming = await queryWithParams(
    connection,
    `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE REFERENCED_TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME = ?
     ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`,
    [database, table],
  );
  const map = (row: Record<string, unknown>): ForeignKey => ({
    constraint: String(row.CONSTRAINT_NAME ?? ""),
    fromTable: String(row.TABLE_NAME ?? ""),
    fromColumn: String(row.COLUMN_NAME ?? ""),
    toTable: String(row.REFERENCED_TABLE_NAME ?? ""),
    toColumn: String(row.REFERENCED_COLUMN_NAME ?? ""),
  });
  return { outgoing: outgoing.map(map), incoming: incoming.map(map) };
}
