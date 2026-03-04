import { describe, expect, it } from "vitest";
import type { DrawerConfig } from "../types";
import { DEFAULT_CONFIG } from "../types";
import {
  createFolderWithApp,
  extractAppFromFolder,
  moveItem,
  parseConfig,
  reconcileApps,
  removeAppFromCurrentLocation,
  sortByName,
} from "../utils";

// --- Helper to create mock Application objects ---
function mockApp(bundleId: string, name: string, path = `/Applications/${name}.app`) {
  return { bundleId, name, path } as { bundleId: string; name: string; path: string };
}

function makeConfig(overrides: Partial<DrawerConfig> = {}): DrawerConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

// ============================================================
// parseConfig
// ============================================================
describe("parseConfig", () => {
  it("returns DEFAULT_CONFIG for undefined input", () => {
    expect(parseConfig(undefined)).toEqual(DEFAULT_CONFIG);
  });

  it("returns DEFAULT_CONFIG for empty string", () => {
    expect(parseConfig("")).toEqual(DEFAULT_CONFIG);
  });

  it("returns DEFAULT_CONFIG for invalid JSON", () => {
    expect(parseConfig("{broken")).toEqual(DEFAULT_CONFIG);
  });

  it("returns DEFAULT_CONFIG for null parsed value", () => {
    expect(parseConfig("null")).toEqual(DEFAULT_CONFIG);
  });

  it("parses valid v1 config with gridOrder", () => {
    const config: DrawerConfig = {
      version: 1,
      folders: [{ id: "f1", name: "Folder", appBundleIds: ["com.app.a"] }],
      gridOrder: [
        { type: "folder", folderId: "f1" },
        { type: "app", bundleId: "com.app.b" },
      ],
    };
    expect(parseConfig(JSON.stringify(config))).toEqual(config);
  });

  it("migrates old format (uncategorizedAppIds) to gridOrder", () => {
    const oldConfig = {
      version: 1,
      folders: [{ id: "f1", name: "Test", appBundleIds: ["com.app.a"] }],
      uncategorizedAppIds: ["com.app.b", "com.app.c"],
    };
    const result = parseConfig(JSON.stringify(oldConfig));
    expect(result.gridOrder).toEqual([
      { type: "folder", folderId: "f1" },
      { type: "app", bundleId: "com.app.b" },
      { type: "app", bundleId: "com.app.c" },
    ]);
    expect(result.folders).toEqual(oldConfig.folders);
  });

  it("migrates old format without version field", () => {
    const oldConfig = {
      folders: [],
      uncategorizedAppIds: ["com.app.a"],
    };
    const result = parseConfig(JSON.stringify(oldConfig));
    expect(result.gridOrder).toEqual([{ type: "app", bundleId: "com.app.a" }]);
  });

  it("returns DEFAULT_CONFIG for unknown structure", () => {
    expect(parseConfig(JSON.stringify({ version: 1, something: "else" }))).toEqual(DEFAULT_CONFIG);
  });
});

// ============================================================
// reconcileApps
// ============================================================
describe("reconcileApps", () => {
  it("adds new apps to gridOrder alphabetically", () => {
    const config = makeConfig();
    const apps = [mockApp("com.b", "Bravo"), mockApp("com.a", "Alpha")];
    const result = reconcileApps(config, apps);
    expect(result.gridOrder).toEqual([
      { type: "app", bundleId: "com.a" },
      { type: "app", bundleId: "com.b" },
    ]);
  });

  it("preserves existing order and appends new apps", () => {
    const config = makeConfig({
      gridOrder: [{ type: "app", bundleId: "com.existing" }],
    });
    const apps = [mockApp("com.existing", "Existing"), mockApp("com.new", "New")];
    const result = reconcileApps(config, apps);
    expect(result.gridOrder).toEqual([
      { type: "app", bundleId: "com.existing" },
      { type: "app", bundleId: "com.new" },
    ]);
  });

  it("removes uninstalled apps from gridOrder", () => {
    const config = makeConfig({
      gridOrder: [
        { type: "app", bundleId: "com.keep" },
        { type: "app", bundleId: "com.removed" },
      ],
    });
    const apps = [mockApp("com.keep", "Keep")];
    const result = reconcileApps(config, apps);
    expect(result.gridOrder).toEqual([{ type: "app", bundleId: "com.keep" }]);
  });

  it("removes uninstalled apps from folders", () => {
    const config = makeConfig({
      folders: [{ id: "f1", name: "F", appBundleIds: ["com.keep", "com.removed"] }],
      gridOrder: [{ type: "folder", folderId: "f1" }],
    });
    const apps = [mockApp("com.keep", "Keep")];
    const result = reconcileApps(config, apps);
    expect(result.folders[0].appBundleIds).toEqual(["com.keep"]);
  });

  it("removes empty folders and their gridOrder entries", () => {
    const config = makeConfig({
      folders: [{ id: "f1", name: "Empty Soon", appBundleIds: ["com.removed"] }],
      gridOrder: [
        { type: "folder", folderId: "f1" },
        { type: "app", bundleId: "com.keep" },
      ],
    });
    const apps = [mockApp("com.keep", "Keep")];
    const result = reconcileApps(config, apps);
    expect(result.folders).toEqual([]);
    expect(result.gridOrder).toEqual([{ type: "app", bundleId: "com.keep" }]);
  });

  it("does not add apps already tracked in folders", () => {
    const config = makeConfig({
      folders: [{ id: "f1", name: "F", appBundleIds: ["com.inFolder"] }],
      gridOrder: [{ type: "folder", folderId: "f1" }],
    });
    const apps = [mockApp("com.inFolder", "InFolder")];
    const result = reconcileApps(config, apps);
    // Should NOT appear again in gridOrder as a standalone app
    expect(result.gridOrder).toEqual([{ type: "folder", folderId: "f1" }]);
  });
});

// ============================================================
// removeAppFromCurrentLocation
// ============================================================
describe("removeAppFromCurrentLocation", () => {
  it("removes app from gridOrder when not in folder", () => {
    const config = makeConfig({
      gridOrder: [
        { type: "app", bundleId: "com.a" },
        { type: "app", bundleId: "com.b" },
      ],
    });
    const result = removeAppFromCurrentLocation(config, "com.a", null);
    expect(result.gridOrder).toEqual([{ type: "app", bundleId: "com.b" }]);
  });

  it("removes app from folder, keeping folder intact", () => {
    const config = makeConfig({
      folders: [{ id: "f1", name: "F", appBundleIds: ["com.a", "com.b"] }],
      gridOrder: [{ type: "folder", folderId: "f1" }],
    });
    const result = removeAppFromCurrentLocation(config, "com.a", "f1");
    expect(result.folders[0].appBundleIds).toEqual(["com.b"]);
    expect(result.gridOrder).toEqual([{ type: "folder", folderId: "f1" }]);
  });

  it("auto-deletes empty folder and its gridOrder entry", () => {
    const config = makeConfig({
      folders: [{ id: "f1", name: "F", appBundleIds: ["com.a"] }],
      gridOrder: [
        { type: "folder", folderId: "f1" },
        { type: "app", bundleId: "com.b" },
      ],
    });
    const result = removeAppFromCurrentLocation(config, "com.a", "f1");
    expect(result.folders).toEqual([]);
    expect(result.gridOrder).toEqual([{ type: "app", bundleId: "com.b" }]);
  });

  it("does not affect other folders when removing from one", () => {
    const config = makeConfig({
      folders: [
        { id: "f1", name: "F1", appBundleIds: ["com.a"] },
        { id: "f2", name: "F2", appBundleIds: ["com.b"] },
      ],
      gridOrder: [
        { type: "folder", folderId: "f1" },
        { type: "folder", folderId: "f2" },
      ],
    });
    const result = removeAppFromCurrentLocation(config, "com.a", "f1");
    // f1 should be auto-deleted, f2 should remain
    expect(result.folders).toEqual([{ id: "f2", name: "F2", appBundleIds: ["com.b"] }]);
    expect(result.gridOrder).toEqual([{ type: "folder", folderId: "f2" }]);
  });
});

// ============================================================
// moveItem
// ============================================================
describe("moveItem", () => {
  it("moves item forward", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves item backward", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("returns same array for out-of-bounds", () => {
    const arr = ["a", "b"];
    expect(moveItem(arr, -1, 0)).toBe(arr);
    expect(moveItem(arr, 0, 5)).toBe(arr);
  });

  it("handles same index (no-op)", () => {
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });
});

// ============================================================
// sortByName
// ============================================================
describe("sortByName", () => {
  it("sorts bundleIds by app name", () => {
    const appMap = new Map<string, { name: string }>([
      ["com.c", { name: "Charlie" }],
      ["com.a", { name: "Alpha" }],
      ["com.b", { name: "Bravo" }],
    ]);
    // Cast to satisfy Application type requirement
    const result = sortByName(["com.c", "com.a", "com.b"], appMap as never);
    expect(result).toEqual(["com.a", "com.b", "com.c"]);
  });

  it("handles missing apps in map", () => {
    const appMap = new Map<string, { name: string }>([["com.a", { name: "Alpha" }]]);
    const result = sortByName(["com.missing", "com.a"], appMap as never);
    // Missing apps sort by empty string (first)
    expect(result).toEqual(["com.missing", "com.a"]);
  });
});

// ============================================================
// extractAppFromFolder
// ============================================================
describe("extractAppFromFolder", () => {
  it("removes app from folder and inserts after folder in gridOrder", () => {
    const config = makeConfig({
      folders: [{ id: "f1", name: "F", appBundleIds: ["com.a", "com.b"] }],
      gridOrder: [
        { type: "folder", folderId: "f1" },
        { type: "app", bundleId: "com.c" },
      ],
    });
    const result = extractAppFromFolder(config, "com.a", "f1");
    expect(result.folders[0].appBundleIds).toEqual(["com.b"]);
    expect(result.gridOrder).toEqual([
      { type: "folder", folderId: "f1" },
      { type: "app", bundleId: "com.a" },
      { type: "app", bundleId: "com.c" },
    ]);
  });

  it("removes last app: folder deleted, app placed at folder's old position (Finding 2 regression)", () => {
    const config = makeConfig({
      folders: [{ id: "f1", name: "F", appBundleIds: ["com.a"] }],
      gridOrder: [
        { type: "app", bundleId: "com.x" },
        { type: "folder", folderId: "f1" },
        { type: "app", bundleId: "com.y" },
      ],
    });
    const result = extractAppFromFolder(config, "com.a", "f1");
    expect(result.folders).toEqual([]);
    // App should be at folder's old position (index 1), NOT at index 0
    expect(result.gridOrder).toEqual([
      { type: "app", bundleId: "com.x" },
      { type: "app", bundleId: "com.a" },
      { type: "app", bundleId: "com.y" },
    ]);
  });

  it("removes last app from first folder: app stays at position 0", () => {
    const config = makeConfig({
      folders: [{ id: "f1", name: "F", appBundleIds: ["com.a"] }],
      gridOrder: [
        { type: "folder", folderId: "f1" },
        { type: "app", bundleId: "com.b" },
      ],
    });
    const result = extractAppFromFolder(config, "com.a", "f1");
    expect(result.gridOrder).toEqual([
      { type: "app", bundleId: "com.a" },
      { type: "app", bundleId: "com.b" },
    ]);
  });
});

// ============================================================
// createFolderWithApp
// ============================================================
describe("createFolderWithApp", () => {
  it("creates folder at the app's original gridOrder position", () => {
    const config = makeConfig({
      gridOrder: [
        { type: "app", bundleId: "com.a" },
        { type: "app", bundleId: "com.b" },
        { type: "app", bundleId: "com.c" },
      ],
    });
    const result = createFolderWithApp(config, "com.b", null, "new-folder-id");
    expect(result.gridOrder).toEqual([
      { type: "app", bundleId: "com.a" },
      { type: "folder", folderId: "new-folder-id" },
      { type: "app", bundleId: "com.c" },
    ]);
    expect(result.folders).toEqual([{ id: "new-folder-id", name: "New Folder", appBundleIds: ["com.b"] }]);
  });

  it("creates folder from app inside another folder (appends to end)", () => {
    const config = makeConfig({
      folders: [{ id: "f1", name: "F1", appBundleIds: ["com.a", "com.b"] }],
      gridOrder: [
        { type: "folder", folderId: "f1" },
        { type: "app", bundleId: "com.c" },
      ],
    });
    const result = createFolderWithApp(config, "com.a", "f1", "new-folder-id");
    // com.a was not in gridOrder directly, so new folder appends
    expect(result.gridOrder[result.gridOrder.length - 1]).toEqual({ type: "folder", folderId: "new-folder-id" });
    // Original folder should still have com.b
    expect(result.folders.find((f) => f.id === "f1")?.appBundleIds).toEqual(["com.b"]);
  });

  it("uses custom folder name", () => {
    const config = makeConfig({
      gridOrder: [{ type: "app", bundleId: "com.a" }],
    });
    const result = createFolderWithApp(config, "com.a", null, "fid", "My Folder");
    expect(result.folders[0].name).toBe("My Folder");
  });
});
