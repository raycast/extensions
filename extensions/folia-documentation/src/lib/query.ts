import { EntryKind, SectionId } from "./types";

export interface ParsedQuery {
  text: string;
  kind?: EntryKind;
  section?: SectionId;
  pkg?: string;
  faqOnly: boolean;
}

const KINDS: EntryKind[] = [
  "class",
  "interface",
  "enum",
  "annotation",
  "exception",
  "record",
  "event",
  "method",
  "field",
  "constant",
  "initializer",
  "package",
  "guide",
];

// A plain object literal would inherit Object.prototype.constructor, so an
// alias table keyed by "constructor" has to be a Map.
const KIND_ALIASES = new Map<string, EntryKind>([
  ["constructor", "initializer"],
  ["ctor", "initializer"],
  ["type", "class"],
]);

const SECTION_ALIASES: Record<string, SectionId> = {
  scheduler: "scheduler",
  region: "scheduler",
  async: "scheduler",
  events: "events",
  event: "events",
  entities: "entities",
  entity: "entities",
  inventory: "inventory",
  core: "core",
  bukkit: "core",
  paper: "paper",
  utils: "utils",
  util: "utils",
  guide: "guide",
  guides: "guide",
};

function resolveKind(value: string): EntryKind | undefined {
  return KINDS.find((kind) => kind === value) ?? KIND_ALIASES.get(value);
}

export function parseQuery(raw: string): ParsedQuery {
  const parsed: ParsedQuery = { text: "", faqOnly: false };
  const words: string[] = [];

  for (const token of raw.trim().split(/\s+/).filter(Boolean)) {
    const lower = token.toLowerCase();

    if (lower === "faq:" || lower === "faq:*") {
      parsed.faqOnly = true;
      continue;
    }
    if (lower.startsWith("@")) {
      const kind = resolveKind(lower.slice(1));
      if (kind) {
        parsed.kind = kind;
        continue;
      }
    }

    const separator = lower.indexOf(":");
    if (separator > 0) {
      const field = lower.slice(0, separator);
      const value = lower.slice(separator + 1);

      const kind = field === "kind" ? resolveKind(value) : undefined;
      if (kind) {
        parsed.kind = kind;
        continue;
      }
      if (field === "section" && SECTION_ALIASES[value]) {
        parsed.section = SECTION_ALIASES[value];
        continue;
      }
      if (field === "package" || field === "pkg") {
        parsed.pkg = value;
        continue;
      }
      if (field === "faq") {
        parsed.faqOnly = true;
        if (value) words.push(value);
        continue;
      }
    }

    words.push(token);
  }

  parsed.text = words.join(" ");
  return parsed;
}

export function describeFilters(parsed: ParsedQuery): string | undefined {
  const parts: string[] = [];
  if (parsed.faqOnly) parts.push("FAQ");
  if (parsed.kind) parts.push(`kind: ${parsed.kind}`);
  if (parsed.section) parts.push(`section: ${parsed.section}`);
  if (parsed.pkg) parts.push(`package: ${parsed.pkg}`);
  return parts.length ? parts.join(" · ") : undefined;
}
