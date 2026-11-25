/**
 * Talking to Mash: finding the `mash` program and the desktop app, reading what
 * `mash search --live`, `mash list-chats` and `mash view` answer, and the
 * mash:// links that open a chat in the Mash desktop app. Everything here is plain data in and out, so it is tested
 * without Raycast.
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
export interface Match {
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
  readonly content: string;
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

/** The `mash` to run: the one the reader configured, else the first installed. */
export function findMash(
  configured: string | undefined,
  home: string,
  exists: (path: string) => boolean,
): string | undefined {
  const chosen = configured?.trim();
  if (chosen) return exists(chosen) ? chosen : undefined;
  return installLocations(home).find(exists);
}

/**
 * The environment every `mash` the extension runs gets: Mash names the caller
 * of each command in its usage log from `MASH_CLIENT`, so Raycast's searches
 * and reads are told apart from ones typed in a terminal.
 */
export function mashEnvironment(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...base, MASH_CLIENT: "raycast" };
}

/** The arguments for a live search: this machine, by words, a short list. */
export function liveSearchArguments(query: string): string[] {
  return ["search", query, "--live", "--limit", "20"];
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
export function viewArguments(hit: Pick<Hit, "messageId" | "machine">): string[] {
  const read = ["view", hit.messageId, "--context", "3"];
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
 * leaves subagent chats out unless asked to include them.
 */
export function streamArguments(query: string, scope: StreamScope, includeSubagents = false): string[] {
  const asked = ["search", query, "--live", "--stream", "--limit", "20", "--scope", scope];
  return includeSubagents ? [...asked, "--include-subagents"] : asked;
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

/** The messages in a `mash view` answer, oldest first. */
export function parseView(stdout: string): Message[] {
  const messages = answer(stdout).messages;
  if (!Array.isArray(messages)) return [];
  return messages.map((row: Record<string, unknown>) => ({
    id: text(row.id),
    role: text(row.role) || "message",
    content: text(row.content),
  }));
}

/**
 * The mash:// link that opens a chat in the desktop app: at the matching
 * message for a match, or at the chat itself for a recent chat.
 */
export function chatLink(hit: Pick<Hit, "chatId" | "messageId" | "matched" | "machine">): string {
  const chat = `mash://chat/${encodeURIComponent(hit.chatId)}`;
  // Another machine's chat opens by that machine, as the dashboard names it.
  const params = new URLSearchParams({
    ...(hit.machine ? { node: hit.machine } : {}),
    ...(hit.matched ? { message: hit.messageId } : {}),
  });
  return params.size ? `${chat}?${params}` : chat;
}

/**
 * The terminal command that resumes a chat in its agent's CLI, in the folder
 * it ran in. Only an agent's own sessions can be resumed: a subagent's ID is
 * Mash's, not a session the agent knows, and another machine's session is
 * not on this one. The folder is quoted for a POSIX shell.
 */
export function resumeCommand(
  hit: Pick<Hit, "agent" | "chatId" | "project" | "subagent" | "machine">,
): string | undefined {
  if (hit.subagent || hit.machine) return undefined;
  const resume =
    hit.agent === "claude-code"
      ? `claude --resume ${hit.chatId}`
      : hit.agent === "codex"
        ? `codex resume ${hit.chatId}`
        : undefined;
  if (!resume || !/^[\w-]+$/.test(hit.chatId)) return undefined;
  return hit.project ? `cd '${hit.project.replace(/'/g, `'\\''`)}' && ${resume}` : resume;
}

/** The mash:// link that opens Mash's main window, as the panel's Open Mash does. */
export const appLink = "mash://";

/** The mash:// link for Mash's full search of the same words. */
export function searchLink(query: string): string {
  return `mash://search?${new URLSearchParams({ q: query.trim() })}`;
}

/**
 * The terminal command for Mash's full search of the same words, for readers
 * without the desktop app. The words are quoted for a POSIX shell.
 */
export function searchCommand(query: string): string {
  return `mash search '${query.trim().replace(/'/g, `'\\''`)}'`;
}

/**
 * Chat history is untrusted text, and Raycast renders Markdown, where an image
 * or link would load a remote address. Text is shown in a code block fenced
 * longer than any run of backticks inside it, so nothing in it is interpreted.
 */
export function literal(content: string, limit = 4000): string {
  const clipped = content.length > limit ? `${content.slice(0, limit)}…` : content;
  const longest = Math.max(2, ...Array.from(clipped.matchAll(/`+/g), (run) => run[0].length));
  const fence = "`".repeat(longest + 1);
  return `${fence}text\n${clipped}\n${fence}`;
}

/**
 * Chat history rendered as Markdown, so code, lists and emphasis read as they
 * did in the chat. History is untrusted, and Raycast loads images, so every
 * image is turned into a link (links load nothing until clicked) and raw HTML
 * tags are shown as text. Code blocks and code spans are left alone: Raycast
 * shows them literally.
 */
export function rendered(content: string, limit = 4000): string {
  const clipped = content.length > limit ? `${content.slice(0, limit)}…` : content;
  let fence = "";
  return clipped
    .split("\n")
    .map((line) => {
      const opener = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence) {
        if (opener && opener[0] === fence[0] && opener.length >= fence.length) fence = "";
        return line;
      }
      if (opener) {
        fence = opener;
        return line;
      }
      return outsideCode(line);
    })
    .join("\n");
}

/** Defuses images and HTML in one line, outside its code spans. */
function outsideCode(line: string): string {
  const parts = line.split(/(`+)/);
  let open = "";
  return parts
    .map((part) => {
      if (/^`+$/.test(part)) {
        if (!open) open = part;
        else if (part === open) open = "";
        return part;
      }
      return open ? part : part.replace(/!\[/g, "\\![").replace(/<(?=[a-zA-Z!/?])/g, "&lt;");
    })
    .join("");
}

/** Names agents the way Mash does. */
export function agentName(agent: string): string {
  const names: Record<string, string> = {
    "claude-code": "Claude Code",
    codex: "Codex",
    copilot: "GitHub Copilot",
    cursor: "Cursor",
    opencode: "OpenCode",
    antigravity: "Antigravity",
  };
  return names[agent] ?? agent;
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
