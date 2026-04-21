/**
 * PersistenceService - Conversation snapshot management
 *
 * Maintains lightweight metadata for active conversations so that
 * sessions can be recovered after extension reloads or Raycast restarts.
 */

import { LocalStorage } from "@raycast/api";
import type { ConversationSession, SessionMessage } from "@/types/entities";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { StorageService } from "./storageService";
import { createLogger } from "@/utils/logging";

const logger = createLogger("PersistenceService");

export type ActiveSessionStatus = "active" | "recoverable" | "completed";

export interface ActiveSessionRecord {
  sessionId: string;
  agentConfigId: string;
  createdAt: string;
  lastActivity: string;
  status: ActiveSessionStatus;
  messageCount: number;
  title?: string;
}

const MAX_ACTIVE_SESSIONS = 25;

export class PersistenceService {
  constructor(private readonly storageService: StorageService = new StorageService()) {}

  /**
   * Persist a full session snapshot and refresh metadata for recovery.
   */
  async saveSessionSnapshot(session: ConversationSession): Promise<void> {
    await this.storageService.saveConversation(session);

    const records = await this.readActiveRecords();
    const updatedRecord = this.toRecord(session);
    const existingIndex = records.findIndex((record) => record.sessionId === session.sessionId);

    if (existingIndex >= 0) {
      records[existingIndex] = updatedRecord;
    } else {
      records.push(updatedRecord);
    }

    await this.writeActiveRecords(this.trimRecords(records));
  }

  /**
   * Record an additional message for a session and refresh metadata.
   */
  async recordMessage(sessionId: string, message: SessionMessage): Promise<void> {
    await this.storageService.addMessageToConversation(sessionId, message);

    const session = await this.storageService.getConversation(sessionId);
    const records = await this.readActiveRecords();
    const existingIndex = records.findIndex((record) => record.sessionId === sessionId);

    if (session) {
      const existing = existingIndex >= 0 ? records[existingIndex] : null;
      const hasMessage = session.messages.some((entry) => entry.id === message.id);
      const messages = hasMessage
        ? session.messages.map((entry) => (entry.id === message.id ? message : entry))
        : [...session.messages, message];
      const sessionSnapshot: ConversationSession = {
        ...session,
        messages,
        lastActivity: message.timestamp,
      };

      await this.storageService.saveConversation(sessionSnapshot);

      const updatedRecord = this.toRecord(sessionSnapshot);
      if (existing && updatedRecord.messageCount <= existing.messageCount) {
        updatedRecord.messageCount = existing.messageCount + 1;
      }
      if (existingIndex >= 0) {
        records[existingIndex] = updatedRecord;
      } else {
        records.push(updatedRecord);
      }
    } else if (existingIndex >= 0) {
      const existing = records[existingIndex];
      records[existingIndex] = {
        ...existing,
        lastActivity: new Date().toISOString(),
        messageCount: existing.messageCount + 1,
        status: "active",
      };
    }

    await this.writeActiveRecords(this.trimRecords(records));
  }

  /**
   * Mark a session as completed and remove it from active tracking.
   */
  async markSessionCompleted(sessionId: string): Promise<void> {
    const records = await this.readActiveRecords();
    const filtered = records.filter((record) => record.sessionId !== sessionId);
    await this.writeActiveRecords(filtered);
  }

  /**
   * Retrieve recoverable session metadata within a time window.
   */
  async getRecoverableSessions(maxAgeMinutes = 120, now: Date = new Date()): Promise<ActiveSessionRecord[]> {
    const records = await this.readActiveRecords();
    const cutoff = now.getTime() - maxAgeMinutes * 60 * 1000;

    return records
      .filter((record) => record.status !== "completed")
      .filter((record) => {
        const lastActivity = new Date(record.lastActivity).getTime();
        return Number.isFinite(lastActivity) && lastActivity >= cutoff;
      })
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }

  /**
   * Restore a session snapshot from persistent storage.
   */
  async restoreSession(sessionId: string): Promise<ConversationSession | null> {
    return this.storageService.getConversation(sessionId);
  }

  private async readActiveRecords(): Promise<ActiveSessionRecord[]> {
    const raw = await LocalStorage.getItem(STORAGE_KEYS.ACTIVE_SESSIONS);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(String(raw)) as ActiveSessionRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      logger.warn("Failed to parse active session metadata", { error });
      return [];
    }
  }

  private async writeActiveRecords(records: ActiveSessionRecord[]): Promise<void> {
    await LocalStorage.setItem(STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(records));
  }

  private toRecord(session: ConversationSession): ActiveSessionRecord {
    return {
      sessionId: session.sessionId,
      agentConfigId: session.agentConfigId,
      createdAt: session.createdAt.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      status: session.status === "completed" ? "completed" : "active",
      messageCount: session.messages.length,
      title: session.metadata?.title,
    };
  }

  private trimRecords(records: ActiveSessionRecord[]): ActiveSessionRecord[] {
    if (records.length <= MAX_ACTIVE_SESSIONS) {
      return records;
    }

    return records
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, MAX_ACTIVE_SESSIONS);
  }
}
