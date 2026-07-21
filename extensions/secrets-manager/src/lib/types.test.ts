import { describe, it, expect } from "vitest";
import { emptyStore, normalizeStore } from "./types";

describe("emptyStore", () => {
  it("returns a fresh empty store each call", () => {
    const a = emptyStore();
    const b = emptyStore();
    expect(a).toEqual({ version: 1, secrets: [], folders: [], tags: [] });
    a.secrets.push({
      id: "x",
      name: "n",
      value: "v",
      folder: [],
      tags: [],
      createdAt: 0,
      updatedAt: 0,
    });
    expect(b.secrets).toHaveLength(0);
  });
});

describe("normalizeStore", () => {
  it("defaults missing folders/tags (older store migration)", () => {
    const s = normalizeStore({ version: 1, secrets: [] });
    expect(s).toEqual({ version: 1, secrets: [], folders: [], tags: [] });
  });

  it("coerces missing timestamps and validates required secret fields", () => {
    const s = normalizeStore({ secrets: [{ id: "1", name: "n", value: "v" }] });
    expect(s.secrets[0].folder).toEqual([]);
    expect(s.secrets[0].tags).toEqual([]);
    expect(typeof s.secrets[0].createdAt).toBe("number");
  });

  it("rejects structurally invalid input", () => {
    expect(() => normalizeStore(null)).toThrow();
    expect(() => normalizeStore({ secrets: "nope" })).toThrow();
    expect(() => normalizeStore({ secrets: [{ name: "no-id" }] })).toThrow(/id/);
    expect(() => normalizeStore({ secrets: [{ id: "1", name: "n", value: "v", folder: [1, 2] }] })).toThrow();
  });
});
