import { LocalStorage } from "@raycast/api";
import { ShareSession, StoredSession } from "./types";
import { exec } from "child_process";
import { promisify } from "util";

const STORAGE_KEY = "sendme-sessions";
const execAsync = promisify(exec);

export const globalSessions = {
  sessions: [] as ShareSession[],
  listeners: new Set<() => void>(),

  addSession(session: ShareSession) {
    if (this.sessions.some((s) => s.id === session.id)) return;
    this.sessions.push(session);
    this.notifyListeners();
  },

  removeSession(id: string) {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    this.notifyListeners();
  },

  getSessions() {
    return [...this.sessions];
  },

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },

  notifyListeners() {
    this.listeners.forEach((listener) => listener());
  },

  getStorableSessions(): StoredSession[] {
    return this.sessions
      .filter((s) => s.pid !== undefined)
      .map((s) => ({
        id: s.id,
        pid: s.pid as number,
        ticket: s.ticket,
        filePath: s.filePath,
        fileName: s.fileName,
        startTime: s.startTime.toISOString(),
      }));
  },

  async persistSessions() {
    try {
      const sessions = this.getStorableSessions();
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to persist sessions:", error);
    }
  },

  async loadSessions() {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored) {
        const sessions = JSON.parse(stored) as StoredSession[];
        sessions.forEach((s) => {
          const session: ShareSession = {
            ...s,
            process: null,
            startTime: new Date(s.startTime),
            isDetached: true,
          };
          this.addSession(session);
        });
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  },

  async stopSession(id: string) {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) return;

    try {
      if (session.isDetached && session.pid) {
        try {
          process.kill(session.pid);
        } catch (e) {
          await execAsync(`kill -9 ${session.pid}`);
        }
      } else if (session.process?.pid) {
        try {
          process.kill(-session.process.pid);
        } catch (e) {
          session.process.kill();
        }
      }

      this.removeSession(id);
      await this.persistSessions();
    } catch (error) {
      console.error("Error stopping session:", error);
      throw error;
    }
  },

  async stopAllSessions(): Promise<void> {
    const sessionsToStop = [...this.sessions];

    for (const session of sessionsToStop) {
      try {
        await this.stopSession(session.id);
      } catch (error) {
        console.error(`Error stopping session ${session.id}:`, error);
      }
    }

    this.sessions = [];
    this.notifyListeners();
    await this.persistSessions();
  },
};
