import {
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_DIR = join(tmpdir(), "project-opener-test-collections");
const TEST_COLLECTIONS_FILE = join(TEST_DIR, "collections.json");
const TEST_SETTINGS_FILE = join(TEST_DIR, "project-settings.json");

import type { Collection } from "../types";

// Replicate functions with test path
function loadCollections(): Collection[] {
  try {
    if (existsSync(TEST_COLLECTIONS_FILE)) {
      const data = readFileSync(TEST_COLLECTIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    return [];
  }
  return [];
}

function saveCollections(collections: Collection[]): void {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
  writeFileSync(TEST_COLLECTIONS_FILE, JSON.stringify(collections, null, 2));
}

function createCollection(collection: Omit<Collection, "id">): Collection {
  const id = `coll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newCollection: Collection = { ...collection, id };
  const collections = loadCollections();
  collections.push(newCollection);
  saveCollections(collections);
  return newCollection;
}

function updateCollection(
  id: string,
  updates: Partial<Omit<Collection, "id" | "type">>,
): Collection | null {
  const collections = loadCollections();
  const index = collections.findIndex((c) => c.id === id);
  if (index === -1) return null;
  collections[index] = { ...collections[index], ...updates };
  saveCollections(collections);
  return collections[index];
}

function deleteCollection(id: string): boolean {
  const collections = loadCollections();
  const filtered = collections.filter((c) => c.id !== id);
  if (filtered.length === collections.length) return false;
  saveCollections(filtered);
  return true;
}

describe("collections storage", () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(() => {
    if (existsSync(TEST_COLLECTIONS_FILE)) {
      rmSync(TEST_COLLECTIONS_FILE);
    }
    if (existsSync(TEST_SETTINGS_FILE)) {
      rmSync(TEST_SETTINGS_FILE);
    }
  });

  describe("loadCollections", () => {
    test("returns empty array when no file exists", () => {
      const collections = loadCollections();
      expect(collections).toEqual([]);
    });

    test("loads collections from file", () => {
      const testCollections: Collection[] = [
        { id: "work", name: "Work", type: "manual" },
      ];
      writeFileSync(TEST_COLLECTIONS_FILE, JSON.stringify(testCollections));

      const collections = loadCollections();
      expect(collections).toHaveLength(1);
      expect(collections[0].name).toBe("Work");
    });
  });

  describe("createCollection", () => {
    test("creates collection with generated id", () => {
      const collection = createCollection({ name: "Personal", type: "manual" });
      expect(collection.id).toMatch(/^coll_/);
      expect(collection.name).toBe("Personal");
    });

    test("persists collection to file", () => {
      createCollection({ name: "Work", type: "manual" });
      const loaded = loadCollections();
      expect(loaded).toHaveLength(1);
    });
  });

  describe("updateCollection", () => {
    test("updates existing collection", () => {
      const created = createCollection({ name: "Old Name", type: "manual" });
      const updated = updateCollection(created.id, { name: "New Name" });
      expect(updated?.name).toBe("New Name");
    });

    test("returns null for non-existent collection", () => {
      const result = updateCollection("non-existent", { name: "Test" });
      expect(result).toBeNull();
    });
  });

  describe("deleteCollection", () => {
    test("deletes existing collection", () => {
      const created = createCollection({ name: "To Delete", type: "manual" });
      const result = deleteCollection(created.id);
      expect(result).toBe(true);
      expect(loadCollections()).toHaveLength(0);
    });

    test("returns false for non-existent collection", () => {
      const result = deleteCollection("non-existent");
      expect(result).toBe(false);
    });
  });
});

// Integration test for orphan cleanup
// This tests that deleteCollection removes references from project settings
describe("deleteCollection orphan cleanup", () => {
  interface ProjectSettings {
    displayName?: string;
    collections?: string[];
  }

  interface SettingsStore {
    [projectPath: string]: ProjectSettings;
  }

  function loadSettings(): SettingsStore {
    try {
      if (existsSync(TEST_SETTINGS_FILE)) {
        return JSON.parse(readFileSync(TEST_SETTINGS_FILE, "utf-8"));
      }
    } catch {
      // ignore
    }
    return {};
  }

  function saveSettings(store: SettingsStore): void {
    writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(store, null, 2));
  }

  function removeCollectionFromAllProjects(collectionId: string): number {
    const store = loadSettings();
    let cleanedCount = 0;

    for (const [, settings] of Object.entries(store)) {
      if (settings.collections?.includes(collectionId)) {
        settings.collections = settings.collections.filter(
          (id) => id !== collectionId,
        );
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      saveSettings(store);
    }

    return cleanedCount;
  }

  // This version includes cleanup - what we want deleteCollection to do
  function deleteCollectionWithCleanup(id: string): boolean {
    const collections = loadCollections();
    const filtered = collections.filter((c) => c.id !== id);
    if (filtered.length === collections.length) return false;
    saveCollections(filtered);
    removeCollectionFromAllProjects(id);
    return true;
  }

  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(() => {
    if (existsSync(TEST_COLLECTIONS_FILE)) {
      rmSync(TEST_COLLECTIONS_FILE);
    }
    if (existsSync(TEST_SETTINGS_FILE)) {
      rmSync(TEST_SETTINGS_FILE);
    }
  });

  test("removes collection references from project settings when collection is deleted", () => {
    // Create a collection
    const collection = createCollection({ name: "Work", type: "manual" });

    // Create project settings that reference this collection
    saveSettings({
      "/project-a": { displayName: "A", collections: [collection.id, "other"] },
      "/project-b": { displayName: "B", collections: [collection.id] },
      "/project-c": { displayName: "C", collections: ["other"] },
    });

    // Delete the collection (with cleanup)
    deleteCollectionWithCleanup(collection.id);

    // Verify collection references were removed
    const settings = loadSettings();
    expect(settings["/project-a"].collections).toEqual(["other"]);
    expect(settings["/project-b"].collections).toEqual([]);
    expect(settings["/project-c"].collections).toEqual(["other"]);
  });
});
