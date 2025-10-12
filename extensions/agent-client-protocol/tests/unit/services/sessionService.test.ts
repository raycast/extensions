/**
 * Unit Tests for SessionService
 *
 * Focused on session creation and continuation flows including:
 * - Creating a new session with initial prompt
 * - Continuing a stored conversation with a new agent session
 */

import { SessionService } from "@/services/sessionService";
import { StorageService } from "@/services/storageService";
import { ACPClient } from "@/services/acpClient";
import { PersistenceService } from "@/services/persistenceService";
import { ErrorCode } from "@/types/extension";
import type { ConversationSession, SessionMessage, SessionRequest } from "@/types/entities";
import type { AgentConfig } from "@/types/extension";

jest.mock("@/services/storageService");
jest.mock("@/services/acpClient");
jest.mock("uuid", () => ({ v4: jest.fn(() => "uuid-123") }));

const MockedStorageService = StorageService as jest.MockedClass<typeof StorageService>;
const MockedACPClient = ACPClient as jest.MockedClass<typeof ACPClient>;

describe("SessionService", () => {
  let sessionService: SessionService;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockACPClient: jest.Mocked<ACPClient>;
  let mockPersistenceService: PersistenceService;
  let persistenceSpies: {
    saveSessionSnapshot: jest.Mock;
    recordMessage: jest.Mock;
    markSessionCompleted: jest.Mock;
    getRecoverableSessions: jest.Mock;
  };

  const baseSessionRequest: SessionRequest = {
    agentConnectionId: "conn-123",
    agentConfigId: "agent-config-1",
    prompt: "Help me with TypeScript",
    context: {
      workingDirectory: "/project",
      files: ["/project/index.ts"],
      additionalContext: {}
    }
  };

  const agentConfig: AgentConfig = {
    id: "agent-config-1",
    name: "Gemini CLI",
    type: "subprocess",
    command: "/usr/bin/gemini",
    args: ["--acp"],
    workingDirectory: "/project",
    createdAt: new Date("2025-01-01T00:00:00Z")
  };

  const userMessage = (content: string, sequence: number): SessionMessage => ({
    id: `user-${sequence}`,
    role: "user",
    content,
    timestamp: new Date(),
    metadata: {
      source: "user",
      messageType: "text",
      sequence
    }
  });

  const assistantMessage = (content: string, sequence: number): SessionMessage => ({
    id: `assistant-${sequence}`,
    role: "assistant",
    content,
    timestamp: new Date(),
    metadata: {
      source: "agent",
      messageType: "text",
      sequence
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockStorageService = new MockedStorageService() as jest.Mocked<StorageService>;
    mockACPClient = new MockedACPClient() as jest.Mocked<ACPClient>;
    mockACPClient.registerSessionUpdateListener = jest.fn();
    mockACPClient.unregisterSessionUpdateListener = jest.fn();

    mockStorageService.initialize.mockResolvedValue();
    mockStorageService.saveConversation.mockResolvedValue();
    mockStorageService.getConversation.mockResolvedValue(null);
    mockStorageService.getConversations.mockResolvedValue([]);
    mockStorageService.addMessageToConversation.mockResolvedValue();
    mockStorageService.deleteConversation.mockResolvedValue?.();
    mockStorageService.archiveConversation.mockResolvedValue?.();

    mockACPClient.connect.mockResolvedValue({
      id: "conn-123",
      name: "Gemini CLI",
      status: "connected",
      capabilities: {} as any,
      protocolVersion: 1,
      lastSeen: new Date()
    } as any);
    mockACPClient.createSession.mockResolvedValue({ sessionId: "acp-session" } as any);
    mockACPClient.sendPrompt.mockResolvedValue({ stopReason: "completed", messages: [] } as any);
    mockACPClient.disconnect.mockResolvedValue?.();

    persistenceSpies = {
      saveSessionSnapshot: jest.fn(async (session: ConversationSession) => {
        await mockStorageService.saveConversation(session);
      }),
      recordMessage: jest.fn(async (sessionId: string, message: SessionMessage) => {
        await mockStorageService.addMessageToConversation(sessionId, message);
      }),
      markSessionCompleted: jest.fn().mockResolvedValue(undefined),
      getRecoverableSessions: jest.fn().mockResolvedValue([])
    };
    mockPersistenceService = persistenceSpies as unknown as PersistenceService;

    sessionService = new SessionService(
      mockStorageService,
      mockACPClient,
      undefined,
      mockPersistenceService
    );

  });

  describe("createSession", () => {
    it("creates a session and stores agent session id", async () => {
      mockACPClient.createSession.mockResolvedValue({ sessionId: "acp-session-1" } as any);
      mockACPClient.sendPrompt.mockResolvedValue({
        stopReason: "completed",
        messages: [
          {
            id: "agent-msg-1",
            type: "agent",
            timestamp: Date.now(),
            content: [
              {
                type: "content",
                content: {
                  type: "text",
                  text: "Sure, here's how..."
                }
              }
            ],
            metadata: {}
          }
        ]
      } as any);
      mockStorageService.saveConversation.mockResolvedValue();

      const session = await sessionService.createSession(baseSessionRequest);

      expect(session.agentSessionId).toBe("acp-session-1");
      // Only user message is included initially; agent responses come via streaming callbacks
      expect(session.messages).toHaveLength(1); // user only
      expect(mockACPClient.sendPrompt).toHaveBeenCalledWith(
        "acp-session-1",
        baseSessionRequest.prompt
      );
      expect(mockStorageService.saveConversation).toHaveBeenCalledWith(expect.objectContaining({
        agentSessionId: "acp-session-1",
        agentConfigId: "agent-config-1"
      }));
    });

    it("throws when agent config id missing", async () => {
      const { agentConfigId, ...requestWithoutId } = baseSessionRequest;

      await expect(
        sessionService.createSession(requestWithoutId as SessionRequest)
      ).rejects.toMatchObject({
        code: ErrorCode.InvalidConfiguration
      });
    });
  });

  describe("sendMessage", () => {
    it("re-establishes agent session when absent and appends response", async () => {
      const storedConversation: ConversationSession = {
        sessionId: "session-123",
        agentConnectionId: "conn-123",
        agentConfigId: "agent-config-1",
        status: "active",
        createdAt: new Date(),
        lastActivity: new Date(),
        messages: [userMessage("Initial question", 0), assistantMessage("Initial answer", 1)]
      };

      mockStorageService.getConversation.mockResolvedValue({ ...storedConversation });
      mockStorageService.addMessageToConversation.mockResolvedValue();
      mockStorageService.saveConversation.mockResolvedValue();

      mockACPClient.createSession.mockResolvedValue({ sessionId: "acp-resume" } as any);
      mockACPClient.sendPrompt.mockResolvedValue({
        stopReason: "completed",
        messages: [
          {
            id: "agent-msg-2",
            type: "agent",
            timestamp: Date.now(),
            content: [
              {
                type: "content",
                content: {
                  type: "text",
                  text: "Here is an update."
                }
              }
            ],
            metadata: { processingTime: 1200 }
          }
        ]
      } as any);

      const response = await sessionService.sendMessage(
        "session-123",
        "Please elaborate",
        agentConfig
      );

      expect(mockACPClient.createSession).toHaveBeenCalled();
      // When creating a new ACP session (session recovery), history should be sent
      expect(mockACPClient.sendPrompt).toHaveBeenCalledWith(
        "acp-resume",
        expect.stringContaining("Conversation history")
      );
      // Only user message is saved synchronously; agent responses come via streaming
      expect(mockStorageService.addMessageToConversation).toHaveBeenCalledWith(
        "session-123",
        expect.objectContaining({
          content: "Please elaborate",
          role: "user"
        })
      );
    });

    it("throws when conversation agent differs from provided agent", async () => {
      const storedConversation: ConversationSession = {
        sessionId: "session-999",
        agentConnectionId: "conn-456",
        agentConfigId: "other-agent",
        status: "active",
        createdAt: new Date(),
        lastActivity: new Date(),
        messages: []
      };

      mockStorageService.getConversation.mockResolvedValue(storedConversation);

      await expect(
        sessionService.sendMessage("session-999", "Hello", agentConfig)
      ).rejects.toMatchObject({
        code: ErrorCode.InvalidConfiguration
      });
    });
  });

  describe("session update handling", () => {
    it("persists tool call output content when tool call completes", async () => {
      const existingSession: ConversationSession = {
        sessionId: "session-777",
        agentConnectionId: "conn-123",
        agentConfigId: "agent-config-1",
        status: "active",
        createdAt: new Date(),
        lastActivity: new Date(),
        messages: [userMessage("Run the list files tool", 0)]
      };

      mockStorageService.getConversation.mockResolvedValue(existingSession);

      const updateListener = mockACPClient.registerSessionUpdateListener.mock.calls[0][0];

      const toolUpdate = {
        sessionId: existingSession.sessionId,
        update: {
          sessionUpdate: "tool_call_update",
          toolCallId: "tool-42",
          status: "completed",
          content: [
            {
              type: "content",
              content: {
                type: "text",
                text: "Directory listing:\n- src\n- tests"
              }
            }
          ]
        }
      };

      await updateListener(toolUpdate as any);

      expect(persistenceSpies.saveSessionSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "tool",
              content: expect.stringContaining("Directory listing"),
              metadata: expect.objectContaining({
                messageType: "tool_result"
              })
            })
          ])
        })
      );
    });
  });
});
