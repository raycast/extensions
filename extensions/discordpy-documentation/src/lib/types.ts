export type EntryKind =
  | "class"
  | "method"
  | "attribute"
  | "property"
  | "function"
  | "event"
  | "exception"
  | "data"
  | "guide";

export type SectionId =
  "core" | "events" | "app_commands" | "commands" | "tasks" | "guide";

export interface DocEntry {
  name: string;
  display: string;
  module: string;
  kind: EntryKind;
  section: SectionId;
  page: string;
  anchor: string;
  url: string;
}

export interface EntryMeta {
  coroutine?: boolean;
  intents?: string[];
}

export type MetaIndex = Record<string, EntryMeta>;

export interface Inventory {
  version: string;
  fetchedAt: number;
  entries: DocEntry[];
}

export const SECTIONS: { id: SectionId | "all"; title: string }[] = [
  { id: "all", title: "All" },
  { id: "core", title: "Core API" },
  { id: "events", title: "Events" },
  { id: "app_commands", title: "App Commands" },
  { id: "commands", title: "ext.commands" },
  { id: "tasks", title: "ext.tasks" },
  { id: "guide", title: "Guides" },
];

export const KIND_LABELS: Record<EntryKind, string> = {
  class: "Class",
  method: "Method",
  attribute: "Attribute",
  property: "Property",
  function: "Function",
  event: "Event",
  exception: "Exception",
  data: "Data",
  guide: "Guide",
};
