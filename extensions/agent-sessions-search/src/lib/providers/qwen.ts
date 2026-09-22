import { readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { getConfig, homeOf } from "../config";
import { readJsonlLines, safeJson } from "../jsonl";
import { DiscoveredFile, ParseResult, ProviderContext, SessionProvider, SessionState } from "../types";
import { SessionBuilder } from "./base";

/**
 * Qwen Code: ~/.qwen/projects/<slug>/chats/<sessionId>.jsonl (archived: chats/archive/).
 *
 * Despite being a Gemini CLI fork, its transcripts use a different, Claude-Code-shaped record:
 * every line is self-describing and carries `sessionId`, `cwd`, `gitBranch`, `timestamp` and
 * `version`, so nothing has to be recovered from the directory slug (which is lossy — `sanitizeCwd`
 * maps every non-alphanumeric character to `-`).
 *
 *   type: "user" | "assistant" | "tool_result" | "system"
 *   message: { role: "user" | "model", parts: Part[] }   (always an array of parts)
 *   system records carry a `subtype`; the one we use is `custom_title` (last one wins).
 *
 * Tool names live only inside the parts (`functionCall.name`), never in `toolCallResult`.
 *
 * Sub-agent output is excluded twice over, because it appears in two forms: spawned agents get
 * their own transcripts under <projectDir>/subagents/, which sits outside `chats/` and is never
 * discovered (and agent-suffixed session ids fail the filename filter the CLI itself uses), while
 * sidechain records are interleaved into the parent's own transcript and are skipped one by one
 * on `isSidechain` / `agentId`.
 */

const SESSION_FILE = /^[0-9a-fA-F-]{32,36}\.jsonl$/;

interface QwenPart {
  text?: string;
  thought?: boolean;
  functionCall?: { name?: string; args?: unknown };
}

interface QwenRecord {
  sessionId?: string;
  timestamp?: string;
  type?: string;
  subtype?: string;
  provenance?: string;
  isSidechain?: boolean;
  cwd?: string;
  gitBranch?: string;
  agentId?: string;
  message?: { role?: string; parts?: QwenPart[] };
  systemPayload?: { customTitle?: string; displayText?: string; parentSessionId?: string };
}

function partsText(parts: QwenPart[] | undefined): string {
  if (!Array.isArray(parts)) return "";
  // `thought: true` parts are the model's internal reasoning, not conversation.
  return parts
    .filter((p) => p && !p.thought && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("");
}

function parseTs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

function collect(dir: string, archived: boolean, out: DiscoveredFile[]) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory() && !archived && e.name === "archive") {
      if (getConfig().includeArchived) collect(join(dir, e.name), true, out);
      continue;
    }
    if (!e.isFile() || !SESSION_FILE.test(e.name)) continue;
    const file = join(dir, e.name);
    try {
      const st = statSync(file);
      if (st.size > 0) out.push({ agent: "qwen", file, size: st.size, mtime: Math.floor(st.mtimeMs) });
    } catch {
      // race with deletion
    }
  }
}

export const qwenProvider: SessionProvider = {
  id: "qwen",

  async prepare() {},

  async discover(): Promise<DiscoveredFile[]> {
    const projects = join(homeOf("qwen"), "projects");
    const out: DiscoveredFile[] = [];
    let dirs: string[] = [];
    try {
      dirs = readdirSync(projects, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } catch {
      return out;
    }
    // Only `chats/` holds resumable sessions; `subagents/` sits beside it and is skipped.
    for (const dir of dirs) collect(join(projects, dir, "chats"), false, out);
    return out;
  },

  async parse(file: DiscoveredFile, previous: SessionState | null, ctx: ProviderContext): Promise<ParseResult> {
    const sessionId = basename(file.file, ".jsonl");
    const b = new SessionBuilder("qwen", sessionId, file, previous);
    b.state.entrypoint = "cli";
    b.state.archived = file.file.includes("/chats/archive/");

    for await (const line of readJsonlLines(file.file)) {
      const rec = safeJson<QwenRecord>(line.text);
      if (!rec) continue;
      const ts = parseTs(rec.timestamp);
      if (rec.cwd) b.state.cwd = rec.cwd;
      if (rec.gitBranch) b.state.branch = rec.gitBranch;
      b.touch(ts);
      // Sub-agent chatter is a sidechain written into the parent's own transcript, so it is
      // filtered per record rather than per file.
      if (rec.isSidechain || rec.agentId) continue;

      switch (rec.type) {
        case "user":
          // Tool results are written as user-role records too; they carry no human text, and
          // `provenance` separates a typed prompt from control and goal-runtime records (it is
          // absent on older records, which are taken at face value).
          if (rec.subtype === undefined && (rec.provenance === undefined || rec.provenance === "real_user")) {
            b.addMessage("user", rec.systemPayload?.displayText || partsText(rec.message?.parts), ts);
          }
          break;
        case "assistant":
          b.addMessage("assistant", partsText(rec.message?.parts), ts);
          for (const p of rec.message?.parts ?? []) {
            if (p?.functionCall?.name) b.addTool(p.functionCall.name, p.functionCall.args, ts);
          }
          break;
        case "system":
          // Re-appended on every lifecycle event, so the last one is the current title.
          if (rec.subtype === "custom_title") b.setTitle("custom-title", rec.systemPayload?.customTitle, 3, true);
          break;
        default:
          break;
      }
    }

    // Qwen itself sorts sessions by file mtime rather than a stored updatedAt.
    if (!b.state.updatedAt || file.mtime > b.state.updatedAt) b.state.updatedAt = file.mtime;
    return b.finish(file, ctx);
  },
};
