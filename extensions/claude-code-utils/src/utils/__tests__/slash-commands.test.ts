import { join } from "path";

// Mock must be set up before importing the module
jest.mock("fs/promises");
jest.mock("os", () => ({
  homedir: jest.fn(() => "/home/user"),
}));

import { readdir, readFile } from "fs/promises";
import { getSlashCommands } from "../command";

const mockReaddir = readdir as jest.MockedFunction<typeof readdir>;
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe("slashCommands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSlashCommands", () => {
    it("should return all command files from ~/.claude/commands", async () => {
      mockReaddir.mockResolvedValue(["test-command.md", "another-command.md", "not-markdown.txt"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);

      mockReadFile.mockResolvedValueOnce("# Test Command Content").mockResolvedValueOnce("# Another Command Content");

      const commands = await getSlashCommands();

      expect(commands).toHaveLength(2);
      expect(commands[0]).toEqual({
        id: "another-command",
        name: "another-command",
        content: "# Another Command Content",
        filePath: join("/home/user", ".claude", "commands", "another-command.md"),
      });
      expect(commands[1]).toEqual({
        id: "test-command",
        name: "test-command",
        content: "# Test Command Content",
        filePath: join("/home/user", ".claude", "commands", "test-command.md"),
      });
    });

    it("should filter out non-markdown files", async () => {
      mockReaddir.mockResolvedValue(["command.md", "file.txt", "another.pdf"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);

      mockReadFile.mockResolvedValueOnce("# Command Content");

      const commands = await getSlashCommands();

      expect(commands).toHaveLength(1);
      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });

    it("should throw error when directory does not exist", async () => {
      const error = new Error("ENOENT");
      (error as NodeJS.ErrnoException).code = "ENOENT";
      mockReaddir.mockRejectedValue(error);

      await expect(getSlashCommands()).rejects.toThrow("ENOENT");
    });

    it("should throw error for other filesystem errors", async () => {
      const error = new Error("Permission denied");
      mockReaddir.mockRejectedValue(error);

      await expect(getSlashCommands()).rejects.toThrow("Permission denied");
    });

    it("should sort commands by name alphabetically", async () => {
      mockReaddir.mockResolvedValue(["zebra-command.md", "apple-command.md", "middle-command.md"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);

      mockReadFile.mockResolvedValueOnce("# Zebra").mockResolvedValueOnce("# Apple").mockResolvedValueOnce("# Middle");

      const commands = await getSlashCommands();

      expect(commands[0].name).toBe("apple-command");
      expect(commands[1].name).toBe("middle-command");
      expect(commands[2].name).toBe("zebra-command");
    });

    it("should keep command names in kebab-case", async () => {
      mockReaddir.mockResolvedValue(["multi-word-command-name.md", "single.md"] as unknown as Awaited<
        ReturnType<typeof readdir>
      >);

      mockReadFile.mockResolvedValueOnce("# Content 1").mockResolvedValueOnce("# Content 2");

      const commands = await getSlashCommands();

      expect(commands[0].name).toBe("multi-word-command-name");
      expect(commands[1].name).toBe("single");
    });

    it("should handle empty directory", async () => {
      mockReaddir.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof readdir>>);

      const commands = await getSlashCommands();

      expect(commands).toEqual([]);
    });

    it("should include file paths in results", async () => {
      mockReaddir.mockResolvedValue(["test.md"] as unknown as Awaited<ReturnType<typeof readdir>>);
      mockReadFile.mockResolvedValueOnce("# Content");

      const commands = await getSlashCommands();

      expect(commands[0].filePath).toBe(join("/home/user", ".claude", "commands", "test.md"));
    });
  });
});
