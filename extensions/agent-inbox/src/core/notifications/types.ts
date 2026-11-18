import { Attention, Config, Session } from "../types";

/** Transport-neutral notification. id is a durable deduplication key. */
export interface NotificationMessage {
  id: string;
  agent: string;
  sessionId: string;
  title: string;
  summary: string;
  attention: Attention | null;
  at: number;
}

export interface NotificationChannel {
  id: string;
  /** Must settle within the supplied deadline; throw on failure so the outbox retries. */
  send(message: NotificationMessage, context: { config: Config; signal: AbortSignal }): Promise<void>;
}

export function notificationMessage(id: string, session: Session): NotificationMessage {
  return {
    id,
    agent: session.agent,
    sessionId: session.sessionId,
    title: session.title || session.sessionId,
    summary: session.summary,
    attention: session.attention,
    at: session.updatedAt,
  };
}
