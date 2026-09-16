import { EntryKind, SectionId } from "./types";

export interface ParsedQuery {
  text: string;
  kind?: EntryKind;
  section?: SectionId;
  intent?: string;
  module?: string;
  faqOnly: boolean;
}

const KINDS: EntryKind[] = [
  "class",
  "method",
  "attribute",
  "property",
  "function",
  "event",
  "exception",
  "data",
  "guide",
];

const SECTION_ALIASES: Record<string, SectionId> = {
  core: "core",
  api: "core",
  events: "events",
  event: "events",
  app_commands: "app_commands",
  app: "app_commands",
  slash: "app_commands",
  commands: "commands",
  ext: "commands",
  tasks: "tasks",
  guide: "guide",
  guides: "guide",
};

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
      const kind = KINDS.find((candidate) => candidate === lower.slice(1));
      if (kind) {
        parsed.kind = kind;
        continue;
      }
    }

    const separator = lower.indexOf(":");
    if (separator > 0) {
      const field = lower.slice(0, separator);
      const value = lower.slice(separator + 1);

      if (field === "kind" && KINDS.includes(value as EntryKind)) {
        parsed.kind = value as EntryKind;
        continue;
      }
      if (field === "section" && SECTION_ALIASES[value]) {
        parsed.section = SECTION_ALIASES[value];
        continue;
      }
      if (field === "intent") {
        parsed.intent = value;
        continue;
      }
      if (field === "module") {
        parsed.module = value;
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
  if (parsed.intent) parts.push(`intent: ${parsed.intent}`);
  if (parsed.module) parts.push(`module: ${parsed.module}`);
  return parts.length ? parts.join(" · ") : undefined;
}
