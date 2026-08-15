/**
 * Integration tests for file context sharing workflow
 * Tests end-to-end file sharing with agent
 */

import { ContextService } from "../../src/services/contextService";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("Context Sharing Integration", () => {
  let contextService: ContextService;
  let tempDir: string;
  let testFilePath: string;

  beforeAll(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "acp-test-"));
    testFilePath = path.join(tempDir, "test-file.ts");

    // Create test file
    await fs.writeFile(
      testFilePath,
      `
      // Test TypeScript file
      export function greet(name: string): string {
        return \`Hello, \${name}!\`;
      }
      `,
      "utf-8"
    );
  });

  afterAll(async () => {
    // Clean up temp files
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    contextService = new ContextService();
  });

  describe("File Context Workflow", () => {
    it("should add file context to session and retrieve it", async () => {
      const sessionId = "test-session-123";

      // Read file content
      const content = await fs.readFile(testFilePath, "utf-8");

      // Add context to session
      const context = await contextService.addFileContext(sessionId, testFilePath, content);

      expect(context.sessionId).toBe(sessionId);
      expect(context.path).toBe(testFilePath);
      expect(context.content).toBe(content);
      expect(context.language).toBe("typescript");

      // Retrieve session context
      const sessionContexts = await contextService.getSessionContext(sessionId);

      expect(sessionContexts).toHaveLength(1);
      expect(sessionContexts[0].id).toBe(context.id);
    });

    it("should handle multiple files in a session", async () => {
      const sessionId = "multi-file-session";

      // Create additional test files
      const file1 = path.join(tempDir, "file1.js");
      const file2 = path.join(tempDir, "file2.py");

      await fs.writeFile(file1, "console.log('test1');", "utf-8");
      await fs.writeFile(file2, "print('test2')", "utf-8");

      const content1 = await fs.readFile(file1, "utf-8");
      const content2 = await fs.readFile(file2, "utf-8");

      // Add multiple contexts
      await contextService.addFileContext(sessionId, file1, content1);
      await contextService.addFileContext(sessionId, file2, content2);

      const contexts = await contextService.getSessionContext(sessionId);

      expect(contexts).toHaveLength(2);
      expect(contexts[0].language).toBe("javascript");
      expect(contexts[1].language).toBe("python");

      // Clean up
      await fs.unlink(file1);
      await fs.unlink(file2);
    });

    it("should remove specific context from session", async () => {
      const sessionId = "remove-context-session";

      const file1 = path.join(tempDir, "remove1.js");
      const file2 = path.join(tempDir, "remove2.js");

      await fs.writeFile(file1, "console.log('1');", "utf-8");
      await fs.writeFile(file2, "console.log('2');", "utf-8");

      const content1 = await fs.readFile(file1, "utf-8");
      const content2 = await fs.readFile(file2, "utf-8");

      const context1 = await contextService.addFileContext(sessionId, file1, content1);
      const context2 = await contextService.addFileContext(sessionId, file2, content2);

      // Remove first context
      await contextService.removeContext(context1.id);

      const remainingContexts = await contextService.getSessionContext(sessionId);

      expect(remainingContexts).toHaveLength(1);
      expect(remainingContexts[0].id).toBe(context2.id);

      // Clean up
      await fs.unlink(file1);
      await fs.unlink(file2);
    });

    it("should clear all context from session", async () => {
      const sessionId = "clear-context-session";

      const files = [
        path.join(tempDir, "clear1.js"),
        path.join(tempDir, "clear2.ts"),
        path.join(tempDir, "clear3.py"),
      ];

      for (const file of files) {
        await fs.writeFile(file, "test content", "utf-8");
        const content = await fs.readFile(file, "utf-8");
        await contextService.addFileContext(sessionId, file, content);
      }

      let contexts = await contextService.getSessionContext(sessionId);
      expect(contexts).toHaveLength(3);

      // Clear all context
      await contextService.clearSessionContext(sessionId);

      contexts = await contextService.getSessionContext(sessionId);
      expect(contexts).toHaveLength(0);

      // Clean up
      for (const file of files) {
        await fs.unlink(file);
      }
    });

    it("should calculate total context size correctly", async () => {
      const sessionId = "size-test-session";

      const files = [
        { path: path.join(tempDir, "size1.txt"), content: "a".repeat(100) },
        { path: path.join(tempDir, "size2.txt"), content: "b".repeat(200) },
        { path: path.join(tempDir, "size3.txt"), content: "c".repeat(300) },
      ];

      for (const file of files) {
        await fs.writeFile(file.path, file.content, "utf-8");
        await contextService.addFileContext(sessionId, file.path, file.content);
      }

      const totalSize = await contextService.getTotalContextSize(sessionId);
      expect(totalSize).toBe(600);

      // Clean up
      for (const file of files) {
        await fs.unlink(file.path);
      }
    });
  });

  describe("Context Validation", () => {
    it("should reject relative paths", async () => {
      const sessionId = "validation-session";
      const relativePath = "./relative/path.ts";

      await expect(contextService.addFileContext(sessionId, relativePath, "content")).rejects.toThrow(
        "Path must be absolute"
      );
    });

    it("should handle missing files gracefully", async () => {
      const sessionId = "missing-file-session";
      const missingPath = path.join(tempDir, "non-existent-file.ts");

      // Service should still accept the context even if file doesn't exist
      // (useful for scenarios where file is deleted after context is added)
      const context = await contextService.addFileContext(sessionId, missingPath, "content");

      expect(context.path).toBe(missingPath);
    });

    it("should detect correct language for various file types", async () => {
      const sessionId = "language-detection-session";

      const testFiles = [
        { ext: "ts", expectedLang: "typescript" },
        { ext: "js", expectedLang: "javascript" },
        { ext: "py", expectedLang: "python" },
        { ext: "go", expectedLang: "go" },
        { ext: "rs", expectedLang: "rust" },
      ];

      for (const test of testFiles) {
        const filePath = path.join(tempDir, `test.${test.ext}`);
        await fs.writeFile(filePath, "test content", "utf-8");

        const content = await fs.readFile(filePath, "utf-8");
        const context = await contextService.addFileContext(sessionId, filePath, content);

        expect(context.language).toBe(test.expectedLang);

        await fs.unlink(filePath);
      }
    });
  });
});
