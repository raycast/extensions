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

const TEST_DIR = join(tmpdir(), "project-opener-test-sources");
const TEST_SOURCES_FILE = join(TEST_DIR, "sources.json");

import type { SourceDirectory } from "../types";

function loadSources(): SourceDirectory[] {
  try {
    if (existsSync(TEST_SOURCES_FILE)) {
      const data = readFileSync(TEST_SOURCES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    return [];
  }
  return [];
}

function saveSources(sources: SourceDirectory[]): void {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
  writeFileSync(TEST_SOURCES_FILE, JSON.stringify(sources, null, 2));
}

function addSource(source: Omit<SourceDirectory, "id">): SourceDirectory {
  const id = `src_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newSource: SourceDirectory = { ...source, id };
  const sources = loadSources();
  sources.push(newSource);
  saveSources(sources);
  return newSource;
}

function updateSource(
  id: string,
  updates: Partial<Omit<SourceDirectory, "id">>,
): SourceDirectory | null {
  const sources = loadSources();
  const index = sources.findIndex((s) => s.id === id);
  if (index === -1) return null;
  sources[index] = { ...sources[index], ...updates };
  saveSources(sources);
  return sources[index];
}

function deleteSource(id: string): boolean {
  const sources = loadSources();
  const filtered = sources.filter((s) => s.id !== id);
  if (filtered.length === sources.length) return false;
  saveSources(filtered);
  return true;
}

describe("sources storage", () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(() => {
    if (existsSync(TEST_SOURCES_FILE)) {
      rmSync(TEST_SOURCES_FILE);
    }
  });

  describe("loadSources", () => {
    test("returns empty array when no file exists", () => {
      expect(loadSources()).toEqual([]);
    });

    test("loads sources from file", () => {
      const testSources: SourceDirectory[] = [
        { id: "src-1", path: "~/projects", depth: 2 },
      ];
      writeFileSync(TEST_SOURCES_FILE, JSON.stringify(testSources));
      expect(loadSources()).toHaveLength(1);
    });
  });

  describe("addSource", () => {
    test("creates source with generated id", () => {
      const source = addSource({ path: "~/work", depth: 1 });
      expect(source.id).toMatch(/^src_/);
      expect(source.path).toBe("~/work");
    });

    test("includes optional properties", () => {
      const source = addSource({
        path: "~/clients",
        depth: 2,
        defaultCollection: "clients",
      });
      expect(source.defaultCollection).toBe("clients");
    });
  });

  describe("updateSource", () => {
    test("updates existing source", () => {
      const created = addSource({ path: "~/old", depth: 1 });
      const updated = updateSource(created.id, { depth: 3 });
      expect(updated?.depth).toBe(3);
    });

    test("returns null for non-existent source", () => {
      expect(updateSource("fake", { depth: 2 })).toBeNull();
    });
  });

  describe("deleteSource", () => {
    test("deletes existing source", () => {
      const created = addSource({ path: "~/temp", depth: 1 });
      expect(deleteSource(created.id)).toBe(true);
      expect(loadSources()).toHaveLength(0);
    });

    test("returns false for non-existent source", () => {
      expect(deleteSource("fake")).toBe(false);
    });
  });
});
