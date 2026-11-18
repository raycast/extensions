import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { getWorkspacesJson, getWorkspaces, WorkspacesJson } from "@/obsidian/internal/workspaces";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({
    configFileName: ".obsidian",
  }),
}));

describe("workspaces", () => {
  let tempDir: string;
  let vaultPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "obsidian-workspaces-test-"));
    vaultPath = path.join(tempDir, "test-vault");
    fs.mkdirSync(vaultPath, { recursive: true });
    fs.mkdirSync(path.join(vaultPath, ".obsidian"), { recursive: true });
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("getWorkspacesJson", () => {
    it("should return workspaces JSON when file exists", () => {
      const workspacesData: WorkspacesJson = {
        workspaces: {
          "Main Workspace": {
            main: {},
            left: {},
            right: {},
            "left-ribbon": {},
            active: "workspace-1",
            mtime: "2024-01-01T00:00:00.000Z",
          },
          "Writing Workspace": {
            main: {},
            left: {},
            right: {},
            "left-ribbon": {},
            active: "workspace-2",
            mtime: "2024-01-02T00:00:00.000Z",
          },
        },
        active: "Main Workspace",
      };

      const workspacesPath = path.join(vaultPath, ".obsidian", "workspaces.json");
      fs.writeFileSync(workspacesPath, JSON.stringify(workspacesData, null, 2));

      const result = getWorkspacesJson(vaultPath, ".obsidian");

      expect(result).toBeDefined();
      expect(result?.workspaces).toHaveProperty("Main Workspace");
      expect(result?.workspaces).toHaveProperty("Writing Workspace");
      expect(result?.active).toBe("Main Workspace");
    });

    it("should return undefined when workspaces.json does not exist", () => {
      const result = getWorkspacesJson(vaultPath, ".obsidian");

      expect(result).toBeUndefined();
    });

    it("should handle custom config directory name", () => {
      const customConfigDir = ".config";
      fs.mkdirSync(path.join(vaultPath, customConfigDir), { recursive: true });

      const workspacesData: WorkspacesJson = {
        workspaces: {
          "Test Workspace": {
            main: {},
            left: {},
            right: {},
            "left-ribbon": {},
            active: "workspace-1",
            mtime: "2024-01-01T00:00:00.000Z",
          },
        },
        active: "Test Workspace",
      };

      const workspacesPath = path.join(vaultPath, customConfigDir, "workspaces.json");
      fs.writeFileSync(workspacesPath, JSON.stringify(workspacesData, null, 2));

      const result = getWorkspacesJson(vaultPath, customConfigDir);

      expect(result).toBeDefined();
      expect(result?.workspaces).toHaveProperty("Test Workspace");
    });

    it("should parse valid JSON from workspaces.json", () => {
      const workspacesData: WorkspacesJson = {
        workspaces: {
          Work: {
            main: { type: "split", children: [] },
            left: { ribbonCollapsed: false },
            right: { ribbonCollapsed: true },
            "left-ribbon": { hiddenItems: {} },
            active: "workspace-id",
            mtime: "2024-01-01T00:00:00.000Z",
          },
        },
        active: "Work",
      };

      const workspacesPath = path.join(vaultPath, ".obsidian", "workspaces.json");
      fs.writeFileSync(workspacesPath, JSON.stringify(workspacesData, null, 2));

      const result = getWorkspacesJson(vaultPath, ".obsidian");

      expect(result).toBeDefined();
      expect(result?.workspaces.Work.mtime).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should handle empty workspaces object", () => {
      const workspacesData: WorkspacesJson = {
        workspaces: {},
        active: "",
      };

      const workspacesPath = path.join(vaultPath, ".obsidian", "workspaces.json");
      fs.writeFileSync(workspacesPath, JSON.stringify(workspacesData, null, 2));

      const result = getWorkspacesJson(vaultPath, ".obsidian");

      expect(result).toBeDefined();
      expect(Object.keys(result?.workspaces || {})).toHaveLength(0);
      expect(result?.active).toBe("");
    });

    it("should handle workspace names with special characters", () => {
      const workspacesData: WorkspacesJson = {
        workspaces: {
          "My Workspace (2024)": {
            main: {},
            left: {},
            right: {},
            "left-ribbon": {},
            active: "workspace-1",
            mtime: "2024-01-01T00:00:00.000Z",
          },
          "Writing & Editing": {
            main: {},
            left: {},
            right: {},
            "left-ribbon": {},
            active: "workspace-2",
            mtime: "2024-01-02T00:00:00.000Z",
          },
        },
        active: "My Workspace (2024)",
      };

      const workspacesPath = path.join(vaultPath, ".obsidian", "workspaces.json");
      fs.writeFileSync(workspacesPath, JSON.stringify(workspacesData, null, 2));

      const result = getWorkspacesJson(vaultPath, ".obsidian");

      expect(result).toBeDefined();
      expect(result?.workspaces).toHaveProperty("My Workspace (2024)");
      expect(result?.workspaces).toHaveProperty("Writing & Editing");
    });
  });

  describe("getWorkspaces", () => {
    it("should return workspaces data", () => {
      const workspacesData: WorkspacesJson = {
        workspaces: {
          Default: {
            main: {},
            left: {},
            right: {},
            "left-ribbon": {},
            active: "workspace-1",
            mtime: "2024-01-01T00:00:00.000Z",
          },
        },
        active: "Default",
      };

      const workspacesPath = path.join(vaultPath, ".obsidian", "workspaces.json");
      fs.writeFileSync(workspacesPath, JSON.stringify(workspacesData, null, 2));

      const result = getWorkspaces(vaultPath, ".obsidian");

      expect(result).toBeDefined();
      expect(result?.active).toBe("Default");
      expect(result?.workspaces).toHaveProperty("Default");
    });

    it("should return undefined when workspaces.json does not exist", () => {
      const result = getWorkspaces(vaultPath, ".obsidian");

      expect(result).toBeUndefined();
    });

    it("should return same data as getWorkspacesJson", () => {
      const workspacesData: WorkspacesJson = {
        workspaces: {
          "Workspace A": {
            main: {},
            left: {},
            right: {},
            "left-ribbon": {},
            active: "workspace-1",
            mtime: "2024-01-01T00:00:00.000Z",
          },
        },
        active: "Workspace A",
      };

      const workspacesPath = path.join(vaultPath, ".obsidian", "workspaces.json");
      fs.writeFileSync(workspacesPath, JSON.stringify(workspacesData, null, 2));

      const directResult = getWorkspacesJson(vaultPath, ".obsidian");
      const apiResult = getWorkspaces(vaultPath, ".obsidian");

      expect(apiResult).toEqual(directResult);
    });
  });
});
