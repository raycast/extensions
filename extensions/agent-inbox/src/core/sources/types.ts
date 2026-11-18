import { AgentEvent, HistoryEntry, Session, SessionTitle } from "../types";

/** Persistent parser context, separate from the transport cursor and session reducer. */
export interface SourceContext {
  turnId?: string;
  asyncRequests?: Record<string, string[]>;
}
export interface TranscriptSource {
  parse(
    entry: Record<string, unknown>,
    session: Pick<Session, "agent" | "sessionId">,
    context: SourceContext,
  ): AgentEvent[];
}

/** Optional capabilities: a future DSH provider can push events without a transcript. */
export interface SourceCapabilities {
  /** Current names keyed by stable IDs, independently of execution events. */
  titles?: (sessions: Session[]) => Promise<SessionTitle[]>;
  transcript?: TranscriptSource;
  discover?: () => Promise<HistoryEntry[]>;
  locateTranscript?: (session: Session) => Promise<string | undefined>;
}
