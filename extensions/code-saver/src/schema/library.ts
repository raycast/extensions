import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidv6 } from "../lib/utils/uuid-v6";
import { relations } from "drizzle-orm";
import { SnippetModel } from "./snippet";

// library is the collection of snippets
export const LibraryModel = sqliteTable("library_tab", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  uuid: text("uuid")
    .unique()
    .notNull()
    .$defaultFn(() => uuidv6()),
  createAt: integer("create_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()), // Date
  updateAt: integer("update_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()), // Date

  name: text("name").notNull().unique(),
});

export const LibraryModelRelations = relations(LibraryModel, ({ many }) => ({
  snippets: many(SnippetModel),
}));
