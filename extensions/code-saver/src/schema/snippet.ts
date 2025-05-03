import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidv6 } from "../lib/utils/uuid-v6";
import { relations } from "drizzle-orm";
import { SnippetLabelModel } from "./snippet-label";
import { LibraryModel } from "./library";
import { SnippetMarkdownFormatTypeEnumArray } from "../lib/constants/db-name";

export const SnippetModel = sqliteTable("snippet_tab", {
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

  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  content: text("content").notNull().default(""),
  formatType: text("format_type", { enum: SnippetMarkdownFormatTypeEnumArray }).notNull().default("freestyle"),

  libraryId: integer("library_id").notNull(),
});

export const SnippetModelRelations = relations(SnippetModel, ({ many, one }) => ({
  snippetsToLabels: many(SnippetLabelModel),
  library: one(LibraryModel, { fields: [SnippetModel.libraryId], references: [LibraryModel.id] }),
}));
