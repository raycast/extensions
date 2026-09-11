import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { getFilePaths } from "../api/file/file.service";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({
    excludedFolders: "",
    configFileName: ".obsidian",
  }),
  Icon: { Video: "video", Microphone: "mic" },
}));

describe("file", () => {
  describe("getFilePaths", () => {
    // Create a temporary test directory
    const testDir = path.join(os.tmpdir(), "walkfiles-test-" + Math.random().toString(36).substring(2));

    beforeEach(() => {
      // Create test directory structure
      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(path.join(testDir, "subdir1"), { recursive: true });
      fs.mkdirSync(path.join(testDir, "subdir2"), { recursive: true });
      fs.mkdirSync(path.join(testDir, "subdir2", "subdir3"), { recursive: true });
      fs.mkdirSync(path.join(testDir, ".obsidian"), { recursive: true });

      // Create test files
      fs.writeFileSync(path.join(testDir, "file1.txt"), "content");
      fs.writeFileSync(path.join(testDir, "file2.js"), "content");
      fs.writeFileSync(path.join(testDir, "file.md"), "content");
      fs.writeFileSync(path.join(testDir, "file.excalidraw.md"), "content");
      fs.writeFileSync(path.join(testDir, "subdir1", "file3.txt"), "content");
      fs.writeFileSync(path.join(testDir, "subdir1", "file4.js"), "content");
      fs.writeFileSync(path.join(testDir, "subdir2", "file5.txt"), "content");
      fs.writeFileSync(path.join(testDir, "subdir2", "subdir3", "file6.js"), "content");
      fs.writeFileSync(path.join(testDir, ".obsidian", "file7.txt"), "content");
    });

    afterEach(() => {
      // Clean up test directory
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("should collect files with the correct extensions", async () => {
      const resultFiles = await getFilePaths({
        path: testDir,
        includedFileExtensions: [".js", ".txt"],
      });

      expect(resultFiles.map((f) => path.basename(f))).toContain("file1.txt");
      expect(resultFiles.map((f) => path.basename(f))).toContain("file2.js");
      expect(resultFiles.map((f) => path.basename(f))).toContain("file3.txt");
      expect(resultFiles.map((f) => path.basename(f))).toContain("file4.js");
      expect(resultFiles.map((f) => path.basename(f))).toContain("file5.txt");
      expect(resultFiles.map((f) => path.basename(f))).toContain("file6.js");
      expect(resultFiles.map((f) => path.basename(f))).not.toContain("file.md");
      expect(resultFiles.map((f) => path.basename(f))).not.toContain("file.excalidraw.md");
      expect(resultFiles.map((f) => path.basename(f))).not.toContain("file7.txt"); // In .obsidian folder
    });

    it("should respect excluded folders", async () => {
      const resultFiles = await getFilePaths({
        path: testDir,
        excludedFolders: ["subdir2"],
      });

      expect(resultFiles.map((f) => path.basename(f))).toContain("file1.txt");
      expect(resultFiles.map((f) => path.basename(f))).toContain("file2.js");
      expect(resultFiles.map((f) => path.basename(f))).toContain("file3.txt");
      expect(resultFiles.map((f) => path.basename(f))).toContain("file4.js");
      expect(resultFiles.map((f) => path.basename(f))).not.toContain("file5.txt");
      expect(resultFiles.map((f) => path.basename(f))).not.toContain("file6.js");
    });
  });
});
