export type EntryKind =
  | "class"
  | "interface"
  | "enum"
  | "annotation"
  | "exception"
  | "record"
  | "event"
  | "method"
  | "field"
  | "constant"
  | "initializer"
  | "package"
  | "guide";

export type SectionId =
  "core" | "events" | "interactions" | "requests" | "audio" | "utils" | "guide";

export interface DocEntry {
  name: string;
  display: string;
  pkg: string;
  owner: string;
  kind: EntryKind;
  section: SectionId;
  page: string;
  anchor: string;
  url: string;
}

export interface EntryMeta {
  queue?: boolean;
  returns?: string;
  intents?: string[];
  permissions?: string[];
  deprecated?: boolean;
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
  { id: "interactions", title: "Interactions" },
  { id: "requests", title: "Requests" },
  { id: "audio", title: "Audio" },
  { id: "utils", title: "Utilities" },
  { id: "guide", title: "Guides" },
];

export const KIND_LABELS: Record<EntryKind, string> = {
  class: "Class",
  interface: "Interface",
  enum: "Enum",
  annotation: "Annotation",
  exception: "Exception",
  record: "Record",
  event: "Event",
  method: "Method",
  field: "Field",
  constant: "Constant",
  initializer: "Constructor",
  package: "Package",
  guide: "Guide",
};

export function isType(kind: EntryKind): boolean {
  return (
    kind === "class" ||
    kind === "interface" ||
    kind === "enum" ||
    kind === "annotation" ||
    kind === "exception" ||
    kind === "record" ||
    kind === "event"
  );
}
