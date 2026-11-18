import { Client } from "pg";
import { getDatabase, updateDatabase } from "./databases";
import { writeSchemaCache, type SchemaCache, type TableCacheEntry } from "./cache";
import { parseConnectionConfig } from "./pg-config";
import { fetchSchemaData } from "./pg-schema";
import { buildSchemaDdl } from "./ddl-builder";
import { fetchMongoSchema } from "./mongo-schema";

function buildCacheFromDdls(
  tableDdls: Map<string, string>,
  tableTypes: Map<string, "table" | "view">,
): Record<string, TableCacheEntry> {
  const tables: Record<string, TableCacheEntry> = {};
  for (const [key, ddl] of tableDdls) {
    const [schema] = key.split(".");
    tables[key] = {
      ddl,
      schema: schema ?? undefined,
      type: tableTypes.get(key) ?? "table",
    };
  }
  return tables;
}

export async function syncDatabaseSchema(dbId: string): Promise<{ tableCount: number } | { error: string }> {
  const db = await getDatabase(dbId);
  if (!db?.connectionString?.trim()) {
    return { error: "No connection string set. Edit credentials in Manage Databases." };
  }

  if (db.type === "mongodb") {
    try {
      const { tableDdls, tableTypes } = await fetchMongoSchema(db.connectionString);
      const tables = buildCacheFromDdls(tableDdls, tableTypes);
      const cache: SchemaCache = { tables };
      writeSchemaCache(dbId, cache);
      const lastSyncedAt = new Date().toISOString();
      await updateDatabase(dbId, { lastSyncedAt });
      return { tableCount: Object.keys(tables).length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  }

  const client = new Client(parseConnectionConfig(db.connectionString));
  try {
    await client.connect();
    const data = await fetchSchemaData(client);
    const { tableDdls, tableTypes } = buildSchemaDdl(data);
    const tables = buildCacheFromDdls(tableDdls, tableTypes);
    const cache: SchemaCache = { tables };
    writeSchemaCache(dbId, cache);
    const lastSyncedAt = new Date().toISOString();
    await updateDatabase(dbId, { lastSyncedAt });
    return { tableCount: Object.keys(tables).length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
