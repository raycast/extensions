import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { fetchSessionsForTask, fetchSessionLogs } from "../services/events";
import { processAndGroupLogs } from "../services/event-grouping";
import type { SessionLogs } from "../services/events";

const TERMINAL_SESSION_STATES = new Set(["completed", "failed", "cancelled", "stopped"]);
const POLL_INTERVAL_MS = 5000;

/**
 * Fetches all sessions and their logs for a task, returning fully processed
 * and grouped log entries per session.
 */
async function fetchTaskLogs(taskId: string): Promise<SessionLogs[]> {
  const sessions = await fetchSessionsForTask(taskId);

  // Sort sessions by created_at ascending (oldest first)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const results = await Promise.all(
    sortedSessions.map(async (session) => {
      const rawLogs = await fetchSessionLogs(session.id);
      const groupedEntries = processAndGroupLogs(rawLogs);
      return { session, groupedEntries } as SessionLogs;
    }),
  );

  return results;
}

export function useTaskLogs(taskId: string) {
  const { data, isLoading, revalidate } = useCachedPromise(fetchTaskLogs, [taskId], {
    initialData: [],
    keepPreviousData: true,
  });

  const sessionLogs = data ?? [];

  // Check if any session is still active (non-terminal state)
  const hasActiveSession = sessionLogs.some((se) => !TERMINAL_SESSION_STATES.has(se.session.state));

  // Poll while any session is still running
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  useEffect(() => {
    if (hasActiveSession && !isLoading) {
      timerRef.current = setInterval(() => revalidate(), POLL_INTERVAL_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasActiveSession, isLoading, revalidate]);

  return {
    sessionLogs,
    isLoading: isLoading || hasActiveSession,
    hasActiveSession,
    revalidate,
  };
}
