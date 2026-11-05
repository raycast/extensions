import { DatabaseMigrationsFolder, getDatabase } from "../db";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { markAsInitialized } from "./tracking";

/** Applies pending Drizzle migrations to the existing session database. */
export function migrateDatabase() {
  migrate(getDatabase(), { migrationsFolder: DatabaseMigrationsFolder });
}

/** Initializes the database and applies pending migrations. */
export const ensureInitialized = async (): Promise<boolean> => {
  try {
    migrateDatabase();
    markAsInitialized();
    return true;
  } catch (error) {
    console.error("Failed to initialize extension:", error);
    return false;
  }
};
