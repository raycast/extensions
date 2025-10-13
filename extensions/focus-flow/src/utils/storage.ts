import { LocalStorage } from "@raycast/api";
import type { TeamData, UserStats, StudySession } from "../types";

export class Storage {
  private static readonly KEYS = {
    TEAM: "current_team",
    USERNAME: "username",
    STATS: "user_stats",
    SESSION: "current_session",
    LAST_SESSION: "last_session",
  };

  static async getTeam(): Promise<TeamData | null> {
    const data = await LocalStorage.getItem<string>(this.KEYS.TEAM);
    return data ? JSON.parse(data) : null;
  }

  static async setTeam(team: TeamData): Promise<void> {
    await LocalStorage.setItem(this.KEYS.TEAM, JSON.stringify(team));
  }

  static async getUsername(): Promise<string | null> {
    const username = await LocalStorage.getItem<string>(this.KEYS.USERNAME);
    return username ?? null;
  }

  static async setUsername(username: string): Promise<void> {
    await LocalStorage.setItem(this.KEYS.USERNAME, username);
  }

  static async getStats(): Promise<UserStats | null> {
    const data = await LocalStorage.getItem<string>(this.KEYS.STATS);
    return data ? JSON.parse(data) : null;
  }

  static async setStats(stats: UserStats): Promise<void> {
    await LocalStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
  }

  static async getSession(): Promise<StudySession | null> {
    const data = await LocalStorage.getItem<string>(this.KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  }

  static async setSession(session: StudySession): Promise<void> {
    await LocalStorage.setItem(this.KEYS.SESSION, JSON.stringify(session));
  }

  static async getLastSession(): Promise<StudySession | null> {
    const data = await LocalStorage.getItem<string>(this.KEYS.LAST_SESSION);
    return data ? JSON.parse(data) : null;
  }

  static async setLastSession(session: StudySession): Promise<void> {
    await LocalStorage.setItem(this.KEYS.LAST_SESSION, JSON.stringify(session));
  }

  static async clearLastSession(): Promise<void> {
    await LocalStorage.removeItem(this.KEYS.LAST_SESSION);
  }

  static async clearCurrentSession(): Promise<void> {
    await LocalStorage.removeItem(this.KEYS.SESSION);
  }

  static async clearUserStats(): Promise<void> {
    await LocalStorage.removeItem(this.KEYS.STATS);
  }

  static async updateStats(additionalMinutes: number, sessionIncrement: number): Promise<void> {
    const username = await this.getUsername();
    if (!username) return;

    const today = new Date().toDateString();
    const currentStats = await this.getStats();

    const newStats: UserStats = {
      username,
      totalMinutes: (currentStats?.totalMinutes || 0) + additionalMinutes,
      sessionsToday:
        currentStats?.lastStudyDate === today
          ? (currentStats.sessionsToday || 0) + sessionIncrement
          : sessionIncrement > 0
            ? 1
            : 0,
      lastStudyDate: today,
      longestSession: Math.max(currentStats?.longestSession || 0, additionalMinutes),
      totalSessions: (currentStats?.totalSessions || 0) + sessionIncrement,
    };

    await this.setStats(newStats);
  }

  static async clearTeam(): Promise<void> {
    await LocalStorage.removeItem(this.KEYS.TEAM);
  }

  static async clearAll(): Promise<void> {
    for (const key of Object.values(this.KEYS)) {
      await LocalStorage.removeItem(key);
    }
  }
}
