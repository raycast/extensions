import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { homeOf } from "../config";
import { readJsonlLines, safeJson } from "../jsonl";
import { DiscoveredFile, ParseResult, ProviderContext, SessionProvider, SessionState } from "../types";
import { SessionBuilder } from "./base";

/**
 * Gemini CLI: ~/.gemini/tmp/<project>/chats/session-<ts>-<id8>.jsonl
 *
 * An append-only event log with four line kinds, replayed the way the CLI's own reader does:
 *   - { sessionId, projectHash, startTime, lastUpdated, summary?, kind? }  session metadata
 *   - { id, timestamp, type, content, toolCalls? }                         a message, upserted by id
 *   - { "$set": {...} }                                                    metadata patch; $set.messages is a checkpoint
 *   - { "$rewindTo": "<messageId>" }                                       drop that message and everything after it
 * `.json` files are the legacy single-document format and are read as a fallback.
 *
 * The log records only `projectHash` (sha256 of the cwd), never the cwd itself, so the working
 * directory comes from the sibling `.project_root` marker or the `projects.json` registry — which
 * also resolves the pre-slug `<sha256>` project directories still on disk, since the migration to
 * slugs copied sessions instead of moving them and left the same session under both names.
 *
 * Sub-agent transcripts live in a `<parentSessionId>/` subdirectory without the `session-` prefix
 * and additionally carry `kind: "subagent"`; both are excluded.
 */

const SESSION_FILE = /^session-.*\.jsonl?$/;

interface GeminiMessage {
  id?: string;
  timestamp?: string;
  type?: string;
  content?: unknown;
  displayContent?: unknown;
  toolCalls?: { name?: string; displayName?: string; args?: unknown; timestamp?: string }[];
}

interface GeminiMeta {
  sessionId?: string;
  projectHash?: string;
  startTime?: string;
  lastUpdated?: string;
  summary?: string;
  kind?: string;
  messages?: GeminiMessage[];
}

/** Project directory name -> absolute project root, resolved once per index run. */
let projectRoots = new Map<string, string>();

function loadProjectRoots(home: string) {
  projectRoots = new Map();
  // The registry maps an absolute project path to its slug; hashing each path also resolves the
  // legacy sha256-named directories to the same project.
  const byName = new Map<string, string>();
  const registry = safeJson<{ projects?: Record<string, string> }>(readFileOrEmpty(join(home, "projects.json")));
  for (const [path, slug] of Object.entries(registry?.projects ?? {})) {
    byName.set(slug, path);
    byName.set(createHash("sha256").update(path).digest("hex"), path);
  }
  const tmp = join(home, "tmp");
  for (const name of listDirs(tmp)) {
    // The marker file inside the project directory is authoritative when present.
    const marker = readFileOrEmpty(join(tmp, name, ".project_root")).trim();
    const root = marker || byName.get(name);
    if (root) projectRoots.set(name, root);
  }
}

function readFileOrEmpty(file: string): string {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/** Flatten a PartListUnion (`string | Part | Part[]`) to text, ignoring binary and tool parts. */
function partsToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(partsToText).join("");
  if (content && typeof content === "object") {
    const p = content as { text?: unknown };
    if (typeof p.text === "string") return p.text;
  }
  return "";
}

function parseTs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/**
 * Replay one session file into its final metadata and ordered messages, mirroring the CLI's
 * reader: messages are upserted by id, `$set` patches metadata (and `$set.messages` replaces the
 * whole log), and `$rewindTo` truncates — dropping everything when the target id is unknown.
 */
async function replay(file: string): Promise<{ meta: GeminiMeta; messages: GeminiMessage[] }> {
  const meta: GeminiMeta = {};
  let messages = new Map<string, GeminiMessage>();
  const apply = (rec: Record<string, unknown>) => {
    if (typeof rec.$rewindTo === "string") {
      const ids = [...messages.keys()];
      const at = ids.indexOf(rec.$rewindTo);
      messages = at === -1 ? new Map() : new Map(ids.slice(0, at).map((id) => [id, messages.get(id)!]));
      return;
    }
    if (typeof rec.id === "string") {
      messages.set(rec.id, rec as GeminiMessage);
      return;
    }
    const patch = (rec.$set && typeof rec.$set === "object" ? rec.$set : rec) as GeminiMeta;
    if (Array.isArray(patch.messages)) {
      messages = new Map(patch.messages.filter((m) => m?.id).map((m) => [m.id as string, m]));
    }
    Object.assign(meta, { ...patch, messages: undefined });
  };

  for await (const line of readJsonlLines(file)) {
    const rec = safeJson<Record<string, unknown>>(line.text);
    if (rec) apply(rec);
  }
  // Legacy `.json` sessions are a single document rather than a log.
  if (!meta.sessionId && file.endsWith(".json")) {
    const whole = safeJson<GeminiMeta>(readFileOrEmpty(file));
    if (whole?.sessionId) {
      if (Array.isArray(whole.messages)) {
        messages = new Map(whole.messages.filter((m) => m?.id).map((m) => [m.id as string, m]));
      }
      Object.assign(meta, { ...whole, messages: undefined });
    }
  }
  return { meta, messages: [...messages.values()] };
}

function projectRootFor(file: string): string | null {
  // <home>/tmp/<project>/chats/<session file>
  return projectRoots.get(basename(join(file, "..", ".."))) ?? null;
}

export const geminiProvider: SessionProvider = {
  id: "gemini",

  async prepare() {
    loadProjectRoots(homeOf("gemini"));
  },

  async discover(): Promise<DiscoveredFile[]> {
    const tmp = join(homeOf("gemini"), "tmp");
    // The slug migration copied sessions instead of moving them, so the same file can exist under
    // both the new slug directory and the old sha256 one: keep the newest copy.
    const byName = new Map<string, DiscoveredFile>();
    for (const project of listDirs(tmp)) {
      const chats = join(tmp, project, "chats");
      let entries;
      try {
        entries = readdirSync(chats, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        // Sub-agent logs sit in a <parentSessionId>/ directory and lack the session- prefix.
        if (!e.isFile() || !SESSION_FILE.test(e.name)) continue;
        const file = join(chats, e.name);
        try {
          const st = statSync(file);
          if (st.size === 0) continue;
          const found: DiscoveredFile = { agent: "gemini", file, size: st.size, mtime: Math.floor(st.mtimeMs) };
          const seen = byName.get(e.name);
          if (!seen || found.mtime > seen.mtime) byName.set(e.name, found);
        } catch {
          // race with deletion
        }
      }
    }
    return [...byName.values()];
  },

  async parse(file: DiscoveredFile, previous: SessionState | null, ctx: ProviderContext): Promise<ParseResult> {
    const { meta, messages } = await replay(file.file);
    // `session-<ts>-<id8>.jsonl` carries only the first 8 characters of the id, so a file whose
    // metadata line is missing is identified by its name and cannot be resumed by id.
    const sessionId = meta.sessionId ?? basename(file.file).replace(/\.jsonl?$/, "");
    const b = new SessionBuilder("gemini", sessionId, file, previous);
    b.state.entrypoint = "cli";
    b.state.cwd = projectRootFor(file.file);
    b.touch(parseTs(meta.startTime));
    b.touch(parseTs(meta.lastUpdated));
    b.setTitle("summary", meta.summary, 2);

    for (const m of messages) {
      const ts = parseTs(m.timestamp);
      // info / error / warning records are synthetic notices, not conversation.
      if (m.type === "user") {
        b.addMessage("user", partsToText(m.content ?? m.displayContent), ts);
      } else if (m.type === "gemini") {
        b.addMessage("assistant", partsToText(m.content ?? m.displayContent), ts);
        for (const call of m.toolCalls ?? []) {
          b.addTool(call.displayName || call.name || "tool", call.args, parseTs(call.timestamp) ?? ts);
        }
      }
    }

    if (meta.kind === "subagent") b.state.hidden = true;
    return b.finish(file, ctx);
  },
};
