import { Color } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { Session, SessionState } from "./types";

/**
 * Get sessions that have completed but haven't been seen by the user yet
 */
export function getNewCompletedSessions(sessions: Session[], lastSeenCompletedSessions: string[]): Session[] {
  return sessions.filter(
    (session) => session.state === SessionState.COMPLETED && !lastSeenCompletedSessions.includes(session.id),
  );
}

/**
 * Get sessions that have failed but haven't been seen by the user yet
 */
export function getNewFailedSessions(sessions: Session[], lastSeenFailedSessions: string[]): Session[] {
  return sessions.filter(
    (session) => session.state === SessionState.FAILED && !lastSeenFailedSessions.includes(session.id),
  );
}

/**
 * Get sessions that require user attention (e.g. plan approval)
 */
export function getAttentionSessions(sessions: Session[]): Session[] {
  return sessions.filter(
    (session) =>
      session.state === SessionState.AWAITING_PLAN_APPROVAL || session.state === SessionState.AWAITING_USER_FEEDBACK,
  );
}

/**
 * Get the appropriate menu bar icon based on session statuses and notification state
 */
export function getNotificationStatusIcon(
  sessions?: Session[],
  lastSeenCompletedSessions: string[] = [],
  lastSeenFailedSessions: string[] = [],
) {
  if (!sessions || sessions.length === 0) {
    return { source: "icon.svg", tintColor: Color.PrimaryText };
  }

  // Priority 1: Attention needed (Highest)
  const attentionSessions = getAttentionSessions(sessions);
  if (attentionSessions.length > 0) {
    return { source: "icon.svg", tintColor: Color.Yellow };
  }

  // Priority 2: New failed sessions (notification style)
  const newFailedSessions = getNewFailedSessions(sessions, lastSeenFailedSessions);
  if (newFailedSessions.length > 0) {
    return "icon-error.svg";
  }

  // Priority 3: New completed sessions (notification style)
  const newCompletedSessions = getNewCompletedSessions(sessions, lastSeenCompletedSessions);
  if (newCompletedSessions.length > 0) {
    return "icon-finished.svg";
  }

  // Priority 4: Any running session (always show)
  if (
    sessions.find(
      (session) => session.state === SessionState.IN_PROGRESS || session.state === SessionState.PLANNING, // Queued is arguably running too
    )
  ) {
    return "icon-running.svg";
  }

  // Default state
  return { source: "icon.svg", tintColor: Color.PrimaryText };
}

/**
 * Custom hook to manage session notification state
 * Automatically marks completed and failed sessions as "seen" when the component mounts/updates
 */
export function useSessionNotifications(sessions?: Session[]) {
  const [lastSeenCompletedSessions, setLastSeenCompletedSessions] = useCachedState<string[]>(
    "lastSeenCompletedSessions",
    [],
  );
  const [lastSeenFailedSessions, setLastSeenFailedSessions] = useCachedState<string[]>("lastSeenFailedSessions", []);

  const runningSessions =
    sessions?.filter(
      (session) =>
        session.state === SessionState.IN_PROGRESS ||
        session.state === SessionState.PLANNING ||
        session.state === SessionState.QUEUED,
    ) || [];

  const attentionSessions = sessions ? getAttentionSessions(sessions) : [];
  const newCompletedSessions = sessions ? getNewCompletedSessions(sessions, lastSeenCompletedSessions) : [];
  const newFailedSessions = sessions ? getNewFailedSessions(sessions, lastSeenFailedSessions) : [];

  // Auto-acknowledge: Mark completed and failed sessions as seen when menu bar is viewed
  useEffect(() => {
    if (sessions) {
      // Handle new completed sessions
      if (newCompletedSessions.length > 0) {
        const allCompletedSessionIds = sessions
          .filter((session) => session.state === SessionState.COMPLETED)
          .map((session) => session.id);
        setLastSeenCompletedSessions(allCompletedSessionIds);
      }

      // Handle new failed sessions
      if (newFailedSessions.length > 0) {
        const allFailedSessionIds = sessions
          .filter((session) => session.state === SessionState.FAILED)
          .map((session) => session.id);
        setLastSeenFailedSessions(allFailedSessionIds);
      }
    }
  }, [
    sessions,
    newCompletedSessions.length,
    newFailedSessions.length,
    setLastSeenCompletedSessions,
    setLastSeenFailedSessions,
  ]);

  // Determine what to show in title: attention > running > failures > completed
  const titleCount =
    attentionSessions.length > 0
      ? attentionSessions.length.toString()
      : runningSessions.length > 0
        ? runningSessions.length.toString()
        : newFailedSessions.length > 0
          ? newFailedSessions.length.toString()
          : newCompletedSessions.length > 0
            ? newCompletedSessions.length.toString()
            : undefined;

  // Get the appropriate status icon
  const statusIcon = getNotificationStatusIcon(sessions, lastSeenCompletedSessions, lastSeenFailedSessions);

  return {
    runningSessions,
    attentionSessions,
    newCompletedSessions,
    newFailedSessions,
    lastSeenCompletedSessions,
    lastSeenFailedSessions,
    titleCount,
    statusIcon,
  };
}
