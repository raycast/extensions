import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { homeOf } from "../config";
import { readJsonlLines, safeJson } from "../jsonl";
import { DiscoveredFile, ParseResult, ProviderContext, SessionProvider, SessionState } from "../types";
import { SessionBuilder } from "./base";

/**
 * GitHub Copilot CLI: ~/.copilot/session-state/<sessionId>/events.jsonl, with the session's
 * metadata in a sibling `workspace.yaml`. Sessions from before the store was renamed still sit in
 * `history-session-state/` and are only migrated when the user resumes them, so both are scanned.
 *
 * Events share one envelope, discriminated by `type`:
 *   { id, parentId, type, timestamp, agentId?, ephemeral?, data }
 * The types that matter here are `user.message` / `assistant.message` (whose `data.content` is a
 * plain string, not blocks) and `tool.execution_start` (`data.toolName`). Everything else — well
 * over a hundred event types, and growing — is ignored.
 *
 * Events carrying an `agentId` belong to a sub-agent, `ephemeral` events are never meant to be
 * persisted, and a `data.source` marks a programmatic rather than human turn: all are skipped,
 * matching the CLI's own filter.
 */

interface CopilotEvent {
  type?: string;
  timestamp?: string;
  agentId?: string;
  ephemeral?: boolean;
  data?: { content?: unknown; toolName?: string; arguments?: unknown; source?: unknown; title?: unknown };
}

function parseTs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/**
 * `workspace.yaml` is a flat map of scalars written by the CLI, so the handful of keys we need are
 * read directly rather than pulling in a YAML parser.
 */
function readWorkspace(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  let text: string;
  try {
    text = readFileSync(join(dir, "workspace.yaml"), "utf8");
  } catch {
    return out;
  }
  for (const line of text.split("\n")) {
    const m = /^([a-z_]+):\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    if (value && value !== "null" && value !== "~") out[m[1]] = value;
  }
  return out;
}

function collect(root: string, out: DiscoveredFile[]) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const file = join(root, e.name, "events.jsonl");
    try {
      const st = statSync(file);
      if (st.size > 0) out.push({ agent: "copilot", file, size: st.size, mtime: Math.floor(st.mtimeMs) });
    } catch {
      // a session directory without a transcript yet
    }
  }
}

export const copilotProvider: SessionProvider = {
  id: "copilot",

  async prepare() {},

  async discover(): Promise<DiscoveredFile[]> {
    const home = homeOf("copilot");
    const out: DiscoveredFile[] = [];
    collect(join(home, "session-state"), out);
    const legacy = join(home, "history-session-state");
    if (existsSync(legacy)) collect(legacy, out);
    return out;
  },

  async parse(file: DiscoveredFile, previous: SessionState | null, ctx: ProviderContext): Promise<ParseResult> {
    const dir = dirname(file.file);
    const ws = readWorkspace(dir);
    const sessionId = ws.id || basename(dir);
    const b = new SessionBuilder("copilot", sessionId, file, previous);
    b.state.entrypoint = "cli";
    b.state.cwd = ws.cwd ?? ws.git_root ?? null;
    b.state.branch = ws.branch ?? null;
    // `user_named: true` means the title is the user's own, not a generated one.
    b.setTitle("workspace-name", ws.name, ws.user_named === "true" ? 4 : 2);
    b.touch(parseTs(ws.created_at));
    b.touch(parseTs(ws.updated_at));

    for await (const line of readJsonlLines(file.file)) {
      const rec = safeJson<CopilotEvent>(line.text);
      if (!rec || rec.ephemeral || rec.agentId !== undefined) continue;
      const ts = parseTs(rec.timestamp);
      switch (rec.type) {
        case "session.title_changed":
          if (typeof rec.data?.title === "string") b.setTitle("title-changed", rec.data.title, 3, true);
          break;
        case "user.message":
          // A `source` marks an injected/programmatic turn rather than something the user typed.
          if (rec.data?.source === undefined && typeof rec.data?.content === "string") {
            b.addMessage("user", rec.data.content, ts);
          } else {
            b.touch(ts);
          }
          break;
        case "assistant.message":
          if (typeof rec.data?.content === "string") b.addMessage("assistant", rec.data.content, ts);
          break;
        case "tool.execution_start":
          if (typeof rec.data?.toolName === "string") b.addTool(rec.data.toolName, rec.data.arguments, ts);
          break;
        default:
          break;
      }
    }

    return b.finish(file, ctx, { repoUrl: ws.repository ? `https://github.com/${ws.repository}` : null });
  },
};
