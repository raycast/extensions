import { ObsidianVault } from "@/obsidian";
import { getVaultNameFromPath, getVaultsFromPreferences } from "@/obsidian/internal/obsidian";
import { getNotes, getExcludedFolders, getNoteFileContent, getMedia } from "@/obsidian/internal/vault";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTempVault } from "./helpers/createTemporaryVault";
import fs from "fs";
import path from "path";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({
    excludedFolders: "",
    configFileName: ".obsidian",
    vaultPath: "/Test/test/test/vaultname",
  }),
  Icon: { Video: "video", Microphone: "mic" },
  Cache: class MockCache {
    private storage = new Map<string, string>();
    has(key: string) {
      return this.storage.has(key);
    }
    get(key: string) {
      return this.storage.get(key);
    }
    set(key: string, value: string) {
      this.storage.set(key, value);
    }
    remove(key: string) {
      this.storage.delete(key);
    }
  },
}));

describe("vault", () => {
  let tempVaultData: {
    vault: ObsidianVault;
    cleanup: () => void;
    paths: Record<string, string>;
  };

  beforeEach(() => {
    tempVaultData = createTempVault();
  });

  afterEach(() => {
    if (tempVaultData) {
      tempVaultData.cleanup();
    }
  });

  describe("getVaultNameFromPath", () => {
    it("should get vault name from path", () => {
      const vaultName = getVaultNameFromPath("/Test/test/test/vaultname");
      expect(vaultName).toBe("vaultname");
    });
  });

  describe("getExistingVaultsFromPreferences", () => {
    it("should  get exisitng vaults from preferences", () => {
      const vaults = getVaultsFromPreferences();
      console.log(vaults);
    });
  });

  describe("getNoteEntries", () => {
    it("should get note entries", async () => {
      const noteMetadataEntries = await getNotes(tempVaultData.vault.path);
      expect(noteMetadataEntries.length).toBe(2);
    });

    it("should include canvas files in note entries", async () => {
      const canvas1Path = path.join(tempVaultData.vault.path, "canvas1.canvas");
      const canvas2Path = path.join(tempVaultData.vault.path, "Folder1", "canvas2.canvas");

      fs.writeFileSync(canvas1Path, JSON.stringify({ nodes: [], edges: [] }));
      fs.writeFileSync(canvas2Path, JSON.stringify({ nodes: [], edges: [] }));

      const noteMetadataEntries = await getNotes(tempVaultData.vault.path);

      // Should have 2 markdown files + 2 canvas files = 4 total
      expect(noteMetadataEntries.length).toBe(4);

      const canvasNotes = noteMetadataEntries.filter((note) => note.path.endsWith(".canvas"));
      expect(canvasNotes.length).toBe(2);

      const canvas1Note = noteMetadataEntries.find((note) => note.title === "canvas1");
      expect(canvas1Note).toBeDefined();
      expect(canvas1Note?.path).toBe(canvas1Path);

      const canvas2Note = noteMetadataEntries.find((note) => note.title === "canvas2");
      expect(canvas2Note).toBeDefined();
      expect(canvas2Note?.path).toBe(canvas2Path);
    });

    it("should exclude canvas files from excluded folders", async () => {
      const excludedFolder = path.join(tempVaultData.vault.path, "excluded");
      fs.mkdirSync(excludedFolder, { recursive: true });

      const normalCanvasPath = path.join(tempVaultData.vault.path, "normal.canvas");
      const excludedCanvasPath = path.join(excludedFolder, "excluded.canvas");
      const normalMdPath = path.join(tempVaultData.vault.path, "normal.md");

      fs.writeFileSync(normalCanvasPath, JSON.stringify({ nodes: [], edges: [] }));
      fs.writeFileSync(excludedCanvasPath, JSON.stringify({ nodes: [], edges: [] }));
      fs.writeFileSync(normalMdPath, "# Normal note");

      const noteMetadataEntries = await getNotes(tempVaultData.vault.path, ".obsidian", ["excluded"]);

      const noteTitles = noteMetadataEntries.map((note) => note.title);
      expect(noteTitles).toContain("normal");
      expect(noteTitles).not.toContain("excluded");

      // Should have 2 original markdown files + 1 normal.md + 1 normal.canvas = 4 total
      expect(noteMetadataEntries.length).toBe(4);
    });

    it("should set bookmarked status for canvas files", async () => {
      const canvasPath = path.join(tempVaultData.vault.path, "bookmarked.canvas");
      fs.writeFileSync(canvasPath, JSON.stringify({ nodes: [], edges: [] }));

      // Create bookmarks.json with canvas file
      const bookmarksJsonPath = path.join(tempVaultData.vault.path, ".obsidian", "bookmarks.json");
      const bookmarksData = {
        items: [
          {
            type: "file",
            title: "Bookmarked Canvas",
            path: "bookmarked.canvas",
          },
        ],
      };
      fs.writeFileSync(bookmarksJsonPath, JSON.stringify(bookmarksData, null, 2));

      const noteMetadataEntries = await getNotes(tempVaultData.vault.path);

      const canvasNote = noteMetadataEntries.find((note) => note.title === "bookmarked");
      expect(canvasNote).toBeDefined();
      expect(canvasNote?.bookmarked).toBe(true);
    });

    it("should return both markdown and canvas files with correct metadata", async () => {
      const canvasPath = path.join(tempVaultData.vault.path, "test.canvas");
      fs.writeFileSync(canvasPath, JSON.stringify({ nodes: [], edges: [] }));

      const noteMetadataEntries = await getNotes(tempVaultData.vault.path);

      // Verify all notes have required properties
      noteMetadataEntries.forEach((note) => {
        expect(note).toHaveProperty("title");
        expect(note).toHaveProperty("path");
        expect(note).toHaveProperty("lastModified");
        expect(note).toHaveProperty("bookmarked");
        expect(typeof note.title).toBe("string");
        expect(typeof note.path).toBe("string");
        expect(note.lastModified).toBeInstanceOf(Date);
        expect(typeof note.bookmarked).toBe("boolean");
      });

      // Should have at least 3 notes (2 md + 1 canvas)
      expect(noteMetadataEntries.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getExcludedFolders", () => {
    it("should return empty array when app.json does not exist", () => {
      const excludedFolders = getExcludedFolders(tempVaultData.vault.path, ".obsidian");
      expect(excludedFolders).toEqual([]);
    });

    it("should return excluded folders when app.json exists with userIgnoreFilters", () => {
      const appJsonPath = path.join(tempVaultData.vault.path, ".obsidian", "app.json");
      const appConfig = {
        userIgnoreFilters: ["Archive", "Templates", "Private"],
      };
      fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));

      const excludedFolders = getExcludedFolders(tempVaultData.vault.path, ".obsidian");
      expect(excludedFolders).toEqual(["Archive", "Templates", "Private"]);
    });

    it("should return empty array when app.json exists but userIgnoreFilters is missing", () => {
      const appJsonPath = path.join(tempVaultData.vault.path, ".obsidian", "app.json");
      const appConfig = {
        someOtherSetting: "value",
      };
      fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));

      const excludedFolders = getExcludedFolders(tempVaultData.vault.path, ".obsidian");
      expect(excludedFolders).toEqual([]);
    });

    it("should work with custom config file names", () => {
      const customConfigDir = ".config";
      fs.mkdirSync(path.join(tempVaultData.vault.path, customConfigDir), { recursive: true });

      const appJsonPath = path.join(tempVaultData.vault.path, customConfigDir, "app.json");
      const appConfig = {
        userIgnoreFilters: ["CustomFolder"],
      };
      fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));

      const excludedFolders = getExcludedFolders(tempVaultData.vault.path, customConfigDir);
      expect(excludedFolders).toEqual(["CustomFolder"]);
    });

    it("should handle empty userIgnoreFilters array", () => {
      const appJsonPath = path.join(tempVaultData.vault.path, ".obsidian", "app.json");
      const appConfig = {
        userIgnoreFilters: [],
      };
      fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));

      const excludedFolders = getExcludedFolders(tempVaultData.vault.path, ".obsidian");
      expect(excludedFolders).toEqual([]);
    });
  });

  describe("getNoteFileContent", () => {
    it("should read file content without filter", async () => {
      const testFilePath = path.join(tempVaultData.vault.path, "test-note.md");
      const testContent = "# Test Note\n\nThis is test content.";
      fs.writeFileSync(testFilePath, testContent);

      const content = await getNoteFileContent(testFilePath);
      expect(content).toBe(testContent);
    });

    it("should read file content with filter function", async () => {
      const testFilePath = path.join(tempVaultData.vault.path, "test-note-with-filter.md");
      const testContent = "# Test Note\n\nThis is test content with some words.";
      fs.writeFileSync(testFilePath, testContent);

      const filterFunc = (input: string) => input.toUpperCase();
      const content = await getNoteFileContent(testFilePath, filterFunc);
      expect(content).toBe(testContent.toUpperCase());
    });

    it("should handle empty file", async () => {
      const testFilePath = path.join(tempVaultData.vault.path, "empty-note.md");
      fs.writeFileSync(testFilePath, "");

      const content = await getNoteFileContent(testFilePath);
      expect(content).toBe("");
    });

    it("should handle file with special characters", async () => {
      const testFilePath = path.join(tempVaultData.vault.path, "special-chars.md");
      const testContent = "# Test\n\nSpecial chars: émoji 🎉, symbols ©®™, quotes 'test'";
      fs.writeFileSync(testFilePath, testContent);

      const content = await getNoteFileContent(testFilePath);
      expect(content).toBe(testContent);
    });

    it("should throw error for non-existent file", async () => {
      const nonExistentPath = path.join(tempVaultData.vault.path, "non-existent.md");

      await expect(getNoteFileContent(nonExistentPath)).rejects.toThrow();
    });
  });

  describe("getMedia", () => {
    it("should return media files from vault", async () => {
      // Create various media files
      const imagePath = path.join(tempVaultData.vault.path, "image.jpg");
      const pdfPath = path.join(tempVaultData.vault.path, "document.pdf");
      const videoPath = path.join(tempVaultData.vault.path, "video.mp4");
      const audioPath = path.join(tempVaultData.vault.path, "audio.mp3");

      fs.writeFileSync(imagePath, "fake image content");
      fs.writeFileSync(pdfPath, "fake pdf content");
      fs.writeFileSync(videoPath, "fake video content");
      fs.writeFileSync(audioPath, "fake audio content");

      const media = await getMedia(tempVaultData.vault.path, ".obsidian", []);

      // Should include at least the files we created (may also include media.jpg from createTempVault)
      expect(media.length).toBeGreaterThanOrEqual(4);

      const mediaTitles = media.map((m) => m.title);
      expect(mediaTitles).toContain("image.jpg");
      expect(mediaTitles).toContain("document.pdf");
      expect(mediaTitles).toContain("video.mp4");
      expect(mediaTitles).toContain("audio.mp3");
    });

    it("should return correct media structure with title and path", async () => {
      const imagePath = path.join(tempVaultData.vault.path, "test-image.png");
      fs.writeFileSync(imagePath, "fake content");

      const media = await getMedia(tempVaultData.vault.path, ".obsidian", []);

      const testImage = media.find((m) => m.title === "test-image.png");
      expect(testImage).toBeDefined();
      expect(testImage?.title).toBe("test-image.png");
      expect(testImage?.path).toBe(imagePath);
    });

    it("should exclude media from specified folders", async () => {
      // Create a folder to exclude
      const excludedFolder = path.join(tempVaultData.vault.path, "excluded");
      fs.mkdirSync(excludedFolder, { recursive: true });

      const normalImagePath = path.join(tempVaultData.vault.path, "normal.jpg");
      const excludedImagePath = path.join(excludedFolder, "excluded.jpg");

      fs.writeFileSync(normalImagePath, "normal image");
      fs.writeFileSync(excludedImagePath, "excluded image");

      const media = await getMedia(tempVaultData.vault.path, ".obsidian", ["excluded"]);

      const mediaTitles = media.map((m) => m.title);
      expect(mediaTitles).toContain("normal.jpg");
      expect(mediaTitles).not.toContain("excluded.jpg");
    });

    it("should exclude media from .obsidian folder", async () => {
      const obsidianImagePath = path.join(tempVaultData.vault.path, ".obsidian", "config-image.png");
      fs.writeFileSync(obsidianImagePath, "config image");

      const normalImagePath = path.join(tempVaultData.vault.path, "normal.png");
      fs.writeFileSync(normalImagePath, "normal image");

      const media = await getMedia(tempVaultData.vault.path, ".obsidian", []);

      const mediaTitles = media.map((m) => m.title);
      expect(mediaTitles).toContain("normal.png");
      expect(mediaTitles).not.toContain("config-image.png");
    });

    it("should respect userIgnoreFilters from app.json", async () => {
      // Create app.json with userIgnoreFilters
      const appJsonPath = path.join(tempVaultData.vault.path, ".obsidian", "app.json");
      const appConfig = {
        userIgnoreFilters: ["Archive"],
      };
      fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));

      // Create archive folder
      const archiveFolder = path.join(tempVaultData.vault.path, "Archive");
      fs.mkdirSync(archiveFolder, { recursive: true });

      const normalImagePath = path.join(tempVaultData.vault.path, "normal.jpg");
      const archivedImagePath = path.join(archiveFolder, "archived.jpg");

      fs.writeFileSync(normalImagePath, "normal image");
      fs.writeFileSync(archivedImagePath, "archived image");

      const media = await getMedia(tempVaultData.vault.path, ".obsidian", []);

      const mediaTitles = media.map((m) => m.title);
      expect(mediaTitles).toContain("normal.jpg");
      expect(mediaTitles).not.toContain("archived.jpg");
    });

    it("should return empty array when no media files exist", async () => {
      // Create a fresh temp vault without media
      const emptyVaultPath = path.join(tempVaultData.vault.path, "empty-vault");
      fs.mkdirSync(emptyVaultPath, { recursive: true });
      fs.mkdirSync(path.join(emptyVaultPath, ".obsidian"), { recursive: true });

      // Add only markdown files (not media)
      const notePath = path.join(emptyVaultPath, "note.md");
      fs.writeFileSync(notePath, "# Note");

      const media = await getMedia(emptyVaultPath, ".obsidian", []);
      expect(media).toEqual([]);
    });

    it("should handle multiple file types in subdirectories", async () => {
      const subfolder = path.join(tempVaultData.vault.path, "media-folder");
      fs.mkdirSync(subfolder, { recursive: true });

      const pngPath = path.join(subfolder, "image.png");
      const gifPath = path.join(subfolder, "animation.gif");
      const webmPath = path.join(subfolder, "video.webm");
      const flacPath = path.join(subfolder, "audio.flac");

      fs.writeFileSync(pngPath, "png content");
      fs.writeFileSync(gifPath, "gif content");
      fs.writeFileSync(webmPath, "webm content");
      fs.writeFileSync(flacPath, "flac content");

      const media = await getMedia(tempVaultData.vault.path, ".obsidian", []);

      const mediaTitles = media.map((m) => m.title);
      expect(mediaTitles).toContain("image.png");
      expect(mediaTitles).toContain("animation.gif");
      expect(mediaTitles).toContain("video.webm");
      expect(mediaTitles).toContain("audio.flac");
    });
  });
});
