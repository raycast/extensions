/**
 * Reading what `mash memory` answers: the decisions, preferences and notes Mash
 * remembers, each at its current revision, with the quotes that support
 * it. Plain data in and out, so it is tested without Raycast.
 */
import { AGENTS, agentName, MashError, rendered } from "./mash";

export type MemoryKind = "decision" | "preference" | "note";

/** Where a record applies: one of Mash's scope kinds; anything else reads as personal. */
export type ScopeKind = "repository" | "local_project" | "chat" | "personal";

/** One remembered record at its current revision. */
export interface Memory {
  readonly id: string;
  readonly kind: MemoryKind;
  readonly statement: string;
  readonly rationale: string;
  /** When a preference applies, in the words it was recorded with. */
  readonly conditions: readonly string[];
  /** Where the record applies, short enough for a section title. */
  readonly scope: string;
  /** What kind of place `scope` names, so it can be shown with its icon. */
  readonly scopeKind: ScopeKind;
  /** The machine it was recorded on, when read from the shared index. */
  readonly machine?: string;
  /** Who recorded it, as the recording agent named itself; not authenticated. */
  readonly recordedBy: string;
  /** Not yet confirmed by the person: proposed by an agent from a chat. */
  readonly candidate: boolean;
  readonly recordedAt: Date | undefined;
  readonly evidence: readonly Evidence[];
}

/** A quote from a chat that supports a record. */
interface Evidence {
  readonly chatId: string;
  readonly messageId: string;
  readonly quote: string;
  /** Who said it: `user` or `assistant`. */
  readonly role: string;
}

/** The most records one page holds; Mash lists at most 100 at a time. */
const RECORD_PAGE = 100;

/**
 * Where a page of records starts: an offset among this machine's records, or
 * a cursor through every machine's, which the shared index lists a machine at
 * a time.
 */
export type RecordPage =
  { readonly shared: false; readonly offset: number } | { readonly shared: true; readonly cursor?: string };

/** The arguments that list one page of current records, newest first. */
export function recordsArguments(page: RecordPage): string[] {
  const asked = ["memory", "--limit", String(RECORD_PAGE)];
  if (!page.shared) return [...asked, "--offset", String(page.offset)];
  return page.cursor ? [...asked, "--shared", "--cursor", page.cursor] : [...asked, "--shared"];
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const object = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

/**
 * One page of `mash memory`: its records and where the next page starts, as
 * an offset on this machine or, from the shared index, a cursor (which can
 * follow a page with no records, when a machine has none).
 */
export function parseRecords(stdout: string): { memories: Memory[]; next: number | null; cursor: string | null } {
  let body: Record<string, unknown>;
  try {
    body = object(JSON.parse(stdout));
  } catch {
    throw new MashError("Mash gave an answer this extension could not read. Is Mash up to date?");
  }
  const error = object(body.error);
  if (body.error) throw new MashError(text(error.message) || "Mash couldn’t list what it remembers.");
  const records = Array.isArray(body.records) ? body.records : [];
  return {
    memories: records.flatMap((record) => memory(object(record))),
    next: typeof body.next_offset === "number" ? body.next_offset : null,
    cursor: nextCursor(object(body.next_cursor)),
  };
}

function nextCursor(cursor: Record<string, unknown>): string | null {
  const node = text(cursor.node_id);
  return node && typeof cursor.offset === "number" ? `${node}:${cursor.offset}` : null;
}

function memory(record: Record<string, unknown>): Memory[] {
  const revisions = Array.isArray(record.revisions) ? record.revisions.map(object) : [];
  const current = revisions.find((revision) => revision.revision === record.current_revision) ?? revisions[0];
  if (!current) return [];
  const body = object(current.body);
  const details = object(body.details);
  const kind = text(details.kind);
  const statement = text(body.statement).trim();
  if (!statement || (kind !== "decision" && kind !== "preference" && kind !== "note")) return [];
  return [
    {
      id: text(record.id),
      kind,
      statement,
      rationale: text(body.rationale).trim(),
      conditions: Array.isArray(details.conditions) ? details.conditions.map(text).filter(Boolean) : [],
      scope: scopeLabel(object(record.scope)),
      scopeKind: scopeKind(object(record.scope)),
      ...(text(record.node_id) ? { machine: text(record.node_id) } : {}),
      recordedBy: text(body.recorded_by).trim(),
      candidate: text(body.review) === "candidate",
      recordedAt: typeof current.recorded_at === "number" ? new Date(current.recorded_at) : undefined,
      evidence: (Array.isArray(current.evidence) ? current.evidence.map(object) : [])
        .map((entry) => ({
          chatId: text(entry.chat_id),
          messageId: text(entry.message_id),
          quote: text(entry.quote).trim(),
          role: text(entry.source_role),
        }))
        .filter((entry) => entry.chatId && entry.messageId),
    },
  ];
}

/** The kind of place a record applies to, as `scopeLabel` reads it. */
export function scopeKind(scope: Record<string, unknown>): ScopeKind {
  const kind = scope.kind;
  return kind === "repository" || kind === "local_project" || kind === "chat" ? kind : "personal";
}

/**
 * Where a record applies, as a reader names it: a repository by its owner and
 * name, a project by its folder, and personal records as such.
 */
export function scopeLabel(scope: Record<string, unknown>): string {
  switch (scope.kind) {
    case "repository": {
      const identity = text(scope.identity).replace(/\.git$/, "");
      const parts = identity.split(/[/:]/).filter(Boolean);
      return parts.length >= 2 ? parts.slice(-2).join("/") : identity || "A repository";
    }
    case "local_project": {
      const path = text(scope.path).replace(/\/+$/, "");
      return path.split("/").pop() || "A project";
    }
    case "chat":
      return "One chat";
    default:
      return "Personal";
  }
}

/**
 * The record as Markdown for the detail pane: what, why, when it applies, and
 * the quotes behind it. Records are drawn from chats, which are untrusted, so
 * every part is rendered safely.
 */
export function memoryMarkdown(memory: Memory): string {
  const parts = [`## ${rendered(memory.statement).replace(/\n+/g, " ")}`];
  if (memory.rationale) parts.push(`**Why:** ${rendered(memory.rationale)}`);
  if (memory.conditions.length)
    parts.push(`**Applies when:**\n\n${memory.conditions.map((condition) => `- ${rendered(condition)}`).join("\n")}`);
  const quotes = memory.evidence
    .filter((entry) => entry.quote)
    .map((entry) => {
      const who = entry.role === "user" ? "you" : "the agent";
      return `${rendered(entry.quote)
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n>\n> — ${who}`;
    });
  if (quotes.length) parts.push(`**From the chat:**\n\n${quotes.join("\n\n")}`);
  return parts.join("\n\n");
}

/**
 * The agent a record names as its recorder, when the name is exactly one of
 * Mash's agent IDs or display names (ignoring case). An agent names itself in
 * its own words, so anything else, such as "claude", is shown as written and
 * not matched to an agent by guesswork.
 */
export function recordedAgent(recordedBy: string): string | undefined {
  const name = recordedBy.trim().toLowerCase();
  return AGENTS.find((agent) => agent === name || agentName(agent).toLowerCase() === name);
}
