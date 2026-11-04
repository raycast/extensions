import { basename, dirname, join } from "node:path";
import { readFileSync, statSync } from "node:fs";
import {
  CLAUDE_BRIDGE_ID,
  findClaudeDesktopSession,
  hasClaudeTerminalLocator,
  readClaudeDesktopSessions,
  sameClaudeBridgeId,
} from "../claude-desktop";
import { claudeWindowIdentity } from "../claude-window";
import { readClaudeTitleWindows } from "../focused-window";
import { Session, SessionTitle } from "../types";
import { readTranscriptBatch, TranscriptCursor } from "./collector";

interface LegacyTitle {
  cursor: TranscriptCursor;
  title?: string;
  custom?: boolean;
}

/** New Claude versions persist names beside the transcript, including timestamp-less /rename. */
export function readClaudeTitleFile(session: Session): { title?: string } | undefined {
  if (!session.transcriptPath || basename(session.transcriptPath) !== `${session.sessionId}.jsonl`) return undefined;
  try {
    const path = join(dirname(session.transcriptPath), session.sessionId, "custom-title.json");
    if (statSync(path).size > 64 * 1024) return {};
    const value = JSON.parse(readFileSync(path, "utf8"));
    return typeof value.customTitle === "string" && value.customTitle.trim() ? { title: value.customTitle } : {};
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? undefined : {};
  }
}

/** Legacy names are scanned incrementally, with one shared 16 MB budget per refresh. */
export class ClaudeTitleSource {
  private legacy = new Map<string, LegacyTitle>();
  private sidecars = new Set<string>();
  private next = 0;
  constructor(
    private readonly io = { desktop: readClaudeDesktopSessions, windows: readClaudeTitleWindows, now: Date.now },
  ) {}

  async read(sessions: Session[]): Promise<SessionTitle[]> {
    const observedAt = this.io.now();
    const desktop = this.io.desktop();
    const titles: SessionTitle[] = [];
    const legacy: Session[] = [];
    const cloud: Session[] = [];
    const add = (session: Session, title: string, source: string) =>
      titles.push({ agent: session.agent, sessionId: session.sessionId, title, observedAt, source });
    for (const session of sessions) {
      const local = findClaudeDesktopSession(session.sessionId, desktop);
      if (local?.title && !hasClaudeTerminalLocator(session)) add(session, local.title, "claude-desktop");
      else {
        if (session.locator.claudeDesktopId && !hasClaudeTerminalLocator(session)) continue;
        const custom = readClaudeTitleFile(session);
        if (custom) {
          this.sidecars.add(session.transcriptPath);
          if (custom.title) add(session, custom.title, "claude-title-file");
        } else if (this.sidecars.has(session.transcriptPath) || session.titleSource === "claude-title-file") continue;
        else if (session.transcriptPath && basename(session.transcriptPath) === `${session.sessionId}.jsonl`)
          legacy.push(session);
        else if (
          session.host === "app" &&
          CLAUDE_BRIDGE_ID.test(session.sessionId) &&
          !local &&
          !desktop.some((r) => r.bridgeSessionIds?.some((id) => sameClaudeBridgeId(id, session.sessionId)))
        )
          cloud.push(session);
      }
    }
    let budget = 16;
    for (let i = 0; i < legacy.length; i++) {
      const session = legacy[(this.next + i) % legacy.length];
      const path = session.transcriptPath;
      let cached = this.legacy.get(path);
      try {
        const stat = statSync(path);
        const unchanged =
          cached &&
          cached.cursor.offset === stat.size &&
          cached.cursor.mtime === stat.mtimeMs &&
          cached.cursor.identity === `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
        if (!unchanged) {
          if (budget-- <= 0) continue;
          const batch = readTranscriptBatch(path, cached?.cursor, true);
          cached = { cursor: batch.cursor, ...(batch.reset ? {} : { title: cached?.title, custom: cached?.custom }) };
          for (const { entry } of batch.records) {
            if (entry.sessionId && entry.sessionId !== session.sessionId) continue;
            const title =
              entry.type === "custom-title" ? entry.customTitle : entry.type === "ai-title" ? entry.title : undefined;
            if (typeof title !== "string" || !title.trim()) continue;
            if (entry.type === "custom-title" || !cached.custom) {
              cached.title = title;
              cached.custom = entry.type === "custom-title";
            }
          }
          this.legacy.set(path, cached);
          if (!batch.atEnd) continue;
        }
        if (cached?.title) add(session, cached.title, "claude-transcript-title");
      } catch {
        /* A missing or partial file does not erase a name. */
      }
    }
    if (legacy.length) this.next = (this.next + 16) % legacy.length;
    if (cloud.length) {
      let windows: Awaited<ReturnType<typeof readClaudeTitleWindows>> = [];
      try {
        windows = await this.io.windows();
      } catch {
        /* Optional AX access. */
      }
      const identities = windows.map(claudeWindowIdentity).filter((v) => v?.title);
      for (const session of cloud) {
        const names = new Set(
          identities.filter((v) => v && sameClaudeBridgeId(v.sessionId, session.sessionId)).map((v) => v!.title),
        );
        if (names.size === 1) add(session, [...names][0], "claude-cloud-window");
      }
    }
    return titles;
  }
}

const source = new ClaudeTitleSource();
export const readClaudeTitles = (sessions: Session[]) => source.read(sessions);
