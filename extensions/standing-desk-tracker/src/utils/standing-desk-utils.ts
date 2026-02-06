import { LocalStorage } from "@raycast/api";

export type DeskState = "standing" | "sitting";

export interface Session {
  type: DeskState;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
}

export interface Stats {
  totalStanding: number; // in seconds
  totalSitting: number; // in seconds
  totalTime: number; // in seconds
  standingPercentage: number;
  sittingPercentage: number;
  sessionCount: number;
  averageSessionDuration: number; // in seconds
  longestSession: number; // in seconds
  shortestSession: number; // in seconds
}

const CURRENT_STATE_KEY = "standing-desk-current-state";
const CURRENT_START_TIME_KEY = "standing-desk-current-start-time";
const SESSIONS_KEY = "standing-desk-sessions";

export async function getCurrentState(): Promise<{
  state: DeskState | null;
  startTime: number | null;
}> {
  const [state, startTime] = await Promise.all([
    LocalStorage.getItem<string>(CURRENT_STATE_KEY),
    LocalStorage.getItem<number>(CURRENT_START_TIME_KEY),
  ]);

  return {
    state: (state as DeskState) || null,
    startTime: (startTime as number) || null,
  };
}

export async function setState(
  state: DeskState,
  timestamp: number,
): Promise<void> {
  await Promise.all([
    LocalStorage.setItem(CURRENT_STATE_KEY, state),
    LocalStorage.setItem(CURRENT_START_TIME_KEY, timestamp),
  ]);
}

export async function endCurrentSession(): Promise<Session | null> {
  const { state, startTime } = await getCurrentState();

  if (!state || !startTime) {
    return null;
  }

  const endTime = Date.now();
  const duration = Math.floor((endTime - startTime) / 1000);

  const session: Session = {
    type: state,
    startTime,
    endTime,
    duration,
  };

  // Get existing sessions
  const existingSessions = await getSessions();
  existingSessions.push(session);

  // Save updated sessions
  await LocalStorage.setItem(SESSIONS_KEY, JSON.stringify(existingSessions));

  // Clear current state
  await Promise.all([
    LocalStorage.removeItem(CURRENT_STATE_KEY),
    LocalStorage.removeItem(CURRENT_START_TIME_KEY),
  ]);

  return session;
}

export async function getSessions(): Promise<Session[]> {
  const sessionsJson = await LocalStorage.getItem<string>(SESSIONS_KEY);
  if (!sessionsJson) {
    return [];
  }

  try {
    return JSON.parse(sessionsJson) as Session[];
  } catch {
    return [];
  }
}

export function getSessionsForPeriod(
  sessions: Session[],
  period: "day" | "week" | "month",
): Session[] {
  const now = new Date();
  const cutoff = new Date();

  switch (period) {
    case "day":
      cutoff.setHours(0, 0, 0, 0);
      break;
    case "week": {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
      cutoff.setDate(diff);
      cutoff.setHours(0, 0, 0, 0);
      break;
    }
    case "month":
      cutoff.setDate(1);
      cutoff.setHours(0, 0, 0, 0);
      break;
  }

  const cutoffTime = cutoff.getTime();

  return sessions.filter((session) => {
    const sessionDate = new Date(session.startTime);
    return sessionDate.getTime() >= cutoffTime;
  });
}

export function calculateStats(sessions: Session[]): Stats {
  if (sessions.length === 0) {
    return {
      totalStanding: 0,
      totalSitting: 0,
      totalTime: 0,
      standingPercentage: 0,
      sittingPercentage: 0,
      sessionCount: 0,
      averageSessionDuration: 0,
      longestSession: 0,
      shortestSession: 0,
    };
  }

  const standingSessions = sessions.filter((s) => s.type === "standing");
  const sittingSessions = sessions.filter((s) => s.type === "sitting");

  const totalStanding = standingSessions.reduce(
    (sum, s) => sum + s.duration,
    0,
  );
  const totalSitting = sittingSessions.reduce((sum, s) => sum + s.duration, 0);
  const totalTime = totalStanding + totalSitting;

  const standingPercentage =
    totalTime > 0 ? (totalStanding / totalTime) * 100 : 0;
  const sittingPercentage =
    totalTime > 0 ? (totalSitting / totalTime) * 100 : 0;

  const durations = sessions.map((s) => s.duration);
  const averageSessionDuration =
    durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const longestSession = Math.max(...durations);
  const shortestSession = Math.min(...durations);

  return {
    totalStanding,
    totalSitting,
    totalTime,
    standingPercentage,
    sittingPercentage,
    sessionCount: sessions.length,
    averageSessionDuration,
    longestSession,
    shortestSession,
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }

  if (secs > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${minutes}m`;
}

export async function getCurrentSessionElapsedTime(): Promise<number> {
  const { startTime } = await getCurrentState();
  if (!startTime) {
    return 0;
  }

  const now = Date.now();
  return Math.floor((now - startTime) / 1000);
}
