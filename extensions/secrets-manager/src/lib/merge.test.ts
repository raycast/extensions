import { describe, it, expect } from "vitest";
import { mergeSecrets, mergeFolders } from "./merge";
import type { Secret } from "./types";

function sec(over: Partial<Secret>): Secret {
  return { id: "id", name: "n", value: "v", folder: [], tags: [], createdAt: 1, updatedAt: 1, ...over };
}

describe("mergeSecrets", () => {
  it("overwrites on folder+name conflict but keeps the existing id", () => {
    const current = [sec({ id: "a", name: "API", folder: ["work"], value: "old" })];
    const incoming = [sec({ id: "zzz", name: "API", folder: ["work"], value: "new" })];
    const merged = mergeSecrets(current, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("a");
    expect(merged[0].value).toBe("new");
  });

  it("regenerates an imported id that collides with a different secret", () => {
    const current = [sec({ id: "dup", name: "One", folder: [] })];
    const incoming = [sec({ id: "dup", name: "Two", folder: [] })];
    const merged = mergeSecrets(current, incoming);
    expect(merged).toHaveLength(2);
    const ids = merged.map((s) => s.id);
    expect(new Set(ids).size).toBe(2); // no duplicate ids
    expect(ids).toContain("dup");
  });

  it("keeps a non-colliding imported id", () => {
    const merged = mergeSecrets([sec({ id: "a", name: "One" })], [sec({ id: "b", name: "Two" })]);
    expect(merged.map((s) => s.id).sort()).toEqual(["a", "b"]);
  });

  it("does not treat a slash in a name/folder as a path separator", () => {
    const current = [sec({ id: "a", name: "b", folder: ["x/y"] })];
    const incoming = [sec({ id: "c", name: "b", folder: ["x", "y"] })];
    const merged = mergeSecrets(current, incoming);
    expect(merged).toHaveLength(2); // distinct folders, not collapsed
  });
});

describe("mergeFolders", () => {
  it("keeps distinct folders that share a slash-joined form", () => {
    const merged = mergeFolders([["a/b"]], [["a", "b"]]);
    expect(merged).toHaveLength(2);
    expect(merged).toContainEqual(["a/b"]);
    expect(merged).toContainEqual(["a", "b"]);
  });

  it("dedupes identical folders", () => {
    const merged = mergeFolders([["work", "dev"]], [["work", "dev"]]);
    expect(merged).toEqual([["work", "dev"]]);
  });
});
