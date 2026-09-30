/**
 * Unit Tests for PersistenceService
 *
 * Validates conversation persistence and recovery capabilities:
 * - Session snapshots are stored with metadata for recovery
 * - Message updates refresh stored session state
 * - Recoverable sessions exclude stale entries
 */

import { PersistenceService } from "@/services/persistenceService";
import { StorageService } from "@/services/storageService";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import type { ConversationSession, SessionMessage } from "@/types/entities";
import { LocalStorage } from "@raycast/api";

jest.mock("@/services/storageService");
jest.mock("@raycast/api");

const MockedStorageService = StorageService as jest.MockedClass<typeof StorageService>;
const mockLocalStorage = jest.mocked(LocalStorage);

describe("PersistenceService", () => {
  let persistenceService: PersistenceService;
  let storageService: jest.Mocked<StorageService>;

  const baseSession: ConversationSession = {
    sessionId: "session-123",
    agentConnectionId: "conn-1",
    agentConfigId: "agent-1",
    status: "active",
    createdAt: new Date("2025-01-01T10:00:00Z"),
    lastActivity: new Date("2025-01-01T10:05:00Z"),
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "Initial question?",
        timestamp: new Date("2025-01-01T10:00:00Z"),
        metadata: {
          source: "user",
          messageType: "text",
          sequence: 0
        }
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "Initial response.",
        timestamp: new Date("2025-01-01T10:01:00Z"),
        metadata: {
          source: "agent",
          messageType: "text",
          sequence: 1
        }
      }
    ],
    metadata: {
      title: "Initial conversation",
      priority: "normal"
    },
    context: {
      workingDirectory: "/project",
      files: [],
      additionalContext: {}
    }
  };

  const followUpMessage: SessionMessage = {
    id: "msg-3",
    role: "user",
    content: "Follow up question?",
    timestamp: new Date("2025-01-01T10:06:00Z"),
    metadata: {
      source: "user",
      messageType: "text",
      sequence: 2
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    storageService = new MockedStorageService() as jest.Mocked<StorageService>;
    storageService.saveConversation.mockResolvedValue();
    storageService.getConversation.mockResolvedValue(baseSession);
    storageService.addMessageToConversation.mockResolvedValue();

    persistenceService = new PersistenceService(storageService);
  });

  it("stores session snapshot metadata for recovery", async () => {
    mockLocalStorage.getItem.mockResolvedValueOnce(null);

    await persistenceService.saveSessionSnapshot(baseSession);

    expect(storageService.saveConversation).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: baseSession.sessionId
    }));
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.ACTIVE_SESSIONS,
      expect.stringContaining(baseSession.sessionId)
    );
  });

  it("updates snapshot when new messages are persisted", async () => {
    const existingRecord = [{
      sessionId: baseSession.sessionId,
      agentConfigId: baseSession.agentConfigId,
      createdAt: new Date("2025-01-01T10:00:00Z").toISOString(),
      lastActivity: new Date("2025-01-01T10:05:00Z").toISOString(),
      status: "active",
      messageCount: baseSession.messages.length,
      title: baseSession.metadata?.title ?? ""
    }];

    mockLocalStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingRecord));
    mockLocalStorage.setItem.mockResolvedValue(undefined);

    await persistenceService.recordMessage(baseSession.sessionId, followUpMessage);

    expect(storageService.addMessageToConversation).toHaveBeenCalledWith(baseSession.sessionId, followUpMessage);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.ACTIVE_SESSIONS,
      expect.stringContaining("\"messageCount\":3")
    );
  });

  it("filters out stale sessions when retrieving recoverable sessions", async () => {
    const now = new Date("2025-01-01T11:00:00Z");
    const freshRecord = {
      sessionId: "session-fresh",
      agentConfigId: "agent-1",
      createdAt: new Date("2025-01-01T10:50:00Z").toISOString(),
      lastActivity: new Date("2025-01-01T10:58:00Z").toISOString(),
      status: "active",
      messageCount: 4,
      title: "Fresh conversation"
    };
    const staleRecord = {
      sessionId: "session-stale",
      agentConfigId: "agent-2",
      createdAt: new Date("2025-01-01T09:00:00Z").toISOString(),
      lastActivity: new Date("2025-01-01T09:10:00Z").toISOString(),
      status: "active",
      messageCount: 2,
      title: "Stale conversation"
    };

    mockLocalStorage.getItem.mockResolvedValueOnce(JSON.stringify([freshRecord, staleRecord]));

    const recoverable = await persistenceService.getRecoverableSessions(30, now);

    expect(recoverable).toHaveLength(1);
    expect(recoverable[0].sessionId).toBe("session-fresh");
  });
});
