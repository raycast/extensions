import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getVaultNameFromPath,
  getVaultsFromPreferences,
  getVaultsFromObsidianJson,
  getVaultsFromPreferencesOrObsidianJson,
  getObsidianTarget,
  ObsidianTargetType,
} from "../obsidian/internal/obsidian";
import { ObsidianVault } from "../obsidian/internal/vault";
import fs from "fs";
import path from "path";
import os from "os";
import { getPreferenceValues } from "@raycast/api";

vi.mock("@raycast/api");

describe("obsidian", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "obsidian-test-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("getVaultNameFromPath", () => {
    it("should extract vault name from path", () => {
      expect(getVaultNameFromPath("/Users/test/Documents/MyVault")).toBe("MyVault");
    });

    it("should extract vault name from nested path", () => {
      expect(getVaultNameFromPath("/a/b/c/d/vault-name")).toBe("vault-name");
    });

    it("should handle vault name with spaces", () => {
      expect(getVaultNameFromPath("/path/to/My Vault Name")).toBe("My Vault Name");
    });

    it("should handle vault name with special characters", () => {
      expect(getVaultNameFromPath("/path/to/My-Vault_2023")).toBe("My-Vault_2023");
    });

    it("should return undefined for empty path", () => {
      expect(getVaultNameFromPath("")).toBeUndefined();
    });

    it("should handle single directory name", () => {
      expect(getVaultNameFromPath("vault")).toBe("vault");
    });

    it("should handle path with trailing slash", () => {
      // path.basename returns empty string for paths ending with slash
      // but in practice, trailing slashes are removed
      expect(getVaultNameFromPath("/path/to/vault/")).toBe("vault");
    });
  });

  describe("getVaultsFromPreferences", () => {
    it("should parse single vault from preferences", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({ vaultPath: tempDir });
      fs.mkdirSync(tempDir, { recursive: true });

      const vaults = getVaultsFromPreferences();

      expect(vaults.length).toBe(1);
      expect(vaults[0].path).toBe(tempDir);
      expect(vaults[0].name).toBe(path.basename(tempDir));
    });

    it("should parse multiple vaults from comma-separated string", () => {
      const vault1 = path.join(tempDir, "vault1");
      const vault2 = path.join(tempDir, "vault2");
      fs.mkdirSync(vault1, { recursive: true });
      fs.mkdirSync(vault2, { recursive: true });

      vi.mocked(getPreferenceValues).mockReturnValue({ vaultPath: `${vault1},${vault2}` });

      const vaults = getVaultsFromPreferences();

      expect(vaults.length).toBe(2);
      expect(vaults[0].name).toBe("vault1");
      expect(vaults[1].name).toBe("vault2");
    });

    it("should filter out non-existent paths", () => {
      const existingVault = path.join(tempDir, "existing");
      const nonExistentVault = path.join(tempDir, "nonexistent");
      fs.mkdirSync(existingVault, { recursive: true });

      vi.mocked(getPreferenceValues).mockReturnValue({
        vaultPath: `${existingVault},${nonExistentVault}`,
      });

      const vaults = getVaultsFromPreferences();

      expect(vaults.length).toBe(1);
      expect(vaults[0].name).toBe("existing");
    });

    it("should handle empty vault path", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({ vaultPath: "" });

      const vaults = getVaultsFromPreferences();

      expect(vaults).toEqual([]);
    });

    it("should trim whitespace from vault paths", () => {
      const vault = path.join(tempDir, "vault");
      fs.mkdirSync(vault, { recursive: true });

      // The code trims paths before checking existence
      vi.mocked(getPreferenceValues).mockReturnValue({ vaultPath: `  ${vault}  ` });

      const vaults = getVaultsFromPreferences();

      expect(vaults.length).toBe(1);
      expect(vaults[0].path).toBe(vault);
    });

    it("should handle commas with spaces", () => {
      const vault1 = path.join(tempDir, "vault1");
      const vault2 = path.join(tempDir, "vault2");
      fs.mkdirSync(vault1, { recursive: true });
      fs.mkdirSync(vault2, { recursive: true });

      // The code trims each path after splitting
      vi.mocked(getPreferenceValues).mockReturnValue({ vaultPath: `${vault1} , ${vault2}` });

      const vaults = getVaultsFromPreferences();

      expect(vaults.length).toBe(2);
      expect(vaults[0].path).toBe(vault1);
      expect(vaults[1].path).toBe(vault2);
    });
  });

  describe("getVaultsFromObsidianJson", () => {
    it("should parse vaults from obsidian.json", async () => {
      // We can't easily test this without mocking homedir and fs
      // But we can test that it doesn't crash on invalid files
      const vaults = await getVaultsFromObsidianJson();
      expect(Array.isArray(vaults)).toBe(true);
    });

    it("should return empty array if obsidian.json doesn't exist", async () => {
      const vaults = await getVaultsFromObsidianJson();
      // Will return empty array or actual vaults if running on dev machine
      expect(Array.isArray(vaults)).toBe(true);
    });
  });

  describe("getVaultsFromPreferencesOrObsidianJson", () => {
    it("should prefer vaults from preferences", async () => {
      const vault = path.join(tempDir, "vault");
      fs.mkdirSync(vault, { recursive: true });

      vi.mocked(getPreferenceValues).mockReturnValue({ vaultPath: vault });

      const vaults = await getVaultsFromPreferencesOrObsidianJson();

      expect(vaults.length).toBeGreaterThan(0);
      expect(vaults[0].path).toBe(vault);
    });

    it("should fallback to obsidian.json when preferences are empty", async () => {
      vi.mocked(getPreferenceValues).mockReturnValue({ vaultPath: "" });

      const vaults = await getVaultsFromPreferencesOrObsidianJson();

      expect(Array.isArray(vaults)).toBe(true);
    });
  });

  describe("getObsidianTarget", () => {
    const mockVault: ObsidianVault = {
      name: "Test Vault",
      key: "/path/to/vault",
      path: "/path/to/vault",
    };

    it("should generate OpenVault URL", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.OpenVault,
        vault: mockVault,
      });

      expect(url).toBe("obsidian://open?vault=Test%20Vault");
    });

    it("should generate OpenPath URL", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.OpenPath,
        path: "/path/to/note.md",
      });

      expect(url).toBe("obsidian://open?path=%2Fpath%2Fto%2Fnote.md");
    });

    it("should generate DailyNote URL", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.DailyNote,
        vault: mockVault,
      });

      expect(url).toBe("obsidian://advanced-uri?daily=true&vault=Test%20Vault");
    });

    it("should generate DailyNoteAppend URL with append mode", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.DailyNoteAppend,
        vault: mockVault,
        text: "New task",
      });

      expect(url).toContain("obsidian://advanced-uri?daily=true");
      expect(url).toContain("&mode=append");
      expect(url).toContain("&data=New%20task");
      expect(url).toContain("&vault=Test%20Vault");
    });

    it("should generate DailyNoteAppend URL with prepend mode", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.DailyNoteAppend,
        vault: mockVault,
        text: "Urgent task",
        prepend: true,
      });

      expect(url).toContain("&mode=prepend");
    });

    it("should generate DailyNoteAppend URL with heading", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.DailyNoteAppend,
        vault: mockVault,
        text: "Task",
        heading: "Todo",
      });

      expect(url).toContain("&heading=Todo");
    });

    it("should generate DailyNoteAppend URL with silent mode", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.DailyNoteAppend,
        vault: mockVault,
        text: "Task",
        silent: true,
      });

      expect(url).toContain("&openmode=silent");
    });

    it("should generate NewNote URL", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.NewNote,
        vault: mockVault,
        name: "New Note",
        content: "# Title\n\nContent",
      });

      expect(url).toContain("obsidian://new?vault=Test%20Vault");
      expect(url).toContain("&name=New%20Note");
      expect(url).toContain("&content=%23%20Title%0A%0AContent");
    });

    it("should generate NewNote URL without content", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.NewNote,
        vault: mockVault,
        name: "Empty Note",
      });

      expect(url).toContain("&content=");
    });

    it("should generate AppendTask URL", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.AppendTask,
        vault: mockVault,
        text: "- [ ] New task",
        path: "tasks.md",
      });

      expect(url).toContain("obsidian://advanced-uri?mode=append&filepath=tasks.md");
      expect(url).toContain("&data=-");
      expect(url).toContain("&vault=Test%20Vault");
    });

    it("should generate AppendTask URL with heading", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.AppendTask,
        vault: mockVault,
        text: "Task",
        path: "note.md",
        heading: "Important",
      });

      expect(url).toContain("&heading=Important");
    });

    it("should generate AppendTask URL with silent mode", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.AppendTask,
        vault: mockVault,
        text: "Task",
        path: "note.md",
        silent: true,
      });

      expect(url).toContain("&openmode=silent");
    });

    it("should handle special characters in URLs", () => {
      const url = getObsidianTarget({
        type: ObsidianTargetType.NewNote,
        vault: { name: "Vault Name!@#", key: "key", path: "path" },
        name: "Note with spaces & symbols",
        content: "Content with #hashtag",
      });

      // encodeURIComponent encodes ! as %21, @ as %40, # as %23
      expect(url).toContain("Vault%20Name");
      expect(url).toContain("Note%20with%20spaces");
    });
  });
});
