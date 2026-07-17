/**
 * Unit Tests for HistoryService
 *
 * Validates conversation history aggregation capabilities:
 * - Summaries are sorted and enriched with metadata
 * - Search queries match message content and metadata
 * - Export produces structured JSON payload
 */

import { HistoryService } from "@/services/historyService";
import { StorageService } from "@/services/storageService";
import type { ConversationSession, SessionMessage } from "@/types/entities";

jest.mock("@/services/storageService");

const MockedStorageService = StorageService as jest.MockedClass<typeof StorageService>;

function message(id: string, role: SessionMessage["role"], content: string, sequence: number, timestamp: Date): SessionMessage {
  return {
    id,
    role,
    content,
    timestamp,
    metadata: {
      source: role === "user" ? "user" : "agent",
      messageType: "text",
      sequence
    }
  };
}

describe("HistoryService", () => {
  let historyService: HistoryService;
  let storageService: jest.Mocked<StorageService>;
  let conversations: ConversationSession[];

  beforeEach(() => {
    jest.clearAllMocks();

    storageService = new MockedStorageService() as jest.Mocked<StorageService>;
    historyService = new HistoryService(storageService);

    const baseTime = new Date("2025-02-01T12:00:00Z");

    conversations = [
      {
        sessionId: "session-alpha",
        agentConnectionId: "conn-1",
        agentConfigId: "agent-1",
        status: "active",
        createdAt: new Date("2025-02-01T11:50:00Z"),
        lastActivity: new Date(baseTime.getTime() - 1000 * 60 * 5),
        messages: [
          message("alpha-1", "user", "Help me refactor this TypeScript function", 0, new Date("2025-02-01T11:50:00Z")),
          message("alpha-2", "assistant", "Sure, let's start by extracting helpers.", 1, new Date("2025-02-01T11:51:00Z"))
        ],
        metadata: {
          title: "TypeScript refactor",
          tags: ["typescript", "refactor"],
          priority: "normal"
        },
        context: {
          workingDirectory: "/project",
          files: [],
          additionalContext: {}
        }
      },
      {
        sessionId: "session-beta",
        agentConnectionId: "conn-2",
        agentConfigId: "agent-2",
        status: "archived",
        createdAt: new Date("2025-01-31T09:15:00Z"),
        lastActivity: new Date(baseTime.getTime() - 1000 * 60 * 60),
        messages: [
          message("beta-1", "user", "How do I optimize this query?", 0, new Date("2025-01-31T09:15:00Z")),
          message("beta-2", "assistant", "Consider adding an index and using EXPLAIN.", 1, new Date("2025-01-31T09:16:00Z")),
          message("beta-3", "assistant", "Here is the optimized SQL.", 2, new Date("2025-01-31T09:17:00Z"))
        ],
        metadata: {
          title: "Database performance",
          tags: ["sql", "performance"],
          priority: "high"
        },
        context: {
          workingDirectory: "/project/db",
          files: [],
          additionalContext: {}
        }
      }
    ];

    storageService.getConversations.mockResolvedValue(conversations);
    storageService.getProjectContexts?.mockResolvedValue([]);
  });

  it("returns sorted conversation summaries with derived fields", async () => {
    const summaries = await historyService.getConversationSummaries();

    expect(summaries).toHaveLength(2);
    expect(summaries[0].sessionId).toBe("session-alpha");
    expect(summaries[0].messageCount).toBe(2);
    expect(summaries[0].preview).toContain("Help me refactor");
    expect(summaries[1].sessionId).toBe("session-beta");
    expect(summaries[1].status).toBe("archived");
  });

  it("filters conversations by agent and status", async () => {
    const filtered = await historyService.getConversationSummaries({
      agentIds: ["agent-2"],
      statuses: ["archived"]
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].sessionId).toBe("session-beta");
  });

  it("searches conversations by message content and tags", async () => {
    const results = await historyService.searchConversations("refactor");
    expect(results).toHaveLength(1);
    expect(results[0].sessionId).toBe("session-alpha");

    const tagResults = await historyService.searchConversations("sql");
    expect(tagResults).toHaveLength(1);
    expect(tagResults[0].sessionId).toBe("session-beta");
  });

  it("exports selected conversations as structured JSON", async () => {
    const payload = await historyService.exportConversations({
      sessionIds: ["session-beta"],
      includeContexts: false
    });

    const parsed = JSON.parse(payload);
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.sessions[0].sessionId).toBe("session-beta");
    expect(parsed.metadata.totalMessages).toBe(3);
  });
});
