/**
 * Unit tests for ContextService
 * Tests file context sharing functionality
 */

import { ContextService } from "../../../src/services/contextService";
import { ProjectContext } from "../../../src/types/entities";

describe("ContextService", () => {
  let contextService: ContextService;

  beforeEach(async () => {
    // Clear storage before each test
    const { LocalStorage } = await import("@raycast/api");
    await LocalStorage.clear();
    contextService = new ContextService();
    // Wait for context service to initialize
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  describe("addFileContext", () => {
    it("should add file context with valid path", async () => {
      const sessionId = "test-session-123";
      const filePath = "/absolute/path/to/file.ts";
      const content = "console.log('test');";

      const context = await contextService.addFileContext(sessionId, filePath, content);

      expect(context.sessionId).toBe(sessionId);
      expect(context.path).toBe(filePath);
      expect(context.content).toBe(content);
      expect(context.type).toBe("file");
      expect(context.language).toBe("typescript");
      expect(context.size).toBe(content.length);
      expect(context.addedAt).toBeInstanceOf(Date);
    });

    it("should detect language from file extension", async () => {
      const testCases = [
        { path: "/path/to/file.ts", expectedLang: "typescript" },
        { path: "/path/to/file.js", expectedLang: "javascript" },
        { path: "/path/to/file.py", expectedLang: "python" },
        { path: "/path/to/file.go", expectedLang: "go" },
        { path: "/path/to/file.rs", expectedLang: "rust" },
        { path: "/path/to/file.md", expectedLang: "markdown" },
        { path: "/path/to/file.json", expectedLang: "json" },
        { path: "/path/to/file.unknown", expectedLang: "text" },
      ];

      for (const testCase of testCases) {
        const context = await contextService.addFileContext("session", testCase.path, "content");
        expect(context.language).toBe(testCase.expectedLang);
      }
    });

    it("should throw error for relative paths", async () => {
      const relativePath = "./relative/path.ts";

      await expect(
        contextService.addFileContext("session", relativePath, "content")
      ).rejects.toThrow("Path must be absolute");
    });

    it("should calculate correct file size", async () => {
      const content = "a".repeat(1000);
      const context = await contextService.addFileContext("session", "/path/file.ts", content);

      expect(context.size).toBe(1000);
    });
  });

  describe("getSessionContext", () => {
    it("should return all context for a session", async () => {
      const sessionId = "test-session";

      await contextService.addFileContext(sessionId, "/path/file1.ts", "content1");
      await contextService.addFileContext(sessionId, "/path/file2.js", "content2");

      const contexts = await contextService.getSessionContext(sessionId);

      expect(contexts).toHaveLength(2);
      expect(contexts[0].path).toBe("/path/file1.ts");
      expect(contexts[1].path).toBe("/path/file2.js");
    });

    it("should return empty array for session with no context", async () => {
      const contexts = await contextService.getSessionContext("empty-session");
      expect(contexts).toEqual([]);
    });

    it("should not return context from other sessions", async () => {
      await contextService.addFileContext("session1", "/path/file1.ts", "content1");
      await contextService.addFileContext("session2", "/path/file2.ts", "content2");

      const session1Context = await contextService.getSessionContext("session1");

      expect(session1Context).toHaveLength(1);
      expect(session1Context[0].path).toBe("/path/file1.ts");
    });
  });

  describe("removeContext", () => {
    it("should remove specific context by ID", async () => {
      const sessionId = "test-session";
      const context1 = await contextService.addFileContext(sessionId, "/path/file1.ts", "content1");
      const context2 = await contextService.addFileContext(sessionId, "/path/file2.ts", "content2");

      await contextService.removeContext(context1.id);

      const remainingContext = await contextService.getSessionContext(sessionId);
      expect(remainingContext).toHaveLength(1);
      expect(remainingContext[0].id).toBe(context2.id);
    });

    it("should not throw error when removing non-existent context", async () => {
      await expect(
        contextService.removeContext("non-existent-id")
      ).resolves.not.toThrow();
    });
  });

  describe("clearSessionContext", () => {
    it("should remove all context for a session", async () => {
      const sessionId = "test-session";

      await contextService.addFileContext(sessionId, "/path/file1.ts", "content1");
      await contextService.addFileContext(sessionId, "/path/file2.ts", "content2");
      await contextService.addFileContext(sessionId, "/path/file3.ts", "content3");

      await contextService.clearSessionContext(sessionId);

      const contexts = await contextService.getSessionContext(sessionId);
      expect(contexts).toEqual([]);
    });

    it("should not affect other sessions", async () => {
      await contextService.addFileContext("session1", "/path/file1.ts", "content1");
      await contextService.addFileContext("session2", "/path/file2.ts", "content2");

      await contextService.clearSessionContext("session1");

      const session2Context = await contextService.getSessionContext("session2");
      expect(session2Context).toHaveLength(1);
    });
  });

  describe("getTotalContextSize", () => {
    it("should calculate total size of all context in session", async () => {
      const sessionId = "test-session";

      await contextService.addFileContext(sessionId, "/path/file1.ts", "a".repeat(100));
      await contextService.addFileContext(sessionId, "/path/file2.ts", "b".repeat(200));
      await contextService.addFileContext(sessionId, "/path/file3.ts", "c".repeat(300));

      const totalSize = await contextService.getTotalContextSize(sessionId);
      expect(totalSize).toBe(600);
    });

    it("should return 0 for session with no context", async () => {
      const totalSize = await contextService.getTotalContextSize("empty-session");
      expect(totalSize).toBe(0);
    });
  });
});
