import { Pool, PoolClient, QueryResult as PgQueryResult } from "pg";
import { QueryResult } from "./types";

let currentPool: Pool | null = null;
let currentConnectionString: string | null = null;

function getPool(connectionString: string): Pool {
  if (currentPool && currentConnectionString === connectionString) {
    return currentPool;
  }

  if (currentPool) {
    currentPool.end().catch(console.error);
  }

  currentPool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  currentConnectionString = connectionString;

  return currentPool;
}

export async function testConnection(connectionString: string): Promise<{ success: boolean; error?: string }> {
  try {
    const pool = new Pool({ connectionString, max: 1 });
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    await pool.end();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function executeQuery(
  connectionString: string,
  query: string,
  isReadonly = false,
  params?: unknown[],
): Promise<QueryResult> {
  const pool = getPool(connectionString);
  const startTime = Date.now();
  let client: PoolClient | null = null;

  try {
    client = await pool.connect();

    if (isReadonly) await client.query("BEGIN READ ONLY");
    const result: PgQueryResult = params ? await client.query(query, params) : await client.query(query);
    if (isReadonly) await client.query("COMMIT");

    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      fields: result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    if (client && isReadonly) {
      await client.query("ROLLBACK").catch(() => {});
    }
    throw error;
  } finally {
    client?.release();
  }
}

async function closePool(): Promise<void> {
  if (currentPool) {
    await currentPool.end();
    currentPool = null;
    currentConnectionString = null;
  }
}

process.on("SIGINT", () => closePool().finally(() => process.exit(0)));
process.on("SIGTERM", () => closePool().finally(() => process.exit(0)));
