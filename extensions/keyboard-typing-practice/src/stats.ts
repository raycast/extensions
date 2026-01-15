import { LocalStorage } from "@raycast/api";

export type Session = {
  id: string;
  prompt: string;
  inputLength: number;
  correctChars: number;
  errorChars: number;
  durationMs: number;
  wpm: number;
  accuracy: number;
  timestamp: number;
};

export type Stats = {
  totalSessions: number;
  totalChars: number;
  totalCorrect: number;
  totalErrors: number;
  bestWpm: number;
  totalWpm: number;
  sessions: Session[];
  lastSession?: Session;
};

const STORAGE_KEY = "typing-practice-stats";

function defaultStats(): Stats {
  return {
    totalSessions: 0,
    totalChars: 0,
    totalCorrect: 0,
    totalErrors: 0,
    bestWpm: 0,
    totalWpm: 0,
    sessions: [],
  };
}

export async function loadStats(): Promise<Stats> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) {
    return defaultStats();
  }

  try {
    const parsed = JSON.parse(stored) as Stats;
    return {
      ...defaultStats(),
      ...parsed,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return defaultStats();
  }
}

export async function saveSession(session: Session): Promise<Stats> {
  const stats = await loadStats();
  const updatedSessions = [session, ...stats.sessions].slice(0, 50);

  const nextStats: Stats = {
    ...stats,
    totalSessions: stats.totalSessions + 1,
    totalChars: stats.totalChars + session.inputLength,
    totalCorrect: stats.totalCorrect + session.correctChars,
    totalErrors: stats.totalErrors + session.errorChars,
    bestWpm: Math.max(stats.bestWpm, session.wpm),
    totalWpm: stats.totalWpm + session.wpm,
    sessions: updatedSessions,
    lastSession: session,
  };

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats));
  return nextStats;
}
