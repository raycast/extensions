import { statSync } from "node:fs";
import { getAdapter } from "./adapters";
import { ClaudeTurnState, claudeTurnState, readHeadTail } from "./transcript";
import { applyEvent } from "./status";
import { Session } from "./types";
import { SourceContext } from "./sources/types";

const TAIL_BYTES = 96 * 1024;
interface CachedState {
  mtime: number;
  size: number;
  observed?: Session;
  fallback?: ClaudeTurnState;
}

/** Read-only view recovery; uses the same source parser and reducer as the background collector. */
export class TranscriptStateRecovery {
  private cache = new Map<string, CachedState>();

  recover(sessions: Session[]): Session[] {
    return sessions.map((session) => this.recoverOne(session));
  }

  private recoverOne(session: Session): Session {
    if (!session.transcriptPath) return session;
    const source = getAdapter(session.agent)?.source?.transcript;
    if (!source) return session;
    try {
      const file = statSync(session.transcriptPath);
      if (!file.isFile()) return session;
      const key = `${session.agent}:${session.sessionId}:${session.transcriptPath}`;
      let cached = this.cache.get(key);
      if (!cached || cached.mtime !== file.mtimeMs || cached.size !== file.size) {
        const sample = readHeadTail(session.transcriptPath, 0, TAIL_BYTES);
        const lines = sample.size <= TAIL_BYTES ? sample.head : sample.tail;
        let observed: Session | undefined;
        const context: SourceContext = {};
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
              observed = undefined;
              continue;
            }
            for (const event of source.parse(entry, session, context))
              observed = applyEvent(observed, event)?.next ?? observed;
          } catch {
            observed = undefined;
          }
        }
        cached = {
          mtime: file.mtimeMs,
          size: file.size,
          observed,
          fallback: session.agent === "claude" ? claudeTurnState(lines) : undefined,
        };
        this.cache.set(key, cached);
      }
      const observed = cached.observed;
      if (observed?.state) {
        return (
          applyEvent(session, {
            agent: session.agent,
            sessionId: session.sessionId,
            type: "snapshot",
            source: "transcript",
            at: observed.state.at,
            turnId: observed.state.turnId,
            snapshot: observed.state,
            summary: observed.summary,
          })?.next ?? session
        );
      }
      // Old Claude transcripts can lack timestamps. They may fill idle display state only.
      if (session.agent === "claude" && session.status === "idle") {
        const fallback = cached.fallback;
        if (fallback) return { ...session, ...fallback };
      }
      return session;
    } catch {
      return session;
    }
  }
}

let recovery: TranscriptStateRecovery | undefined;
export function recoverIdleSessionStates(sessions: Session[]): Session[] {
  recovery ??= new TranscriptStateRecovery();
  return recovery.recover(sessions);
}
