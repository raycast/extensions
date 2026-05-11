import { int, text, unique, sqliteTable } from "drizzle-orm/sqlite-core";

export const sessionsTable = sqliteTable(
  "sessions",
  {
    id: int().primaryKey({ autoIncrement: true }),
    goal: text().notNull(),
    /** Duration in minutes */
    duration: int().notNull(),
    timestamp: int().notNull().unique(),
  },
  // Prevent duplicate sessions for the same goal and timestamp.
  (table) => [unique().on(table.goal, table.timestamp)],
);
