import { int, text, sqliteTable } from "drizzle-orm/sqlite-core";

export const sessionsTable = sqliteTable("sessions", {
  id: int().primaryKey({ autoIncrement: true }),
  goal: text().notNull(),
  /** Duration in minutes */
  duration: int().notNull(),
  timestamp: int().notNull(),
});
