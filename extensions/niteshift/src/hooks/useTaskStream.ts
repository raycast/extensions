import EventSource from "eventsource";
import { useEffect, useState } from "react";
import type { ApiClient } from "../api/client";

export interface StreamMessage {
  id?: string;
  type?: string;
  timestamp?: number;
  data?: { type?: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface UseTaskStreamResult {
  messages: StreamMessage[];
  isLoading: boolean;
  isComplete: boolean;
  error: Error | null;
}

interface HistoryResponse {
  messages?: StreamMessage[];
}

export function useTaskStream(client: ApiClient, taskId: string): UseTaskStreamResult {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setIsLoading(true);
    setIsComplete(false);
    setError(null);

    // Step 1: backfill recent history
    (async () => {
      try {
        const history = await client.get<HistoryResponse>(`/api/task/${taskId}/claude/messages`, {
          limit: "50",
        });
        if (cancelled) return;
        // The CLI sees newest-first; reverse for chronological order.
        const ordered = (history.messages ?? []).slice().reverse();
        setMessages(ordered);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Step 2: open the SSE stream
    const { url, headers } = client.buildStreamUrl(`/api/task/${taskId}/claude/sse`);
    const es = new EventSource(url, { headers });

    const onEvent = (event: MessageEvent) => {
      if (cancelled) return;
      try {
        const payload = JSON.parse(event.data) as Record<string, unknown>;
        const msg = (payload.message ?? payload) as StreamMessage;
        setMessages((prev) => [...prev, msg]);
        const dataType = msg.data?.type ?? msg.type;
        if (dataType === "result" || dataType === "task_interrupted") {
          setIsComplete(true);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.addEventListener("message", onEvent as EventListener);
    es.addEventListener("history", onEvent as EventListener);
    es.onerror = () => {
      if (cancelled) return;
      setError(new Error("Stream connection error"));
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [client, taskId]);

  return { messages, isLoading, isComplete, error };
}
