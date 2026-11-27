/**
 * Talking to Mash: finding the `mash` program and the desktop app, reading what
 * `mash search --live`, `mash list-chats` and `mash view` answer, and the
 * mash:// links that open a chat in the Mash desktop app. Everything here is
 * plain data in and out, so it is tested without Raycast.
 */
import { join } from "node:path";

/**
 * One chat in the list: either a chat that mentions what was typed, at its best
 * matching message, or a recent chat, at its first message.
 */
export interface Hit {
  readonly chatId: string;
  /** The message `mash view` reads: the match, or a recent chat's first message. */
  readonly messageId: string;
  /** Whether the chat matched what was typed, rather than being a recent chat. */
  readonly matched: boolean;
  readonly title: string;
  readonly agent: string;
  readonly project: string;
  readonly updatedAt: Date | undefined;
  readonly passage: string;
  /** The machine a result came from, when it is not this one. */
  readonly machine?: string;
  /** Found only by meaning, not by its words. */
  readonly byMeaning?: boolean;
  /** A chat an agent started for its own subtask (a subagent or fork), not one of the reader's. */
  readonly subagent?: boolean;
  /** Every matching message Mash returned for the chat, best first; the first is `messageId`. */
  readonly matches?: readonly Match[];
}

/** One matching message in a chat result. */
interface Match {
  readonly messageId: string;
  readonly passage: string;
}

/** What a search lists: one row per chat, or one per matching message. */
export type Show = "chats" | "messages";

/** The dropdown's choice: what to list, and whose history. */
export type ViewChoice = `${Show}:${StreamScope}`;

export function viewChoice(value: string): { show: Show; scope: StreamScope } {
  const [show, scope] = value.split(":");
  return {
    show: show === "messages" ? "messages" : "chats",
    scope: scope === "local" ? "local" : "all",
  };
}

/**
 * The rows to list. A chat result carries up to three of its matching
 * messages; listing messages gives each its own row, in the chats' order, so
 * the merged ranking and the rows already shown stay where they are.
 */
export function rows(hits: readonly Hit[], show: Show): Hit[] {
  if (show === "chats") return [...hits];
  return hits.flatMap((hit) =>
    (hit.matches?.length ? hit.matches : [{ messageId: hit.messageId, passage: hit.passage }]).map((match) => ({
      ...hit,
      messageId: match.messageId,
      passage: match.passage,
    })),
  );
}

/** One message around a hit, as `mash view` returns it. */
export interface Message {
  readonly id: string;
  readonly role: string;
  /** What was said: the person's own words when the agent wrapped them in context. */
  readonly content: string;
  /** Work between what was said: a tool call, tool output, thinking or injected context. */
  readonly step?: boolean;
  /** Its place in the whole chat, counting from 0, when Mash gives it. */
  readonly ordinal?: number;
}

/** A `mash view` answer: some of a chat's messages, and how many it has in all when Mash says. */
export interface ChatView {
  readonly messages: Message[];
  readonly total?: number;
}

/** One message of a glance at a chat, and whether it is the one the glance was opened at. */
export interface Glimpse {
  readonly message: Message;
  readonly match: boolean;
}

/**
 * Where the Mash desktop app can be installed: the Applications folder for
 * everyone, or the one in the reader's home folder. The app is what opens
 * mash:// links.
 */
export function appLocations(home: string): string[] {
  return ["/Applications/Mash.app", join(home, "Applications/Mash.app")];
}

/** Whether the Mash desktop app is installed. */
export function hasDesktopApp(home: string, exists: (path: string) => boolean): boolean {
  return appLocations(home).some(exists);
}

/**
 * Where Mash's install methods put `mash`, in the order to try. Raycast starts
 * commands with a short PATH, so the usual places are named outright.
 */
export function installLocations(home: string): string[] {
  return [
    join(home, ".local/bin/mash"), // the install script
    "/opt/homebrew/bin/mash", // Homebrew on Apple silicon
    "/usr/local/bin/mash", // Homebrew on Intel, and manual installs
    join(home, ".cargo/bin/mash"), // cargo-binstall
    join(home, ".local/share/mise/shims/mash"), // mise
    // the engine inside the desktop app
    ...appLocations(home).map((app) => join(app, "Contents/MacOS/mash")),
  ];
}

/**
 * The `mash` to run: the file the reader chose, else the first installed.
 * Raycast's file picker gives a full path, or nothing when no file is chosen;
 * a path kept from when the preference was typed may still start with `~`.
 */
export function findMash(
  configured: string | undefined,
  home: string,
  exists: (path: string) => boolean,
): string | undefined {
  const chosen = configured?.trim();
  if (!chosen) return installLocations(home).find(exists);
  const path = chosen === "~" || chosen.startsWith("~/") ? join(home, chosen.slice(1)) : chosen;
  return exists(path) ? path : undefined;
}

/**
 * The environment every `mash` the extension runs gets: Mash names the caller
 * of each command in its usage log from `MASH_CLIENT`, so Raycast's searches
 * and reads are told apart from ones typed in a terminal.
 */
export function mashEnvironment(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...base, MASH_CLIENT: "raycast" };
}

/**
 * The arguments for a live search: this machine, by words, a short list. The
 * query follows `--`, so words such as `--force` are searched for rather than
 * read as options.
 */
export function liveSearchArguments(query: string): string[] {
  return ["search", "--live", "--limit", "20", "--", query];
}

/**
 * The arguments that list this machine's latest chats, the most recent first.
 * Agents start many subagent chats for their own subtasks; the list is the
 * reader's own chats, so Mash leaves those out.
 */
export function recentChatsArguments(): string[] {
  return ["list-chats", "--local", "--exclude-subagents", "--limit", "20"];
}

/** A row's subagent marker: Mash names a subagent chat's parent; other chats have none. */
const subagentMark = (row: Record<string, unknown>) =>
  typeof row.subagent === "object" && row.subagent !== null ? { subagent: true } : {};

/**
 * A chat's name in the list. A subagent chat's own first message is the long
 * prompt its parent wrote, so it goes by the short task label the parent gave
 * it, as the dashboard names it.
 */
function chatTitle(row: Record<string, unknown>): string {
  const marker =
    typeof row.subagent === "object" && row.subagent !== null ? (row.subagent as Record<string, unknown>) : {};
  return text(marker.label).trim() || text(row.title).trim() || "Untitled chat";
}

/** The arguments that read a message with a few on either side of it. */
const VIEW_CONTEXT = 12;

export function viewArguments(hit: Pick<Hit, "messageId" | "machine">): string[] {
  // Real chats are mostly tool calls and output, so read widely enough to
  // find a message that was actually said on each side of the match.
  const read = ["view", hit.messageId, "--context", String(VIEW_CONTEXT)];
  // A message from another machine is read from the shared index, by that
  // machine; this machine's index does not hold it.
  return hit.machine ? [...read, "--shared", hit.machine] : read;
}

/** Mash answers with JSON even when it fails; its message says what to do. */
export class MashError extends Error {}

function answer(stdout: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new MashError("Mash gave an answer this extension could not read. Is Mash up to date?");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new MashError("Mash gave an answer this extension could not read.");
  }
  const body = parsed as Record<string, unknown>;
  const error = body.error as { message?: unknown } | undefined;
  if (error) {
    throw new MashError(typeof error.message === "string" ? error.message : "Mash couldn’t search.");
  }
  return body;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** The chats in a `mash search` answer, each at its best matching message. */
export function parseSearch(stdout: string): Hit[] {
  const results = answer(stdout).results;
  if (!Array.isArray(results)) return [];
  return results.flatMap(hitFromRow);
}

/** One search result row as a list item, or nothing when it names no message. */
function hitFromRow(row: Record<string, unknown>): Hit[] {
  const all = Array.isArray(row.matches) ? (row.matches as Record<string, unknown>[]) : [];
  const matches = all
    .map((entry) => ({ messageId: text(entry.message_id), passage: text(entry.snippet).trim() }))
    .filter((entry) => entry.messageId);
  const match = all[0];
  const chatId = text(row.chat_id);
  const messageId = text(match?.message_id);
  if (!chatId || !messageId) return [];
  return [
    {
      chatId,
      messageId,
      matched: true,
      title: chatTitle(row),
      agent: text(row.provider),
      project: text(row.project),
      updatedAt: typeof row.updated_at === "number" ? new Date(row.updated_at) : undefined,
      passage: text(match?.snippet).trim(),
      ...(typeof row.node_id === "string" && row.node_id ? { machine: row.node_id } : {}),
      ...(Array.isArray(row.matched_by) && row.matched_by.length === 1 && row.matched_by[0] === "meaning"
        ? { byMeaning: true }
        : {}),
      ...subagentMark(row),
      matches,
    },
  ];
}

/** Whose history `mash search --stream` asks: this machine, or every machine. */
export type StreamScope = "local" | "all";

/**
 * Federated search: every source at once, one line of JSON per update. Mash
 * leaves subagent chats out unless asked to include them. The query follows
 * `--`, as in a live search.
 */
export function streamArguments(query: string, scope: StreamScope, includeSubagents = false): string[] {
  const asked = ["search", "--live", "--stream", "--limit", "20", "--scope", scope];
  return [...asked, ...(includeSubagents ? ["--include-subagents"] : []), "--", query];
}

export interface SourceState {
  readonly label: string;
  readonly state: "searching" | "done" | "failed" | "skipped";
  readonly message?: string;
  readonly timedOut?: boolean;
}

export interface StreamUpdate {
  readonly hits: Hit[];
  readonly sources: SourceState[];
  readonly done: boolean;
}

/** One line of `mash search --stream`. */
export function parseStreamLine(line: string): StreamUpdate {
  const body = answer(line);
  const results = Array.isArray(body.results) ? body.results : [];
  const sources = Array.isArray(body.sources) ? body.sources : [];
  return {
    hits: results.flatMap(hitFromRow),
    sources: sources.map((source: Record<string, unknown>) => ({
      label: text(source.label),
      state: (["searching", "done", "failed", "skipped"].includes(text(source.state))
        ? text(source.state)
        : "skipped") as SourceState["state"],
      ...(typeof source.message === "string" ? { message: source.message } : {}),
      ...(typeof source.timed_out === "boolean" ? { timedOut: source.timed_out } : {}),
    })),
    done: body.done === true,
  };
}

/**
 * The rows to show after a newer ranking. Before the list freezes the newer
 * ranking is shown as it is; after, rows already shown keep their places and
 * new ones are added below, so nothing moves under the selection.
 */
export function settle(shown: readonly Hit[], ranked: readonly Hit[], frozen: boolean): Hit[] {
  if (!frozen) return [...ranked];
  const key = (hit: Hit) => `${hit.machine ?? ""}\u0000${hit.chatId}`;
  const fresh = new Map(ranked.map((hit) => [key(hit), hit]));
  const seen = new Set(shown.map(key));
  return [...shown.map((hit) => fresh.get(key(hit)) ?? hit), ...ranked.filter((hit) => !seen.has(key(hit)))];
}

/** What is still coming, in a few words; empty when nothing is. */
export function stillComing(sources: readonly SourceState[]): string {
  const searching = sources.filter((source) => source.state === "searching");
  return searching.length ? `Searching ${searching.map((source) => source.label).join(", ")}…` : "";
}

/** The sources that failed, in words, for a row that offers to try again. */
export function failures(sources: readonly SourceState[]): string {
  return sources
    .filter((source) => source.state === "failed")
    .map((source) =>
      source.timedOut ? `${source.label} didn’t answer` : `${source.label}: ${source.message ?? "failed"}`,
    )
    .join(" · ");
}

/** The chats in a `mash list-chats` answer, each at its first message. */
export function parseChats(stdout: string): Hit[] {
  const chats = answer(stdout).chats;
  if (!Array.isArray(chats)) return [];
  return chats.flatMap((row: Record<string, unknown>) => {
    const lookup = row.lookup as { view?: { id?: unknown } } | undefined;
    const chatId = text(row.chat_id);
    const messageId = text(lookup?.view?.id);
    if (!chatId || !messageId) return [];
    return [
      {
        chatId,
        messageId,
        matched: false,
        title: chatTitle(row),
        agent: text(row.provider),
        project: text(row.project),
        updatedAt: typeof row.updated_at === "number" ? new Date(row.updated_at) : undefined,
        passage: "",
        ...subagentMark(row),
      },
    ];
  });
}

/** The messages in a `mash view` answer, oldest first, with the chat's message count. */
export function parseView(stdout: string): ChatView {
  const body = answer(stdout);
  const rows = Array.isArray(body.messages) ? body.messages : [];
  const messages = rows.map((row: Record<string, unknown>): Message => {
    // Mash gives `dialogue` only when it differs from the content: the
    // person's own words inside agent-added context, or empty for a message
    // where nobody said anything (a tool call, tool output, thinking).
    const said = typeof row.dialogue === "string" ? row.dialogue : undefined;
    const message = {
      id: text(row.id),
      role: text(row.role) || "message",
      content: text(row.content),
      ...(count(row.ordinal) !== undefined ? { ordinal: count(row.ordinal) } : {}),
    };
    if (said === undefined) return row.tools ? { ...message, step: true } : message;
    return said.trim() ? { ...message, content: said } : { ...message, step: true };
  });
  const total = count(body.message_count);
  return total === undefined ? { messages } : { messages, total };
}

/** A whole number Mash reported, or nothing. */
const count = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;

/**
 * A glance at a chat: the message `matchId` names, with the message said
 * before it and the one said after. Tool calls, their output and thinking
 * between them are passed over; a match that is itself such a step is still
 * shown, since that is what the search found.
 */
export function glance(messages: readonly Message[], matchId: string): Glimpse[] {
  const found = messages.findIndex((message) => message.id === matchId);
  const anchor = found >= 0 ? found : messages.findIndex((message) => !message.step);
  if (anchor < 0) return [];
  const said = (direction: number): number[] => {
    for (let index = anchor + direction; index >= 0 && index < messages.length; index += direction) {
      if (!messages[index].step) return [index];
    }
    return [];
  };
  return [...said(-1), anchor, ...said(1)].map((index) => ({
    message: messages[index],
    match: found >= 0 && index === anchor,
  }));
}

/**
 * Who said a message: you, or the agent by name; "Assistant" for a chat whose
 * agent Mash did not name.
 */
export function speaker(role: string, agent: string): string {
  if (role === "user") return "You";
  if (role === "assistant") return agentName(agent) || "Assistant";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export * from "./links";
export { literal, quoted, rendered } from "./markdown";
export { byActivity, lastActive } from "./activity";
export { type ChatPosition, chatPosition, messageCount } from "./position";

/** The agents Mash reads, by the IDs Mash gives them, with the names Mash shows. */
const AGENT_NAMES: Readonly<Record<string, string>> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  copilot: "GitHub Copilot",
  cursor: "Cursor",
  opencode: "OpenCode",
  antigravity: "Antigravity",
};

/** Every agent ID Mash reads. */
export const AGENTS: readonly string[] = Object.keys(AGENT_NAMES);

/** Names agents the way Mash does. */
export function agentName(agent: string): string {
  return AGENT_NAMES[agent] ?? agent;
}

/** The logo file under assets/agents for each agent Mash reads, and its brand colour.
 * Logos in ink follow Raycast's theme instead. */
export function agentLogo(agent: string): { file: string; tint?: string } | undefined {
  const logos: Record<string, { file: string; tint?: string }> = {
    "claude-code": { file: "claude.svg", tint: "#d97757" },
    codex: { file: "openai.svg" },
    copilot: { file: "githubcopilot.svg", tint: "#8957e5" },
    cursor: { file: "cursor.svg" },
    opencode: { file: "opencode.svg" },
    antigravity: { file: "antigravity.svg", tint: "#3d7fd6" },
  };
  return logos[agent];
}
