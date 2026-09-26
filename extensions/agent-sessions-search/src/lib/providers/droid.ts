import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { homeOf } from "../config";
import { readJsonlLines, safeJson } from "../jsonl";
import { DiscoveredFile, ParseResult, ProviderContext, SessionProvider, SessionState } from "../types";
import { SessionBuilder } from "./base";

/**
 * Droid (Factory): ~/.factory/sessions/<-slug-of-cwd>/<sessionId>.jsonl, plus loose
 * `sessions/*.jsonl` for sessions started without a project. A `<sessionId>.settings.json`
 * sidecar holds tags and the archive flag.
 *
 * Line 1 is always a `session_start` record; anything else is an invalid transcript:
 *   { type: "session_start", id, title, cwd, parent?, callingSessionId?, decompSessionType? }
 *   { type: "message", id, timestamp, message: { role, content, visibility?, isUserVisible? } }
 *   { type: "todo_state" | "compaction_state" | "agent_turn_outcome" | ... }
 *
 * `message.content` is Anthropic-shaped: a string, or blocks of text / tool_use / tool_result.
 * Messages marked `user_only` or `llm_only` are UI or model plumbing rather than conversation.
 *
 * Sub-agents and internal forks are excluded: the `btw/` directory, sessions whose start record
 * names a parent or calling session, and sessions tagged `subagent` / `exec` in the sidecar.
 */

interface DroidBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
}

interface DroidLine {
  type?: string;
  id?: string;
  title?: string;
  cwd?: string;
  lastCwd?: string;
  parent?: string | null;
  callingSessionId?: string;
  decompSessionType?: string;
  timestamp?: string;
  message?: { role?: string; content?: unknown; visibility?: string; isUserVisible?: boolean };
}

const HIDDEN_TAGS = new Set(["subagent", "exec", "btw-fork"]);

function parseTs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

function blockText(content: unknown, onTool: (name: string, input: unknown) => void): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const texts: string[] = [];
  for (const block of content as DroidBlock[]) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text" && typeof block.text === "string") texts.push(block.text);
    else if (block.type === "tool_use" && typeof block.name === "string") onTool(block.name, block.input);
  }
  return texts.join("\n");
}

/** Tags and archive state from the `<sessionId>.settings.json` sidecar, when it exists. */
function sidecar(file: string): { archived: boolean; hidden: boolean } {
  try {
    const raw = JSON.parse(readFileSync(file.replace(/\.jsonl$/, ".settings.json"), "utf8")) as {
      archivedAt?: string;
      tags?: unknown;
    };
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    const names = tags.map((t) => (typeof t === "string" ? t : ((t as { name?: string })?.name ?? "")));
    return { archived: !!raw.archivedAt, hidden: names.some((n) => HIDDEN_TAGS.has(n)) };
  } catch {
    return { archived: false, hidden: false };
  }
}

function collect(dir: string, out: DiscoveredFile[], recurse: boolean) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    // Project directories are always named `-<slug>`; `btw/` holds internal side sessions.
    if (e.isDirectory()) {
      if (recurse && e.name.startsWith("-")) collect(join(dir, e.name), out, false);
      continue;
    }
    if (!e.isFile() || !e.name.endsWith(".jsonl")) continue;
    const file = join(dir, e.name);
    try {
      const st = statSync(file);
      if (st.size > 0) out.push({ agent: "droid", file, size: st.size, mtime: Math.floor(st.mtimeMs) });
    } catch {
      // race with deletion
    }
  }
}

export const droidProvider: SessionProvider = {
  id: "droid",

  async prepare() {},

  async discover(): Promise<DiscoveredFile[]> {
    const out: DiscoveredFile[] = [];
    collect(join(homeOf("droid"), "sessions"), out, true);
    return out;
  },

  async parse(file: DiscoveredFile, previous: SessionState | null, ctx: ProviderContext): Promise<ParseResult> {
    const meta = sidecar(file.file);
    let sessionId = basename(file.file, ".jsonl");
    const b = new SessionBuilder("droid", sessionId, file, previous);
    b.state.entrypoint = "cli";
    b.state.archived = meta.archived;

    for await (const line of readJsonlLines(file.file)) {
      const rec = safeJson<DroidLine>(line.text);
      if (!rec) continue;
      if (rec.type === "session_start") {
        if (rec.id) sessionId = rec.id;
        b.state.cwd = rec.lastCwd || rec.cwd || null;
        // Spawned by another session, or one half of an orchestrator/worker pair.
        if (rec.parent || rec.callingSessionId || rec.decompSessionType === "worker") b.state.hidden = true;
        b.setTitle("session-title", rec.title, 3);
        if (b.state.hidden) break;
        continue;
      }
      if (rec.type !== "message") continue;
      const m = rec.message;
      const role = m?.role === "user" ? "user" : m?.role === "assistant" ? "assistant" : null;
      if (!role) continue;
      // user_only is UI state the model never sees; llm_only is context the user never saw.
      if (m?.visibility === "user_only" || m?.visibility === "llm_only") continue;
      const ts = parseTs(rec.timestamp);
      const text = blockText(m?.content, (name, input) => b.addTool(name, input, ts));
      b.addMessage(role, text, ts);
    }

    b.state.sessionId = sessionId;
    b.state.id = `droid:${sessionId}`;
    if (meta.hidden) b.state.hidden = true;
    return b.finish(file, ctx);
  },
};
