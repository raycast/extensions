import {
  clearStreamSession,
  readStreamSession,
  registerStreamSession,
  requestStreamStop,
  startStreamStopPolling,
} from "./stream-stop";

export type StreamingSession = {
  generation: number;
  sessionId: string;
  abortController: AbortController;
  stopPolling: () => void;
};

type ActiveStreamingSession = StreamingSession;

let activeStreamingSession: ActiveStreamingSession | null = null;
let nextStreamingGeneration = 0;

export async function beginStreamingSession(): Promise<StreamingSession> {
  if (activeStreamingSession) {
    activeStreamingSession.stopPolling();
    activeStreamingSession.abortController.abort();
  }

  nextStreamingGeneration += 1;
  const generation = nextStreamingGeneration;
  const sessionId = await registerStreamSession();
  const abortController = new AbortController();
  const stopPolling = startStreamStopPolling(sessionId, abortController);

  activeStreamingSession = { generation, sessionId, abortController, stopPolling };
  return activeStreamingSession;
}

export function endStreamingSession(session: StreamingSession): void {
  session.stopPolling();

  if (activeStreamingSession?.generation === session.generation) {
    activeStreamingSession = null;
  }

  void clearStreamSession(session.sessionId).catch(() => undefined);
}

export function isActiveStreamingSession(generation: number): boolean {
  return activeStreamingSession?.generation === generation;
}

export async function abortActiveStreamingRequest(): Promise<boolean> {
  let stopped = false;

  if (activeStreamingSession) {
    activeStreamingSession.stopPolling();
    activeStreamingSession.abortController.abort();
    activeStreamingSession = null;
    stopped = true;
  }

  try {
    const session = await readStreamSession();
    if (session) {
      await requestStreamStop(session.sessionId);
      stopped = true;
    }
  } catch {
    // Missing or stale marker should be harmless.
  }

  return stopped;
}

export function resetActiveStreamingSessionForTests(): void {
  activeStreamingSession = null;
  nextStreamingGeneration = 0;
}
