import { afterEach, describe, expect, it, vi } from "vitest";
import { closeDatabases, loadDatabases, resetSqlModuleCache } from "./databaseLoader";

describe("loadDatabases", () => {
  afterEach(() => {
    resetSqlModuleCache();
  });

  it("returns a fatal issue when the wasm asset is missing", async () => {
    const result = await loadDatabases([{ spaceID: "space-1", path: "/tmp/space-1.sqlite" }], "/tmp/assets", {
      fileExists: () => false,
    });

    expect(result).toEqual({
      databases: [],
      issues: [
        {
          code: "missing-wasm",
          message: "Craft search assets are missing.",
          path: "/tmp/assets/sql-wasm-fts5.wasm",
        },
      ],
      fatalIssue: {
        code: "missing-wasm",
        message: "Craft search assets are missing.",
        path: "/tmp/assets/sql-wasm-fts5.wasm",
      },
    });
  });

  it("keeps healthy spaces when one sqlite file is missing", async () => {
    const initSqlModule = vi.fn(async () => ({
      Database: class FakeDatabase {
        constructor(public readonly payload: Uint8Array) {}
      },
    }));

    const result = await loadDatabases(
      [
        { spaceID: "space-1", path: "/tmp/space-1.sqlite" },
        { spaceID: "space-2", path: "/tmp/space-2.sqlite" },
      ],
      "/tmp/assets",
      {
        fileExists: (targetPath) => ["/tmp/assets/sql-wasm-fts5.wasm", "/tmp/space-1.sqlite"].includes(targetPath),
        readBinaryFile: () => new Uint8Array([1, 2, 3]),
        initSqlModule,
      },
    );

    expect(result.databases).toHaveLength(1);
    expect(result.databases[0].spaceID).toBe("space-1");
    expect(result.issues).toEqual([
      {
        code: "missing-sqlite",
        message: "A Craft search database is missing.",
        path: "/tmp/space-2.sqlite",
        spaceID: "space-2",
      },
    ]);
    expect(result.fatalIssue).toBeNull();
  });

  it("returns a fatal issue when all sqlite files fail to load", async () => {
    const initSqlModule = vi.fn(async () => ({
      Database: class FakeDatabase {
        constructor() {
          throw new Error("boom");
        }
      },
    }));

    const result = await loadDatabases([{ spaceID: "space-1", path: "/tmp/space-1.sqlite" }], "/tmp/assets", {
      fileExists: () => true,
      readBinaryFile: () => new Uint8Array([1, 2, 3]),
      initSqlModule,
    });

    expect(result.databases).toEqual([]);
    expect(result.issues).toHaveLength(1);
    expect(result.fatalIssue).toEqual(result.issues[0]);
    expect(result.issues[0].code).toBe("load-failed");
  });

  it("closes all open databases even if one close call fails", () => {
    const closeOk = vi.fn();
    const closeFail = vi.fn(() => {
      throw new Error("boom");
    });

    expect(() =>
      closeDatabases([
        { spaceID: "space-1", database: { close: closeOk } as never },
        { spaceID: "space-2", database: { close: closeFail } as never },
      ]),
    ).not.toThrow();
    expect(closeOk).toHaveBeenCalledOnce();
    expect(closeFail).toHaveBeenCalledOnce();
  });
});
