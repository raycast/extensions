import type { Client } from "@notionhq/client";

export interface User {
  id: string;
  type: string;
  name: string | null;
  avatar_url: string | null;
}

export interface Database {
  id: string;
  last_edited_time: number;
  title: string | null;
  icon_emoji: string | null;
  icon_file: string | null;
  icon_external: string | null;
}

// Currently supported properties
export const supportedPropTypes = [
  "title",
  "number",
  "rich_text",
  "url",
  "email",
  "phone_number",
  "date",
  "checkbox",
  "select",
  "multi_select",
  "formula",
  "people",
  "relation",
];

// all possible types:
// "number" | "title" | "rich_text" | "url" | "email" | "phone_number" | "date" | "checkbox" | "select" | "formula" | "people" | "relation" | "multi_select" | "rollup" | "files" | "created_by" | "created_time" | "last_edited_by" | "last_edited_time"

export interface DatabaseProperty {
  id: string;
  type:
    | "number"
    | "title"
    | "rich_text"
    | "url"
    | "email"
    | "phone_number"
    | "date"
    | "checkbox"
    | "select"
    | "formula"
    | "people"
    | "relation"
    | "multi_select";
  name: string;
  options: DatabasePropertyOption[];
  relation_id?: string;
}

export interface DatabasePropertyOption {
  id?: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface Page {
  object: "page" | "database";
  id: string;
  parent_page_id?: string;
  parent_database_id?: string;
  last_edited_time?: number;
  title: string | null;
  icon_emoji: string | null;
  icon_file: string | null;
  icon_external: string | null;
  url?: string;
  properties: Record<string, PagePropertyType>;
}

export interface PageContent {
  markdown: string | undefined;
}

export interface DatabaseView {
  properties?: Record<string, any>;
  create_properties?: string[];
  sort_by?: Record<string, any>;
  type?: "kanban" | "list";
  name?: string | null;
  kanban?: KabanView;
}

export interface KabanView {
  property_id: string;
  backlog_ids: string[];
  not_started_ids: string[];
  started_ids: string[];
  completed_ids: string[];
  canceled_ids: string[];
}

export type UnwrapRecord<T> = T extends Record<never, infer U> ? U : never;
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : never;
export type UnwrapArray<T> = T extends Array<infer U> ? U : never;

export type NotionObject = UnwrapArray<UnwrapPromise<ReturnType<Client["search"]>>["results"]>;

type NotionProperties<T, TObject> = T extends { object: TObject; properties: infer U } ? U : never;
export type PagePropertyType = UnwrapRecord<NotionProperties<NotionObject, "page">>;
