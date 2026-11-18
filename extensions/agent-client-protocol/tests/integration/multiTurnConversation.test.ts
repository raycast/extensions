/**
 * Integration test for multi-turn conversation flow
 *
 * Exercises SessionService together with PersistenceService and HistoryService
 * to ensure conversations remain recoverable across multiple turns.
 */

import { SessionService } from "@/services/sessionService";
import { StorageService } from "@/services/storageService";
import { PersistenceService, type ActiveSessionRecord } from "@/services/persistenceService";
import { HistoryService } from "@/services/historyService";
import type { AgentConfig } from "@/types/extension";
import type {
  PromptResponse,
  SessionUpdateNotification
} from "@/types/acp";
import type { SessionMessage } from "@/types/entities";
import { LocalStorage } from "@raycast/api";

jest.mock("@/services/storageService");
jest.mock("@raycast/api");

const MemoryStorage = StorageService as jest.MockedClass<typeof StorageService>;
const mockLocalStorage = jest.mocked(LocalStorage);

class FakeACPClient {
  private listener: ((update: SessionUpdateNotification) => void) | null = null;
  private sessionCounter = 0;

  registerSessionUpdateListener(callback: (update: SessionUpdateNotification) => void): void {
    this.listener = callback;
  }

  unregisterSessionUpdateListener(callback: (update: SessionUpdateNotification) => void): void {
    if (this.listener === callback) {
      this.listener = null;
    }
  }

  async createSession(): Promise<{ sessionId: string }> {
    this.sessionCounter += 1;
    return { sessionId: `acp-session-${this.sessionCounter}` };
  }

  async sendPrompt(sessionId: string, prompt: string): Promise<PromptResponse> {
    const responseText = `Agent: ${prompt.split("\n").pop()?.trim() ?? prompt}`;
    if (this.listener) {
      this.listener({
        sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: responseText }
        }
      });
    }
    return {
      stopReason: "completed"
    };
  }

  async endSession(): Promise<void> {
    // no-op for tests
  }

  async checkConnection(): Promise<boolean> {
    return true;
  }

  async connect(): Promise<void> {
    // no-op
  }

  async disconnect(): Promise<void> {
    // no-op
  }
}

describe("Multi-turn conversation flow", () => {
  let storageService: jest.Mocked<StorageService>;
  let persistenceService: PersistenceService;
  let historyService: HistoryService;
  let sessionService: SessionService;
  let acpClient: FakeACPClient;
  let activeSessions: ActiveSessionRecord[];

  const memoryStore = new Map<string, string>();

  const agentConfig: AgentConfig = {
    id: "agent-1",
    name: "Test Agent",
    type: "subprocess",
    command: "/bin/echo",
    args: ["agent"],
    createdAt: new Date("2025-01-01T00:00:00Z")
  };

  beforeEach(() => {
    jest.clearAllMocks();
    memoryStore.clear();

    mockLocalStorage.getItem.mockImplementation(async (key: string) => memoryStore.get(key) ?? null);
    mockLocalStorage.setItem.mockImplementation(async (key: string, value: string) => {
      memoryStore.set(key, value);
    });
    mockLocalStorage.removeItem.mockImplementation(async (key: string) => {
      memoryStore.delete(key);
    });
    mockLocalStorage.clear.mockImplementation(async () => {
      memoryStore.clear();
    });

    storageService = new MemoryStorage() as jest.Mocked<StorageService>;
    storageService.initialize.mockResolvedValue();

    const conversations: SessionMessage[][] = [];
    let storedSessions: any[] = [];

    storageService.saveConversation.mockImplementation(async (session) => {
      const existingIndex = storedSessions.findIndex((c) => c.sessionId === session.sessionId);
      const serialized = JSON.parse(JSON.stringify(session));
      if (existingIndex >= 0) {
        storedSessions[existingIndex] = serialized;
      } else {
        storedSessions.push(serialized);
      }
    });

    storageService.getConversation.mockImplementation(async (sessionId: string) => {
      const session = storedSessions.find((c) => c.sessionId === sessionId);
      return session ? {
        ...session,
        createdAt: new Date(session.createdAt),
        lastActivity: new Date(session.lastActivity),
        messages: session.messages.map((m: SessionMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      } : null;
    });

    storageService.addMessageToConversation.mockImplementation(async (sessionId: string, message: SessionMessage) => {
      const session = storedSessions.find((c) => c.sessionId === sessionId);
      if (session) {
        session.messages.push({
          ...message,
          timestamp: message.timestamp.toISOString()
        });
        session.lastActivity = message.timestamp.toISOString();
      }
    });

    storageService.getConversations.mockImplementation(async () => {
      return storedSessions.map((session) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        lastActivity: new Date(session.lastActivity),
        messages: session.messages.map((m: SessionMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }));
    });

    storageService.getProjectContexts?.mockResolvedValue([]);

    acpClient = new FakeACPClient();
    persistenceService = new PersistenceService(storageService);
    historyService = new HistoryService(storageService);
    sessionService = new SessionService(storageService, acpClient as any, undefined, persistenceService);
  });

  it("persists and recovers multi-turn conversations", async () => {
    const session = await sessionService.createSession({
      agentConnectionId: "conn-1",
      agentConfigId: agentConfig.id,
      prompt: "How do I write a loop in TypeScript?",
      context: {
        workingDirectory: "/project",
        files: [],
        additionalContext: {}
      }
    });

    await sessionService.sendMessage(session.sessionId, "Refine the example with error handling.", agentConfig);
    await sessionService.sendMessage(session.sessionId, "Add logging statements as well.", agentConfig);

    const summaries = await historyService.getConversationSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].messageCount).toBeGreaterThanOrEqual(3);
    expect(summaries[0].preview.toLowerCase()).toContain("loop");

    const recoverable = await persistenceService.getRecoverableSessions(120);
    expect(recoverable).toHaveLength(1);
    expect(recoverable[0].sessionId).toBe(session.sessionId);

    const exported = await historyService.exportConversations({ includeContexts: true });
    const payload = JSON.parse(exported);
    expect(payload.sessions[0].messages.length).toBeGreaterThanOrEqual(3);
  });
});
