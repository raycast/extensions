import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidv6 } from "../lib/utils/uuid-v6";
import { relations } from "drizzle-orm";
import { SnippetLabelModel } from "./snippet-label";

export const LabelModel = sqliteTable("label_tab", {
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

  // #ffffff
  colorHex: text("color_hex", { length: 7 })
    .notNull()
    .$defaultFn(() => {
      // from 127 to 254
      const getRGB = () => (Math.floor(Math.random() * 127) + 127).toString(16);
      return ["#", getRGB(), getRGB(), getRGB()].join("");
    }),
  title: text("title").notNull().unique(),
});

export const LabelModelRelations = relations(LabelModel, ({ many }) => ({
  labelsToSnippets: many(SnippetLabelModel),
}));
