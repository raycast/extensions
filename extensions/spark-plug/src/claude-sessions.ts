import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface ClaudeSession {
  id: string;
  filePath: string;
  customTitle?: string;
  firstMessage?: string;
  lastModified: number;
  isLive: boolean;
}

/// Mirrors Claude Code's project-dir encoding: every non-alphanumeric, non-dash
/// character becomes '-' (so '/', '_', '.', etc. all collapse to dashes).
export function encodePath(p: string): string {
  return p.replace(/[^A-Za-z0-9-]/g, "-");
}

export function sessionDir(worktreePath: string): string {
  return join(homedir(), ".claude", "projects", encodePath(worktreePath));
}

export function liveSessionIds(): Set<string> {
  const dir = join(homedir(), ".claude", "sessions");
  if (!existsSync(dir)) return new Set();
  const ids = new Set<string>();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const obj = JSON.parse(readFileSync(join(dir, f), "utf-8"));
      if (typeof obj?.sessionId === "string") ids.add(obj.sessionId);
    } catch {
      // ignore malformed file
    }
  }
  return ids;
}

export function readSessions(
  worktreePath: string,
  live: Set<string>,
): ClaudeSession[] {
  const dir = sessionDir(worktreePath);
  if (!existsSync(dir)) return [];
  const out: ClaudeSession[] = [];

  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".jsonl")) continue;
    const fullPath = join(dir, f);
    const id = f.replace(/\.jsonl$/, "");
    let mtime = 0;
    try {
      mtime = statSync(fullPath).mtimeMs;
    } catch {
      continue;
    }

    let customTitle: string | undefined;
    let firstMessage: string | undefined;
    try {
      const text = readFileSync(fullPath, "utf-8");
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        let obj: Record<string, unknown>;
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }
        if (
          obj.type === "custom-title" &&
          typeof obj.customTitle === "string" &&
          obj.customTitle
        ) {
          customTitle = obj.customTitle;
        } else if (
          obj.type === "user" &&
          obj.isSidechain !== true &&
          firstMessage === undefined &&
          typeof obj.message === "object" &&
          obj.message !== null
        ) {
          const msg = obj.message as { content?: unknown };
          if (typeof msg.content === "string") {
            firstMessage = clean(msg.content);
          } else if (Array.isArray(msg.content)) {
            const first = msg.content
              .map((c) =>
                typeof c === "object" &&
                c !== null &&
                typeof (c as { text?: unknown }).text === "string"
                  ? (c as { text: string }).text
                  : undefined,
              )
              .find((t) => !!t);
            if (first) firstMessage = clean(first);
          }
        }
        if (customTitle && firstMessage) break;
      }
    } catch {
      // unreadable transcript — leave title/message undefined
    }

    out.push({
      id,
      filePath: fullPath,
      customTitle,
      firstMessage,
      lastModified: mtime,
      isLive: live.has(id),
    });
  }

  return out.sort((a, b) => b.lastModified - a.lastModified);
}

function clean(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function relativeShort(ms: number): string {
  const secs = Math.max(0, (Date.now() - ms) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86_400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604_800) return `${Math.floor(secs / 86_400)}d`;
  if (secs < 2_592_000) return `${Math.floor(secs / 604_800)}w`;
  if (secs < 31_536_000) return `${Math.floor(secs / 2_592_000)}mo`;
  return `${Math.floor(secs / 31_536_000)}y`;
}

export function sessionTitle(s: ClaudeSession): string {
  if (s.customTitle) return s.customTitle;
  if (s.firstMessage) {
    return s.firstMessage.length > 60
      ? s.firstMessage.slice(0, 60) + "…"
      : s.firstMessage;
  }
  return s.id.slice(0, 8);
}

export function sessionLabel(s: ClaudeSession): string {
  const live = s.isLive ? "● live · " : "";
  return `${live}${sessionTitle(s)} · ${relativeShort(s.lastModified)}`;
}
