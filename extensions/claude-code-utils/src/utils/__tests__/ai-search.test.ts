// COMMENTED OUT - AI SEARCH FEATURE TEMPORARILY DISABLED
// import { AI } from "@raycast/api";
import {
  // COMMENTED OUT - AI SEARCH FEATURE TEMPORARILY DISABLED
  // semanticSearch,
  normalSearch,
  // semanticSearchSnippets,
  normalSearchSnippets,
} from "../ai-search";
import { ParsedMessage, Snippet } from "../claude-message";

// COMMENTED OUT - AI SEARCH FEATURE TEMPORARILY DISABLED
// jest.mock("@raycast/api");

describe("aiSearch", () => {
  const mockMessages: ParsedMessage[] = [
    {
      id: "1",
      content: "How to implement authentication in React?",
      preview: "How to implement...",
      role: "user",
      timestamp: new Date("2024-01-01"),
      sessionId: "session-1",
    },
    {
      id: "2",
      content: "Database optimization techniques for PostgreSQL",
      preview: "Database optimization...",
      role: "assistant",
      timestamp: new Date("2024-01-02"),
      sessionId: "session-1",
    },
    {
      id: "3",
      content: "Error handling best practices in TypeScript",
      preview: "Error handling...",
      role: "user",
      timestamp: new Date("2024-01-03"),
      sessionId: "session-2",
    },
  ];

  const mockSnippets: Snippet[] = [
    {
      id: "1",
      title: "React Auth Hook",
      content: "useAuth hook implementation",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "2",
      title: "SQL Query Optimizer",
      content: "Query optimization tips",
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("normalSearch", () => {
    it("should return all messages when search text is empty", () => {
      const result = normalSearch(mockMessages, "");
      expect(result).toEqual(mockMessages);
    });

    it("should filter messages by content", () => {
      const result = normalSearch(mockMessages, "authentication");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("should filter messages by preview", () => {
      const result = normalSearch(mockMessages, "Database");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("should be case insensitive", () => {
      const result = normalSearch(mockMessages, "TYPESCRIPT");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("3");
    });

    it("should return empty array when no matches found", () => {
      const result = normalSearch(mockMessages, "nonexistent");
      expect(result).toEqual([]);
    });
  });

  describe("normalSearchSnippets", () => {
    it("should return all snippets when search text is empty", () => {
      const result = normalSearchSnippets(mockSnippets, "");
      expect(result).toEqual(mockSnippets);
    });

    it("should filter snippets by title", () => {
      const result = normalSearchSnippets(mockSnippets, "React");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("should filter snippets by content", () => {
      const result = normalSearchSnippets(mockSnippets, "optimization");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("should be case insensitive", () => {
      const result = normalSearchSnippets(mockSnippets, "HOOK");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });
  });

  // COMMENTED OUT - AI SEARCH FEATURE TEMPORARILY DISABLED
  // describe("semanticSearch", () => {
  //   it("should return all messages when query is empty", async () => {
  //     const result = await semanticSearch(mockMessages, "");
  //     expect(result).toEqual(mockMessages);
  //     expect(AI.ask).not.toHaveBeenCalled();
  //   });

  //   it("should return empty array when messages array is empty", async () => {
  //     const result = await semanticSearch([], "test");
  //     expect(result).toEqual([]);
  //     expect(AI.ask).not.toHaveBeenCalled();
  //   });

  //   it("should throw error for test trigger", async () => {
  //     await expect(
  //       semanticSearch(mockMessages, "trigger error"),
  //     ).rejects.toThrow("Test error triggered");
  //     expect(AI.ask).not.toHaveBeenCalled();
  //   });

  //   it("should throw error for non-AI user simulation", async () => {
  //     await expect(semanticSearch(mockMessages, "non ai user")).rejects.toThrow(
  //       "AI features are only available with a Raycast Pro subscription",
  //     );
  //     expect(AI.ask).not.toHaveBeenCalled();
  //   });

  //   it("should call AI.ask and return filtered messages", async () => {
  //     const mockAI = AI as jest.Mocked<typeof AI>;
  //     mockAI.ask.mockResolvedValue("[0, 2]");

  //     const result = await semanticSearch(mockMessages, "error handling");

  //     expect(AI.ask).toHaveBeenCalledWith(
  //       expect.stringContaining("error handling"),
  //       expect.objectContaining({
  //         model: AI.Model.Anthropic_Claude_Haiku,
  //       }),
  //     );
  //     expect(result).toHaveLength(2);
  //     expect(result[0].id).toBe("1");
  //     expect(result[1].id).toBe("3");
  //   });

  //   it("should handle AI response with extra text", async () => {
  //     const mockAI = AI as jest.Mocked<typeof AI>;
  //     mockAI.ask.mockResolvedValue(
  //       "Based on the query, the matching indices are: [1]",
  //     );

  //     const result = await semanticSearch(mockMessages, "database");

  //     expect(result).toHaveLength(1);
  //     expect(result[0].id).toBe("2");
  //   });

  //   it("should fallback to normal search on AI error", async () => {
  //     const mockAI = AI as jest.Mocked<typeof AI>;
  //     mockAI.ask.mockRejectedValue(new Error("AI service unavailable"));

  //     const result = await semanticSearch(mockMessages, "database");

  //     expect(result).toHaveLength(1);
  //     expect(result[0].id).toBe("2");
  //   });

  //   it("should handle invalid JSON response", async () => {
  //     const mockAI = AI as jest.Mocked<typeof AI>;
  //     mockAI.ask.mockResolvedValue("invalid json");

  //     const result = await semanticSearch(mockMessages, "database");

  //     // Should fallback to normal search
  //     expect(result).toHaveLength(1);
  //     expect(result[0].id).toBe("2");
  //   });

  //   it("should extract JSON array from response with regex fallback", async () => {
  //     const mockAI = AI as jest.Mocked<typeof AI>;
  //     mockAI.ask.mockResolvedValue(
  //       "The relevant indices are: [0, 1] based on the query",
  //     );

  //     const result = await semanticSearch(mockMessages, "test");

  //     expect(result).toHaveLength(2);
  //     expect(result[0].id).toBe("1");
  //     expect(result[1].id).toBe("2");
  //   });

  //   it("should handle empty array response", async () => {
  //     const mockAI = AI as jest.Mocked<typeof AI>;
  //     mockAI.ask.mockResolvedValue("[]");

  //     const result = await semanticSearch(mockMessages, "nonexistent");

  //     expect(result).toHaveLength(0);
  //   });
  // });

  // COMMENTED OUT - AI SEARCH FEATURE TEMPORARILY DISABLED
  // describe("semanticSearchSnippets", () => {
  //   it("should return all snippets when query is empty", async () => {
  //     const result = await semanticSearchSnippets(mockSnippets, "");
  //     expect(result).toEqual(mockSnippets);
  //     expect(AI.ask).not.toHaveBeenCalled();
  //   });

  //   it("should throw error for test trigger", async () => {
  //     await expect(
  //       semanticSearchSnippets(mockSnippets, "trigger error"),
  //     ).rejects.toThrow("Test error triggered");
  //     expect(AI.ask).not.toHaveBeenCalled();
  //   });

  //   it("should throw error for non-AI user simulation", async () => {
  //     await expect(
  //       semanticSearchSnippets(mockSnippets, "non ai user"),
  //     ).rejects.toThrow(
  //       "AI features are only available with a Raycast Pro subscription",
  //     );
  //     expect(AI.ask).not.toHaveBeenCalled();
  //   });

  //   it("should call AI.ask and return filtered snippets", async () => {
  //     const mockAI = AI as jest.Mocked<typeof AI>;
  //     mockAI.ask.mockResolvedValue("[0]");

  //     const result = await semanticSearchSnippets(
  //       mockSnippets,
  //       "authentication",
  //     );

  //     expect(AI.ask).toHaveBeenCalledWith(
  //       expect.stringContaining("authentication"),
  //       expect.objectContaining({
  //         model: AI.Model.Anthropic_Claude_Haiku,
  //         }),
  //     );
  //     expect(result).toHaveLength(1);
  //     expect(result[0].id).toBe("1");
  //   });

  //   it("should fallback to normal search on AI error", async () => {
  //     const mockAI = AI as jest.Mocked<typeof AI>;
  //     mockAI.ask.mockRejectedValue(new Error("AI service unavailable"));

  //     const result = await semanticSearchSnippets(mockSnippets, "react");

  //     expect(result).toHaveLength(1);
  //     expect(result[0].id).toBe("1");
  //   });

  //   it("should extract JSON array from response with regex fallback", async () => {
  //     const mockAI = AI as jest.Mocked<typeof AI>;
  //     mockAI.ask.mockResolvedValue(
  //       "Based on the analysis: [1] matches your query",
  //     );

  //     const result = await semanticSearchSnippets(mockSnippets, "sql");

  //     expect(result).toHaveLength(1);
  //     expect(result[0].id).toBe("2");
  //   });

  //   it("should handle invalid JSON response", async () => {
  //     const mockAI = AI as jest.Mocked<typeof AI>;
  //     mockAI.ask.mockResolvedValue("not a valid json response");

  //     const result = await semanticSearchSnippets(mockSnippets, "react");

  //     // Should fallback to normal search
  //     expect(result).toHaveLength(1);
  //     expect(result[0].id).toBe("1");
  //   });

  //   it("should handle empty snippets array", async () => {
  //     const result = await semanticSearchSnippets([], "test");

  //     expect(result).toEqual([]);
  //     expect(AI.ask).not.toHaveBeenCalled();
  //   });
  // });
});
