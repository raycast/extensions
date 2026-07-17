import { integer, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { SnippetModel } from "./snippet";
import { LabelModel } from "./label";

export const SnippetLabelModel = sqliteTable(
  "snippet_label_tab",
  {
    snippetId: integer("snippet_id")
      .notNull()
      .references(() => SnippetModel.id),
    labelId: integer("label_id")
      .notNull()
      .references(() => LabelModel.id),
  },
  (t) => ({
    pk: primaryKey(t.snippetId, t.labelId),
  })
);

export const SnippetLabelModelRelations = relations(SnippetLabelModel, ({ one }) => ({
  label: one(LabelModel, {
    fields: [SnippetLabelModel.labelId],
    references: [LabelModel.id],
  }),
  snippet: one(SnippetModel, {
    fields: [SnippetLabelModel.snippetId],
    references: [SnippetModel.id],
  }),
}));
