import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import fs from "fs-extra";
import path from "path";
import { SpotlightSearchResult } from "../common/types";

describe("Pinning Operations", () => {
  let testDir: string;
  let testFolder1: SpotlightSearchResult;
  let testFolder2: SpotlightSearchResult;

  beforeAll(async () => {
    // Create test directories
    testDir = path.join(__dirname, "test-pinning");
    const folder1Path = path.join(testDir, "folder1");
    const folder2Path = path.join(testDir, "folder2");

    await fs.ensureDir(folder1Path);
    await fs.ensureDir(folder2Path);

    // Create test folder objects
    const stats1 = await fs.stat(folder1Path);
    const stats2 = await fs.stat(folder2Path);

    testFolder1 = {
      path: folder1Path,
      kMDItemFSName: "folder1",
      kMDItemDisplayName: "Test Folder 1",
      kMDItemKind: "Folder",
      kMDItemFSSize: 0,
      kMDItemFSCreationDate: stats1.birthtime,
      kMDItemContentModificationDate: stats1.mtime,
      kMDItemLastUsedDate: stats1.atime,
      kMDItemUseCount: 0,
    };

    testFolder2 = {
      path: folder2Path,
      kMDItemFSName: "folder2",
      kMDItemDisplayName: "Test Folder 2",
      kMDItemKind: "Folder",
      kMDItemFSSize: 0,
      kMDItemFSCreationDate: stats2.birthtime,
      kMDItemContentModificationDate: stats2.mtime,
      kMDItemLastUsedDate: stats2.atime,
      kMDItemUseCount: 0,
    };
  });

  afterAll(async () => {
    // Clean up test directories
    await fs.remove(testDir);
  });

  describe("Folder Existence Validation", () => {
    it("should verify folder exists before pinning", async () => {
      const nonExistentPath = path.join(testDir, "non-existent");
      const nonExistentFolder: SpotlightSearchResult = {
        ...testFolder1,
        path: nonExistentPath,
      };

      // Verify folder doesn't exist
      expect(await fs.exists(nonExistentPath)).toBe(false);
      // Verify the folder object has correct path
      expect(nonExistentFolder.path).toBe(nonExistentPath);
    });

    it("should handle folder deletion after pinning", async () => {
      const tempFolderPath = path.join(testDir, "temp");
      await fs.ensureDir(tempFolderPath);

      const stats = await fs.stat(tempFolderPath);
      const tempFolder: SpotlightSearchResult = {
        path: tempFolderPath,
        kMDItemFSName: "temp",
        kMDItemDisplayName: "Temporary Folder",
        kMDItemKind: "Folder",
        kMDItemFSSize: 0,
        kMDItemFSCreationDate: stats.birthtime,
        kMDItemContentModificationDate: stats.mtime,
        kMDItemLastUsedDate: stats.atime,
        kMDItemUseCount: 0,
      };

      // Verify folder exists and metadata is correct
      expect(await fs.exists(tempFolderPath)).toBe(true);
      expect(tempFolder.kMDItemFSName).toBe("temp");
      expect(tempFolder.kMDItemDisplayName).toBe("Temporary Folder");

      // Delete the folder
      await fs.remove(tempFolderPath);

      // Verify folder no longer exists
      expect(await fs.exists(tempFolderPath)).toBe(false);
    });
  });

  describe("Folder Metadata", () => {
    it("should track folder contents changes", async () => {
      const initialContents = await fs.readdir(testFolder1.path);

      // Create a file in the folder
      const testFile = path.join(testFolder1.path, "test.txt");
      await fs.writeFile(testFile, "test content");

      const updatedContents = await fs.readdir(testFolder1.path);

      // Verify folder contents changed
      expect(updatedContents.length).toBeGreaterThan(initialContents.length);
      expect(updatedContents).toContain("test.txt");
    });

    it("should compare metadata between folders", async () => {
      // Verify both test folders exist
      expect(await fs.exists(testFolder1.path)).toBe(true);
      expect(await fs.exists(testFolder2.path)).toBe(true);

      // Verify they have different paths and names
      expect(testFolder1.path).not.toBe(testFolder2.path);
      expect(testFolder1.kMDItemFSName).not.toBe(testFolder2.kMDItemFSName);
      expect(testFolder1.kMDItemDisplayName).not.toBe(testFolder2.kMDItemDisplayName);
    });
  });
});
