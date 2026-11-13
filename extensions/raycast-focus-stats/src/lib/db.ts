import { environment } from "@raycast/api";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";

export const DatabaseMigrationsFolder = resolve(environment.assetsPath, "drizzle");
export const DatabasePath = resolve(environment.supportPath, "sessions.db");

let database: ReturnType<typeof drizzle> | undefined;

/** Opens the existing session database, reusing one connection per command worker. */
export function getDatabase() {
  if (!database) {
    const client = new DatabaseSync(DatabasePath);
    // Preserve better-sqlite3's five-second wait when another command holds a write lock.
    client.exec("PRAGMA busy_timeout = 5000");
    database = drizzle({ client });
  }
  return database;
}
