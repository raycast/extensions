import { describe, expect, it } from "vitest";
import { recencyMs, sortRecords } from "../recency";
import { FileRecord } from "../types";

function rec(partial: Partial<FileRecord>): FileRecord {
  return {
    path: "/x/file.psd",
    name: "file.psd",
    ext: "psd",
    app: "photoshop",
    folder: "/x",
    volume: "/",
    modifiedMs: 0,
    lastUsedMs: null,
    sizeBytes: null,
    ...partial,
  };
}

describe("recencyMs", () => {
  it("uses the more recent of modified and lastUsed", () => {
    expect(recencyMs(rec({ modifiedMs: 100, lastUsedMs: 200 }))).toBe(200);
    expect(recencyMs(rec({ modifiedMs: 300, lastUsedMs: 200 }))).toBe(300);
    expect(recencyMs(rec({ modifiedMs: 300, lastUsedMs: null }))).toBe(300);
  });
});

describe("sortRecords", () => {
  const a = rec({ name: "alpha.psd", folder: "/b", ext: "psd", modifiedMs: 100 });
  const b = rec({ name: "beta.ai", folder: "/a", ext: "ai", modifiedMs: 300 });
  const c = rec({ name: "gamma.aep", folder: "/c", ext: "aep", modifiedMs: 200 });

  it("recent: newest first", () => {
    expect(sortRecords([a, b, c], "recent").map((r) => r.name)).toEqual(["beta.ai", "gamma.aep", "alpha.psd"]);
  });
  it("lastUsed overrides modified for recent", () => {
    const old = rec({ name: "old.psd", modifiedMs: 1, lastUsedMs: 999 });
    expect(sortRecords([b, old], "recent")[0].name).toBe("old.psd");
  });
  it("name: alphabetical, case-insensitive", () => {
    expect(sortRecords([b, a, c], "name").map((r) => r.name)).toEqual(["alpha.psd", "beta.ai", "gamma.aep"]);
  });
  it("folder: groups by folder", () => {
    expect(sortRecords([a, b, c], "folder").map((r) => r.folder)).toEqual(["/a", "/b", "/c"]);
  });
  it("type: groups by extension", () => {
    expect(sortRecords([a, b, c], "type").map((r) => r.ext)).toEqual(["aep", "ai", "psd"]);
  });
  it("does not mutate the input", () => {
    const input = [a, b, c];
    sortRecords(input, "name");
    expect(input.map((r) => r.name)).toEqual(["alpha.psd", "beta.ai", "gamma.aep"]);
  });
});
