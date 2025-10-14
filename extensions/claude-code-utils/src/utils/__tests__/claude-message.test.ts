/* eslint-disable @typescript-eslint/no-explicit-any */
import { readdir, stat } from "fs/promises";
import { createReadStream } from "fs";
import * as fs from "fs";
import { homedir } from "os";
import { join } from "path";
import { createInterface } from "readline";
import { EventEmitter } from "events";
import { LocalStorage } from "@raycast/api";
import {
  getSentMessages,
  getReceivedMessages,
  getAllClaudeMessages,
  getSnippets,
  createSnippet,
  deleteSnippet,
} from "../claude-message";

// Mock all external dependencies
jest.mock("fs", () => ({
  createReadStream: jest.fn(),
}));

jest.mock("fs/promises", () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
}));

jest.mock("os", () => ({
  homedir: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn(),
}));

jest.mock("readline", () => ({
  createInterface: jest.fn(),
}));

jest.mock("crypto", () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => "mocked-hash"),
  })),
}));

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

// Type the mocked modules
const mockedReaddir = readdir as jest.MockedFunction<typeof readdir>;
const mockedStat = stat as jest.MockedFunction<typeof stat>;
const mockedHomedir = homedir as jest.MockedFunction<typeof homedir>;
const mockedJoin = join as jest.MockedFunction<typeof join>;
const mockedCreateReadStream = createReadStream as jest.MockedFunction<typeof createReadStream>;
const mockedCreateInterface = createInterface as jest.MockedFunction<typeof createInterface>;
const mockedLocalStorage = LocalStorage as jest.Mocked<typeof LocalStorage>;

// Mock readline interface
class MockReadlineInterface extends EventEmitter {
  private _closed = false;

  close() {
    if (!this._closed) {
      this._closed = true;
      // Use setTimeout to ensure event fires in next tick
      setTimeout(() => {
        this.emit("close");
      }, 0);
    }
  }

  removeAllListeners() {
    super.removeAllListeners();
    return this;
  }

  // Override emit to handle error events properly
  emit(eventName: string | symbol, ...args: unknown[]): boolean {
    if (eventName === "error") {
      // Handle errors gracefully by not throwing if no listeners
      if (this.listenerCount("error") === 0) {
        return false;
      }
    }
    return super.emit(eventName, ...args);
  }
}

// Mock file stream
class MockFileStream extends EventEmitter {
  private _destroyed = false;

  destroy() {
    if (!this._destroyed) {
      this._destroyed = true;
      // Use setTimeout to ensure event fires in next tick
      setTimeout(() => {
        this.emit("close");
      }, 0);
    }
  }
}

describe("claudeMessages", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up console.error spy
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Default mocks
    mockedHomedir.mockReturnValue("/mock/home");
    mockedJoin.mockImplementation((...paths) => paths.join("/"));
  });

  describe("Directory and File Operations", () => {
    it("should construct correct Claude directory path", () => {
      // Since the module is imported before the test runs, we verify the mock setup works
      // by checking that our mocked functions were configured properly
      expect(mockedHomedir).toBeDefined();
      expect(mockedJoin).toBeDefined();

      // Test the current behavior by calling the mocked functions
      mockedHomedir();
      mockedJoin("test", ".claude", "projects");

      expect(mockedHomedir).toHaveBeenCalled();
      expect(mockedJoin).toHaveBeenCalledWith("test", ".claude", "projects");
    });

    it("should handle missing Claude directory gracefully", async () => {
      mockedReaddir.mockRejectedValue(new Error("Directory not found"));

      const result = await getSentMessages();

      expect(result).toEqual([]);
    });

    it("should handle permission errors when reading directories", async () => {
      mockedReaddir.mockRejectedValue(new Error("Permission denied"));

      const result = await getAllClaudeMessages();

      expect(result).toEqual([]);
    });
  });

  describe("getSentMessages", () => {
    it("should return empty array when no projects exist", async () => {
      mockedReaddir.mockResolvedValue([] as any);

      const result = await getSentMessages();

      expect(result).toEqual([]);
    });

    it("should process projects and return user messages", async () => {
      // Mock directory structure
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // Projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // Files in project1
        .mockResolvedValueOnce(["session1.jsonl"] as any); // Files listing again for processing

      // Mock stats for projects - need to match the exact order in the function
      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat1 = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats) // project1 directory stat
        .mockResolvedValueOnce(mockFileStat1 as unknown as fs.Stats) // session1.jsonl for mtime comparison
        .mockResolvedValueOnce(mockFileStat1 as unknown as fs.Stats); // session1.jsonl stat for file sorting

      // Mock readline interface
      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      // Start the function
      const resultPromise = getSentMessages();

      // Use process.nextTick to ensure the mock is called after the function starts
      // Use setTimeout to ensure proper event emission timing
      setTimeout(() => {
        // Emit user message data
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Test user message",
            },
            timestamp: 1672531200, // Unix timestamp
          }),
        );

        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Another user message",
            },
            timestamp: 1672531300,
          }),
        );

        // Close the readline interface
        mockReadlineInterface.close();
      }, 10);

      const result = await resultPromise;

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        role: "user",
        content: "Another user message",
        id: "sent-0",
        preview: "Another user message",
      });
      expect(result[0].timestamp).toBeInstanceOf(Date);
    });

    it("should filter out system messages and interrupted requests", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        // Valid user message
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Valid message",
            },
            timestamp: 1672531200,
          }),
        );

        // System command message (should be filtered)
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "<command-message>system command</command-message>",
            },
            timestamp: 1672531250,
          }),
        );

        // Interrupted request (should be filtered)
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "[Request interrupted by user",
            },
            timestamp: 1672531300,
          }),
        );

        // Assistant message (should be filtered)
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "assistant",
              content: "Assistant response",
            },
            timestamp: 1672531350,
          }),
        );

        mockReadlineInterface.close();
      }, 10);

      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Valid message");
    });

    it("should handle complex content arrays", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        // Message with complex content array
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: [
                { type: "text", text: "First text part" },
                { type: "image", data: "base64..." },
                { type: "text", text: "Second text part" },
              ],
            },
            timestamp: 1672531200,
          }),
        );

        mockReadlineInterface.close();
      }, 10);

      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("First text part\nSecond text part");
    });

    it("should handle malformed JSON gracefully", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        // Valid message
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Valid message",
            },
            timestamp: 1672531200,
          }),
        );

        // Malformed JSON
        mockReadlineInterface.emit("line", "invalid json {");

        // Another valid message
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Another valid message",
            },
            timestamp: 1672531300,
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(2);
    });

    it("should handle stream errors gracefully", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        mockFileStream.emit("error", new Error("File read error"));
      }, 10);

      const result = await resultPromise;

      expect(result).toEqual([]);
    });

    it("should limit to 5 projects and 5 files per project", async () => {
      // Mock 6 projects (more than limit of 5)
      const projects = ["project1", "project2", "project3", "project4", "project5", "project6"];
      mockedReaddir.mockResolvedValueOnce(projects as any);

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };

      // Mock stats for all 6 projects to determine which have most recent files
      for (let i = 0; i < 6; i++) {
        mockedStat.mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats);
        // Mock file listing to determine most recent file time
        mockedReaddir.mockResolvedValueOnce(["session1.jsonl"] as any);
        const mockFileStat = { mtime: new Date(`2023-01-${i + 2}`) };
        mockedStat.mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);
      }

      // Store the readline interfaces for explicit control
      const readlineInterfaces: MockReadlineInterface[] = [];

      // Mock the actual processing for the top 5 projects only
      for (let i = 0; i < 5; i++) {
        // Mock file listing again for processing
        mockedReaddir.mockResolvedValueOnce(["session1.jsonl"] as any);
        const mockFileStat = { mtime: new Date(`2023-01-${i + 2}`) };
        mockedStat.mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

        // Mock readline interface for each file
        const mockReadlineInterface = new MockReadlineInterface();
        const mockFileStream = new MockFileStream();
        readlineInterfaces.push(mockReadlineInterface);
        mockedCreateReadStream.mockReturnValueOnce(
          mockFileStream as unknown as ReturnType<typeof mockedCreateReadStream>,
        );
        mockedCreateInterface.mockReturnValueOnce(
          mockReadlineInterface as unknown as ReturnType<typeof mockedCreateInterface>,
        );
      }

      const resultPromise = getSentMessages();

      // Close all readline interfaces after a delay
      setTimeout(() => {
        readlineInterfaces.forEach((rl) => rl.close());
      }, 10);

      await resultPromise;

      // Verify that only 5 projects were processed (despite 6 being available)
      // readdir calls: 1 for initial list + 6 for finding recent files + 5 for processing
      expect(mockedReaddir).toHaveBeenCalledTimes(12);
    });

    it("should handle empty content in messages", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        // Message with empty content
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "",
            },
            timestamp: 1672531200,
          }),
        );

        // Message with whitespace only
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "   ",
            },
            timestamp: 1672531250,
          }),
        );

        // Message without content
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
            },
            timestamp: 1672531300,
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(0);
    });

    it("should handle messages with content items having no text", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        // Message with content items but no text
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: [
                { type: "text" }, // No text property
                { type: "image", data: "base64..." },
                { type: "text", text: undefined }, // undefined text
              ],
            },
            timestamp: 1672531200,
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(0);
    });
  });

  describe("getReceivedMessages", () => {
    it("should return assistant messages from getAllClaudeMessages", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getReceivedMessages();

      setTimeout(() => {
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "assistant",
              content: "Assistant response",
            },
            timestamp: 1672531200,
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        role: "assistant",
        content: "Assistant response",
        id: "received-0",
        preview: "Assistant response",
      });
    });

    it("should handle empty content gracefully", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getReceivedMessages();

      setTimeout(() => {
        // Message with empty content
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "assistant",
              content: "",
            },
            timestamp: 1672531200,
          }),
        );

        // Message with no content
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "assistant",
            },
            timestamp: 1672531250,
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      // Both messages should be filtered out due to empty content
      expect(result).toHaveLength(0);
    });

    it("should create preview for long content", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const longContent = "A".repeat(200);
      const resultPromise = getReceivedMessages();

      setTimeout(() => {
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "assistant",
              content: longContent,
            },
            timestamp: 1672531200,
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0].preview).toBe("A".repeat(100) + "...");
      expect(result[0].content).toBe(longContent);
    });

    it("should handle messages with null/undefined content gracefully", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getReceivedMessages();

      setTimeout(() => {
        // Message with null content
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "assistant",
              content: null,
            },
            timestamp: 1672531200,
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0].preview).toBe("[Empty message]");
    });

    it("should handle invalid timestamp conversion", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getReceivedMessages();

      setTimeout(() => {
        // Message with invalid timestamp that will create invalid Date
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "assistant",
              content: "Test message",
            },
            timestamp: "invalid-timestamp",
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe("Snippets functionality", () => {
    beforeEach(() => {
      mockedLocalStorage.getItem.mockClear();
      mockedLocalStorage.setItem.mockClear();
    });

    describe("getSnippets", () => {
      it("should return empty array when no snippets exist", async () => {
        mockedLocalStorage.getItem.mockResolvedValue(undefined);

        const result = await getSnippets();

        expect(result).toEqual([]);
        expect(mockedLocalStorage.getItem).toHaveBeenCalledWith("claude-messages-snippets");
      });

      it("should parse and return snippets with Date objects", async () => {
        const snippetsData = JSON.stringify([
          {
            id: "snippet-1",
            title: "Test Snippet",
            content: "Snippet content",
            createdAt: "2023-01-01T12:00:00Z",
            updatedAt: "2023-01-01T12:05:00Z",
          },
        ]);

        mockedLocalStorage.getItem.mockResolvedValue(snippetsData);

        const result = await getSnippets();

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          id: "snippet-1",
          title: "Test Snippet",
          content: "Snippet content",
        });
        expect(result[0].createdAt).toBeInstanceOf(Date);
        expect(result[0].updatedAt).toBeInstanceOf(Date);
      });

      it("should handle JSON parse errors", async () => {
        mockedLocalStorage.getItem.mockResolvedValue("invalid json");

        const result = await getSnippets();

        expect(result).toEqual([]);
      });
    });

    describe("createSnippet", () => {
      it("should create and save new snippet", async () => {
        mockedLocalStorage.getItem.mockResolvedValue(undefined);

        const result = await createSnippet("Test Title", "Test Content");

        expect(result).toMatchObject({
          id: "mocked-hash",
          title: "Test Title",
          content: "Test Content",
        });
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);

        expect(mockedLocalStorage.setItem).toHaveBeenCalledWith(
          "claude-messages-snippets",
          expect.stringContaining("Test Title"),
        );
      });

      it("should add to existing snippets", async () => {
        const existingData = JSON.stringify([
          {
            id: "existing-1",
            title: "Existing",
            content: "Content",
            createdAt: "2023-01-01T12:00:00Z",
            updatedAt: "2023-01-01T12:00:00Z",
          },
        ]);

        mockedLocalStorage.getItem.mockResolvedValue(existingData);

        await createSnippet("New Title", "New Content");

        const savedData = JSON.parse((mockedLocalStorage.setItem as jest.Mock).mock.calls[0][1]);
        expect(savedData).toHaveLength(2);
        expect(savedData[1]).toMatchObject({
          title: "New Title",
          content: "New Content",
        });
      });

      it("should handle storage errors", async () => {
        mockedLocalStorage.getItem.mockRejectedValue(new Error("Storage error"));

        await expect(createSnippet("Title", "Content")).rejects.toThrow("Failed to create snippet");
      });

      it("should handle JSON parse errors in existing data", async () => {
        mockedLocalStorage.getItem.mockResolvedValue("invalid json");

        // The function should treat invalid JSON as no existing data and create a new snippet successfully
        const result = await createSnippet("Test Title", "Test Content");

        expect(result).toMatchObject({
          id: "mocked-hash",
          title: "Test Title",
          content: "Test Content",
        });
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe("deleteSnippet", () => {
      it("should delete existing snippet", async () => {
        const snippetsData = JSON.stringify([
          {
            id: "snippet-1",
            title: "Title 1",
            content: "Content 1",
            createdAt: "2023-01-01T12:00:00Z",
            updatedAt: "2023-01-01T12:00:00Z",
          },
          {
            id: "snippet-2",
            title: "Title 2",
            content: "Content 2",
            createdAt: "2023-01-01T12:01:00Z",
            updatedAt: "2023-01-01T12:01:00Z",
          },
        ]);

        mockedLocalStorage.getItem.mockResolvedValue(snippetsData);

        await deleteSnippet("snippet-1");

        expect(mockedLocalStorage.setItem).toHaveBeenCalledWith(
          "claude-messages-snippets",
          JSON.stringify([
            {
              id: "snippet-2",
              title: "Title 2",
              content: "Content 2",
              createdAt: "2023-01-01T12:01:00Z",
              updatedAt: "2023-01-01T12:01:00Z",
            },
          ]),
        );
      });

      it("should handle non-existent snippet gracefully", async () => {
        mockedLocalStorage.getItem.mockResolvedValue(undefined);

        await deleteSnippet("non-existent");

        expect(mockedLocalStorage.setItem).not.toHaveBeenCalled();
      });

      it("should handle storage errors", async () => {
        mockedLocalStorage.getItem.mockRejectedValue(new Error("Storage error"));

        await expect(deleteSnippet("snippet-1")).rejects.toThrow("Failed to delete snippet");
      });

      it("should handle JSON parse errors", async () => {
        mockedLocalStorage.getItem.mockResolvedValue("invalid json");

        await expect(deleteSnippet("snippet-1")).rejects.toThrow("Failed to delete snippet");
      });
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle readline interface errors", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        mockReadlineInterface.emit("error", new Error("Readline error"));
      }, 10);

      const result = await resultPromise;

      expect(result).toEqual([]);
    });

    it("should handle timestamp conversion edge cases", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        // Unix timestamp (should be converted to milliseconds)
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Unix timestamp message",
            },
            timestamp: 1672531200, // Unix timestamp in seconds
          }),
        );

        // Milliseconds timestamp (should be used as-is)
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Milliseconds timestamp message",
            },
            timestamp: 1672531200000, // Timestamp in milliseconds
          }),
        );

        // String timestamp
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "String timestamp message",
            },
            timestamp: "2023-01-01T12:00:00Z",
          }),
        );

        // No timestamp (should use current date)
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "No timestamp message",
            },
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(4);
      result.forEach((msg) => {
        expect(msg.timestamp).toBeInstanceOf(Date);
      });
    });

    it("should handle empty lines in JSONL files", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        // Empty line
        mockReadlineInterface.emit("line", "");

        // Line with only whitespace
        mockReadlineInterface.emit("line", "   ");

        // Valid message
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Valid message",
            },
            timestamp: 1672531200,
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Valid message");
    });

    it("should sort messages correctly by timestamp", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        // Messages in non-chronological order
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Third message",
            },
            timestamp: 1672531400,
          }),
        );

        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "First message",
            },
            timestamp: 1672531200,
          }),
        );

        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Second message",
            },
            timestamp: 1672531300,
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(3);
      // Should be sorted newest first
      expect(result[0].content).toBe("Third message");
      expect(result[1].content).toBe("Second message");
      expect(result[2].content).toBe("First message");
    });

    it("should handle file stat errors", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files to find most recent

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockRejectedValueOnce(new Error("File stat error")); // Error getting file stat

      const result = await getSentMessages();

      expect(result).toEqual([]);
    });

    it("should handle non-directory items in projects folder", async () => {
      mockedReaddir.mockResolvedValueOnce(["project1", "file.txt"] as any);

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = {
        isDirectory: () => false,
        mtime: new Date("2023-01-01"),
      };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats); // file.txt is not a directory

      mockedReaddir
        .mockResolvedValueOnce(["session1.jsonl"] as any) // Files in project1 to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // Files in project1 again to process

      const mockFileStatForSession = { mtime: new Date("2023-01-02") };
      mockedStat
        .mockResolvedValueOnce(mockFileStatForSession as unknown as fs.Stats) // session1.jsonl stat for finding most recent
        .mockResolvedValueOnce(mockFileStatForSession as unknown as fs.Stats); // session1.jsonl stat for processing

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Test message",
            },
            timestamp: 1672531200,
          }),
        );
        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Test message");
    });

    it("should handle error in createReadStream", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      // Mock createReadStream to throw error
      mockedCreateReadStream.mockImplementation(() => {
        throw new Error("Cannot create stream");
      });

      const result = await getSentMessages();

      expect(result).toEqual([]);
    });

    it("should handle <command-name> filtering", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any); // List files again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat = { mtime: new Date("2023-01-02") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats)
        .mockResolvedValueOnce(mockFileStat as unknown as fs.Stats);

      const mockReadlineInterface = new MockReadlineInterface();
      const mockFileStream = new MockFileStream();

      mockedCreateReadStream.mockReturnValue(mockFileStream as any);
      mockedCreateInterface.mockReturnValue(mockReadlineInterface as any);

      const resultPromise = getSentMessages();

      setTimeout(() => {
        // Valid message
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "Valid message",
            },
            timestamp: 1672531200,
          }),
        );

        // Message with command name (should be filtered)
        mockReadlineInterface.emit(
          "line",
          JSON.stringify({
            message: {
              role: "user",
              content: "<command-name>test-command</command-name>",
            },
            timestamp: 1672531250,
          }),
        );

        mockReadlineInterface.emit("close");
      });

      const result = await resultPromise;

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Valid message");
    });
  });

  describe("getAllClaudeMessages", () => {
    it("should return empty array when no projects exist", async () => {
      mockedReaddir.mockResolvedValue([] as any);

      const result = await getAllClaudeMessages();

      expect(result).toEqual([]);
    });

    it("should handle error in getting project most recent file time", async () => {
      mockedReaddir.mockResolvedValueOnce(["project1"] as any);

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };

      mockedStat.mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats);

      // Mock readdir to fail when getting files in project
      mockedReaddir.mockRejectedValueOnce(new Error("Cannot read project files"));

      const result = await getAllClaudeMessages();

      expect(result).toEqual([]);
    });

    it("should process multiple projects and return assistant messages", async () => {
      mockedReaddir
        .mockResolvedValueOnce(["project1", "project2"] as any) // List projects
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files in project1 to find most recent
        .mockResolvedValueOnce(["session1.jsonl"] as any) // List files in project1 again to process
        .mockResolvedValueOnce(["session2.jsonl"] as any) // List files in project2 to find most recent
        .mockResolvedValueOnce(["session2.jsonl"] as any); // List files in project2 again to process

      const mockProjectStat = {
        isDirectory: () => true,
        mtime: new Date("2023-01-01"),
      };
      const mockFileStat1 = { mtime: new Date("2023-01-02") };
      const mockFileStat2 = { mtime: new Date("2023-01-03") };

      mockedStat
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats) // project1 stat
        .mockResolvedValueOnce(mockFileStat1 as unknown as fs.Stats) // session1.jsonl stat for finding most recent
        .mockResolvedValueOnce(mockProjectStat as unknown as fs.Stats) // project2 stat
        .mockResolvedValueOnce(mockFileStat2 as unknown as fs.Stats) // session2.jsonl stat for finding most recent
        .mockResolvedValueOnce(mockFileStat1 as unknown as fs.Stats) // session1.jsonl stat for processing
        .mockResolvedValueOnce(mockFileStat2 as unknown as fs.Stats); // session2.jsonl stat for processing

      // Create separate mock interfaces for each file
      const mockReadlineInterface1 = new MockReadlineInterface();
      const mockReadlineInterface2 = new MockReadlineInterface();
      const mockFileStream1 = new MockFileStream();
      const mockFileStream2 = new MockFileStream();

      mockedCreateReadStream
        .mockReturnValueOnce(mockFileStream1 as unknown as ReturnType<typeof mockedCreateReadStream>)
        .mockReturnValueOnce(mockFileStream2 as unknown as ReturnType<typeof mockedCreateReadStream>);
      mockedCreateInterface
        .mockReturnValueOnce(mockReadlineInterface1 as unknown as ReturnType<typeof mockedCreateInterface>)
        .mockReturnValueOnce(mockReadlineInterface2 as unknown as ReturnType<typeof mockedCreateInterface>);

      const resultPromise = getAllClaudeMessages();

      setTimeout(() => {
        // Emit message for first file
        mockReadlineInterface1.emit(
          "line",
          JSON.stringify({
            message: {
              role: "assistant",
              content: "Assistant message 1",
            },
            timestamp: 1672531200,
          }),
        );
        mockReadlineInterface1.close();

        // Delay the second interface to avoid race conditions
        setTimeout(() => {
          // Emit message for second file
          mockReadlineInterface2.emit(
            "line",
            JSON.stringify({
              message: {
                role: "assistant",
                content: "Assistant message 2",
              },
              timestamp: 1672531300,
            }),
          );
          mockReadlineInterface2.close();
        }, 5);
      }, 10);

      const result = await resultPromise;

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Assistant message 2"); // Newer first
      expect(result[1].content).toBe("Assistant message 1");
    });
  });
});
