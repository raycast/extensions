// Pure parsers for the jot CLI's output. No imports, so `node --test` can load this file directly.

export type JotStatus = "open" | "done" | "archived";

export interface Jot {
  id: string;
  status: JotStatus;
  title: string;
  tags: string[];
  /** ISO date, or "" when the CLI did not give one. */
  created: string;
  /** Absolute path of the .md file, or "" when the CLI did not give one. */
  path: string;
  preview: string;
  /** "" is the Inbox. */
  section: string;
  pinned: boolean;
}

function asStatus(value: unknown): JotStatus {
  return value === "done" || value === "archived" ? value : "open";
}

/**
 * Rows from the MCP `list_jots` and `search_jots` text: one line per jot,
 * `id<TAB>status<TAB>title #tag #tag<TAB>path`. "No jots." means an empty list.
 * The title can hold " #word" itself, so tags read from the text are a best guess.
 */
export function parseRows(text: string): Jot[] {
  const jots: Jot[] = [];
  for (const line of text.split("\n")) {
    const fields = line.replace(/\r$/, "").split("\t");
    if (fields.length < 4 || !fields[0]) continue;
    const [id, status] = fields;
    const path = fields[fields.length - 1];
    const label = fields.slice(2, -1).join("\t");
    const match = label.match(/^(.*?)((?:\s#\S+)*)$/);
    const title = (match ? match[1] : label).trim();
    const tags = match ? match[2].split(/\s+#/).filter(Boolean) : [];
    jots.push({
      id,
      status: asStatus(status),
      title,
      tags,
      created: "",
      path,
      preview: "",
      section: "",
      pinned: false,
    });
  }
  return jots;
}

interface ToolResult {
  isError?: boolean;
  content?: { type: string; text?: string }[];
  structuredContent?: { jots?: unknown[] };
}

/**
 * Reads the reply with id `requestId` from `jot mcp` stdout (newline-delimited JSON-RPC).
 * Uses `structuredContent` (tags and dates) when present, and the text rows for file paths.
 * Throws with the server's message on a JSON-RPC error or an `isError` tool result.
 */
export function parseMcpList(stdout: string, requestId: number): Jot[] {
  let result: ToolResult | undefined;
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    let msg: { id?: unknown; result?: ToolResult; error?: { message?: string } };
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id !== requestId) continue;
    if (msg.error) throw new Error(msg.error.message || "jot mcp failed");
    result = msg.result;
  }
  if (!result) throw new Error("jot mcp gave no answer");
  const text = (result.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text || "")
    .join("\n");
  if (result.isError) throw new Error(text || "jot mcp failed");
  const rows = parseRows(text);
  const structured = result.structuredContent?.jots;
  if (!Array.isArray(structured)) return rows;
  const paths = new Map(rows.map((r) => [r.id, r.path]));
  return structured.map((raw) => {
    const j = raw as Record<string, unknown>;
    const id = String(j.id ?? "");
    return {
      id,
      status: asStatus(j.status),
      title: String(j.title ?? ""),
      tags: Array.isArray(j.tags) ? j.tags.map(String) : [],
      created: typeof j.created === "string" ? j.created : "",
      path: paths.get(id) ?? "",
      preview: typeof j.preview === "string" ? j.preview : "",
      section: typeof j.section === "string" ? j.section : "",
      pinned: j.pin === true,
    };
  });
}

/** The message from the CLI's stderr: `{"ok":false,"error":{"message":...}}` or plain text. */
export function parseCliError(stderr: string): string {
  const text = stderr.trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error?.message) return String(parsed.error.message);
  } catch {
    // Plain text. The CLI writes JSON when stderr is not a terminal, so this is a fallback.
  }
  return text.replace(/^Error:\s*/, "");
}

/** The note body of a jot file: everything after the YAML front matter. */
export function stripFrontmatter(raw: string): string {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/);
  return match ? text.slice(match[0].length) : text;
}

/** Tags typed by a person: split on commas and spaces, leading "#" and "-" dropped, duplicates removed. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const part of input.split(/[\s,]+/)) {
    const tag = part.replace(/^[#-]+/, "").trim();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

export type Section = "Today" | "Yesterday" | "This Week" | "Earlier" | "Undated";
export const SECTIONS: Section[] = ["Today", "Yesterday", "This Week", "Earlier", "Undated"];

/** Which day group a jot's ISO date falls in, relative to `now` (local time). */
export function sectionFor(created: string, now: Date = new Date()): Section {
  const date = new Date(created);
  if (!created || Number.isNaN(date.getTime())) return "Undated";
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This Week";
  return "Earlier";
}

/** Groups jots by day section, keeping their order and skipping empty groups. */
export function groupJots(jots: Jot[], now: Date = new Date()): { section: Section; jots: Jot[] }[] {
  const groups = new Map<Section, Jot[]>();
  for (const jot of jots) {
    const key = sectionFor(jot.created, now);
    groups.set(key, [...(groups.get(key) ?? []), jot]);
  }
  return SECTIONS.filter((s) => groups.has(s)).map((section) => ({ section, jots: groups.get(section)! }));
}

/** A stable palette index for a tag, so #work is always the same color. */
export function tagHue(tag: string, size: number): number {
  let h = 0;
  for (const ch of tag.toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h % size;
}

/** Every tag across the jots, most used first, then A to Z. */
export function allTags(jots: Jot[]): string[] {
  const counts = new Map<string, number>();
  for (const jot of jots) for (const tag of jot.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}

/** Section names in use, A to Z, without the Inbox (""). */
export function sectionsOf(jots: Jot[]): string[] {
  return [...new Set(jots.map((j) => j.section).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** Whether a `tools/list` reply shows `add_jot` taking images (Jot 2.0.1 and later). */
export function addJotTakesImages(stdout: string, requestId: number): boolean {
  for (const line of stdout.split("\n")) {
    try {
      const msg = JSON.parse(line);
      if (msg.id !== requestId) continue;
      const tool = (msg.result?.tools ?? []).find((t: { name?: string }) => t.name === "add_jot");
      return Boolean(tool?.inputSchema?.properties?.images);
    } catch {
      continue;
    }
  }
  return false;
}

/** The id from a jot row (`id<TAB>status<TAB>...`) in an MCP tool reply. */
export function idFromToolReply(stdout: string, requestId: number): string {
  for (const line of stdout.split("\n")) {
    let msg: {
      id?: unknown;
      error?: { message?: string };
      result?: { isError?: boolean; content?: { text?: string }[] };
    };
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id !== requestId) continue;
    const text = msg.result?.content?.[0]?.text ?? "";
    if (msg.error) throw new Error(msg.error.message || "jot mcp failed");
    if (msg.result?.isError) throw new Error(text || "jot mcp failed");
    const id = text.split("\t")[0]?.trim();
    if (!id) throw new Error("jot gave no id");
    return id;
  }
  throw new Error("jot mcp gave no answer");
}

/** A Jot shortcut from settings.json, like ["Control+Option+V"] or ["Shift", "Shift"]. */
export type Keystroke =
  | { kind: "chord"; key: string; modifiers: ("command" | "control" | "option" | "shift")[] }
  | { kind: "double-tap"; modifier: "command" | "control" | "option" | "shift" }
  | { kind: "none" };

const MODIFIERS: Record<string, "command" | "control" | "option" | "shift"> = {
  control: "control",
  ctrl: "control",
  option: "option",
  alt: "option",
  shift: "shift",
  command: "command",
  cmd: "command",
  meta: "command",
  mod: "command",
};

export function parseShortcut(binding: unknown): Keystroke {
  if (!Array.isArray(binding) || binding.length === 0) return { kind: "none" };
  if (binding.length === 2 && binding[0] === binding[1] && MODIFIERS[String(binding[0]).toLowerCase()]) {
    return { kind: "double-tap", modifier: MODIFIERS[String(binding[0]).toLowerCase()] };
  }
  const parts = String(binding[0]).split("+");
  const key = parts.pop() ?? "";
  const modifiers = parts.map((p) => MODIFIERS[p.toLowerCase()]).filter(Boolean);
  if (!key || modifiers.length !== parts.length) return { kind: "none" };
  return { kind: "chord", key, modifiers };
}

/** AppleScript that presses the shortcut through System Events. Null when it can't be typed. */
export function shortcutScript(k: Keystroke): string | null {
  if (k.kind === "none") return null;
  if (k.kind === "double-tap") {
    const tap = `key down ${k.modifier}\n  delay 0.05\n  key up ${k.modifier}`;
    return `tell application "System Events"\n  ${tap}\n  delay 0.1\n  ${tap}\nend tell`;
  }
  const using = k.modifiers.length ? ` using {${k.modifiers.map((m) => `${m} down`).join(", ")}}` : "";
  const named: Record<string, string> = { space: '" "', enter: "return", return: "return", tab: "tab" };
  const key = k.key.toLowerCase();
  if (key.length === 1 && /[a-z0-9]/.test(key)) return `tell application "System Events" to keystroke "${key}"${using}`;
  if (named[key]) return `tell application "System Events" to keystroke ${named[key]}${using}`;
  return null;
}
