import { sqliteTable } from "drizzle-orm/sqlite-core";
import { int, text } from "drizzle-orm/sqlite-core";

export const sessionsTable = sqliteTable("sessions", {
  id: int().primaryKey({ autoIncrement: true }),
  goal: text().notNull(),
  duration: int().notNull(),
  timestamp: int().notNull(),
});
