import { promises as fs } from "fs";
import * as path from "path";
import { Backend, claudeStores, readDirSafe } from "./platform";

export interface Session {
  id: string; // file name (= the session id passed to --resume)
  file: string;
  cwd: string; // working directory claude ran in (we cd here before launching)
  backend: Backend; // which environment it belongs to (decides how we launch it)
  title: string; // short label: Claude's ai-title, else the first prompt, else a placeholder
  firstPrompt: string; // the prompt that started the session (recall: "what was this about")
  lastPrompt: string; // the most recent user prompt (recall: "where did I leave off")
  lastReply: string; // the last assistant text (recall: "what was the outcome")
  mtime: number;
}

/** Pull the plain text out of a message `content` (string, or an array of parts). */
function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((p) =>
      p && typeof p === "object" && (p as { type?: string }).type === "text"
        ? ((p as { text?: string }).text ?? "")
        : "",
    )
    .filter(Boolean)
    .join("\n");
}

/** Collapse whitespace and truncate with an ellipsis. */
function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/** Slash-command expansions and tool wrappers aren't useful recall text; skip them. */
function isWrapper(t: string): boolean {
  return /^<(command-|local-command)/.test(t) || t.startsWith("Caveat:");
}

// Everything we surface lives at the edges of the JSONL: cwd and the first prompt are
// written near the top, while ai-title / last-prompt entries are re-appended as the
// conversation grows, so their *latest* (authoritative) values sit near the bottom.
// Reading fixed-size head/tail chunks therefore covers all fields with constant memory,
// no matter how large the transcript gets (heavy sessions reach hundreds of MB).
const HEAD_BYTES = 128 * 1024;
const TAIL_BYTES = 256 * 1024;

/** Read `length` bytes of the file starting at `position`. */
async function readChunk(
  file: string,
  position: number,
  length: number,
): Promise<string> {
  const fh = await fs.open(file, "r");
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await fh.read(buf, 0, length, position);
    return buf.toString("utf8", 0, bytesRead);
  } finally {
    await fh.close();
  }
}

function parseLine(line: string): Record<string, unknown> | undefined {
  if (!line.trim()) return undefined;
  try {
    return JSON.parse(line);
  } catch {
    return undefined; // chunk-boundary fragment or corrupt line
  }
}

function messageText(obj: Record<string, unknown>): string {
  return contentText(
    (obj.message as { content?: unknown } | undefined)?.content,
  ).trim();
}

interface HeadInfo {
  cwd: string;
  firstPrompt: string;
}

/** Scan a head chunk for cwd and the first real user prompt. */
function extractHead(raw: string, needPrompt: boolean): HeadInfo {
  const r: HeadInfo = { cwd: "", firstPrompt: "" };
  for (const line of raw.split("\n")) {
    const obj = parseLine(line);
    if (!obj) continue;
    if (!r.cwd && typeof obj.cwd === "string") r.cwd = obj.cwd;
    if (needPrompt && !r.firstPrompt && obj.type === "user") {
      const text = messageText(obj);
      if (text && !isWrapper(text)) r.firstPrompt = text;
    }
    if (r.cwd && (!needPrompt || r.firstPrompt)) break;
  }
  return r;
}

interface TailInfo {
  aiTitle: string;
  lastPrompt: string;
  lastReply: string;
}

/** Scan a tail chunk, keeping the latest occurrence of each recall field. */
function extractTail(raw: string): TailInfo {
  const r: TailInfo = { aiTitle: "", lastPrompt: "", lastReply: "" };
  let lastUser = "";
  for (const line of raw.split("\n")) {
    const obj = parseLine(line);
    if (!obj) continue;
    const type = obj.type;
    if (type === "ai-title" && typeof obj.aiTitle === "string") {
      r.aiTitle = obj.aiTitle;
    } else if (type === "last-prompt" && typeof obj.lastPrompt === "string") {
      r.lastPrompt = obj.lastPrompt;
    } else if (type === "user") {
      const text = messageText(obj);
      if (text && !isWrapper(text)) lastUser = text;
    } else if (type === "assistant") {
      const text = messageText(obj);
      if (text) r.lastReply = text;
    }
  }
  // last-prompt entries aren't always present; fall back to the last user message.
  if (!r.lastPrompt) r.lastPrompt = lastUser;
  return r;
}

/**
 * Load sessions newest-first.
 *
 * Stats every JSONL first, then reads content only for the newest `limit` files — and
 * even for those, only fixed-size head/tail chunks (see HEAD_BYTES/TAIL_BYTES above).
 * Memory stays constant regardless of how large individual transcripts grow.
 *
 * @param limit max number of sessions to return.
 * @param opts.detail when true, also extract recall material (title / prompts / last
 *   reply) from the tail. Leave false (the default) for callers that only need cwd+mtime.
 */
export async function loadSessions(
  limit = 200,
  opts: { detail?: boolean } = {},
): Promise<Session[]> {
  const detail = opts.detail ?? false;

  interface Candidate {
    file: string;
    proj: string;
    backend: Backend;
    mtime: number;
    size: number;
  }
  const candidates: Candidate[] = [];
  for (const store of await claudeStores()) {
    const root = path.join(store.root, "projects");
    for (const proj of await readDirSafe(root)) {
      const dir = path.join(root, proj);
      for (const f of await readDirSafe(dir)) {
        if (!f.endsWith(".jsonl")) continue;
        const file = path.join(dir, f);
        try {
          const stat = await fs.stat(file);
          candidates.push({
            file,
            proj,
            backend: store.backend,
            mtime: stat.mtimeMs,
            size: stat.size,
          });
        } catch {
          // skip unreadable files
        }
      }
    }
  }
  candidates.sort((a, b) => b.mtime - a.mtime);

  // Read in small parallel batches: each file costs an open/read/close round-trip, which
  // adds up over slow filesystem boundaries (e.g. Windows <-> WSL). The batch width also
  // caps peak memory at BATCH x (HEAD_BYTES + TAIL_BYTES).
  const BATCH = 16;
  const picked = candidates.slice(0, limit);
  const out: Session[] = [];
  for (let i = 0; i < picked.length; i += BATCH) {
    const sessions = await Promise.all(
      picked
        .slice(i, i + BATCH)
        .map(async (c): Promise<Session | undefined> => {
          try {
            // A file smaller than the head chunk is read once and serves as both chunks.
            const head = await readChunk(
              c.file,
              0,
              Math.min(c.size, HEAD_BYTES),
            );
            const tail = !detail
              ? ""
              : c.size <= HEAD_BYTES
                ? head
                : await readChunk(
                    c.file,
                    Math.max(0, c.size - TAIL_BYTES),
                    Math.min(c.size, TAIL_BYTES),
                  );
            const h = extractHead(head, detail);
            const t = detail
              ? extractTail(tail)
              : { aiTitle: "", lastPrompt: "", lastReply: "" };
            return {
              id: path.basename(c.file, ".jsonl"),
              file: c.file,
              cwd: h.cwd || decodeProjectDir(c.proj, c.backend),
              backend: c.backend,
              title:
                t.aiTitle || clip(h.firstPrompt, 80) || "(untitled session)",
              firstPrompt: h.firstPrompt,
              lastPrompt: t.lastPrompt,
              lastReply: t.lastReply,
              mtime: c.mtime,
            };
          } catch {
            return undefined; // skip corrupt or unreadable files
          }
        }),
    );
    for (const s of sessions) if (s) out.push(s);
  }
  return out;
}

/**
 * Best-effort reconstruction of a cwd from a projects dir name (only used when the JSONL
 * had no cwd). The encoding replaces path separators with "-", which is lossy, so this is
 * approximate — real dashes in a path are indistinguishable from separators.
 *  - windows: "C--Users-you-dev-x" → "C:\\Users\\you\\dev\\x"
 *  - native/wsl (POSIX): "-home-you-x" → "/home/you/x"
 */
export function decodeProjectDir(name: string, backend: Backend): string {
  if (backend === "wsl") {
    return name.startsWith("-") ? name.replace(/-/g, "/") : name;
  }
  const win = /^([A-Za-z])--(.*)$/.exec(name);
  if (win) return `${win[1]}:\\${win[2].replace(/-/g, "\\")}`;
  return name.startsWith("-") ? name.replace(/-/g, "/") : name;
}
