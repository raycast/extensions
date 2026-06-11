import { promises as fs } from "fs";
import { withCache } from "@raycast/utils";
import { Connection } from "./types";
import { connectionsFilePath } from "./paths";

interface RawConnection {
  id?: string;
  name?: string;
  type?: string;
  host?: string;
  port?: number;
  color?: string;
  groupId?: string;
  database?: string;
  schema?: string;
}

const CONNECTIONS_CACHE_MAX_AGE_MS = 30_000;

function isENOENT(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "ENOENT"
  );
}

function normalize(raw: RawConnection): Connection | null {
  if (!raw.id || !raw.name || !raw.type) {
    return null;
  }
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    host: raw.host,
    port: raw.port,
    color: raw.color,
    groupId: raw.groupId,
    database: raw.database,
    schema: raw.schema,
  };
}

async function readConnectionsFromDisk(): Promise<Connection[]> {
  try {
    const raw = await fs.readFile(connectionsFilePath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const result: Connection[] = [];
    for (const item of parsed) {
      const conn = normalize(item as RawConnection);
      if (conn) {
        result.push(conn);
      }
    }
    return result;
  } catch (error) {
    if (isENOENT(error)) {
      return [];
    }
    throw error;
  }
}

export const loadConnections = withCache(readConnectionsFromDisk, {
  maxAge: CONNECTIONS_CACHE_MAX_AGE_MS,
});

export async function findConnection(
  idOrName: string,
): Promise<Connection | undefined> {
  const list = await loadConnections();
  const byId = list.find((c) => c.id === idOrName);
  if (byId) return byId;
  const lower = idOrName.toLowerCase();
  return list.find((c) => c.name.toLowerCase() === lower);
}

export function databaseTypeLabel(type: string): string {
  const known: Record<string, string> = {
    mysql: "MySQL",
    mariadb: "MariaDB",
    postgresql: "PostgreSQL",
    redshift: "Redshift",
    sqlite: "SQLite",
    clickhouse: "ClickHouse",
    redis: "Redis",
    mongodb: "MongoDB",
    oracle: "Oracle",
    duckdb: "DuckDB",
    mssql: "MS SQL",
    cassandra: "Cassandra",
    etcd: "etcd",
    cloudflareD1: "Cloudflare D1",
    dynamodb: "DynamoDB",
    bigquery: "BigQuery",
    libsql: "libSQL",
    csv: "CSV",
    json: "JSON",
  };
  return known[type] ?? type;
}
