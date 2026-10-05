import { describe, expect, it } from "vitest";
import { dedupe } from "../merge";
import { FileRecord } from "../types";

function rec(path: string, modifiedMs = 0): FileRecord {
  return {
    path,
    name: path.slice(path.lastIndexOf("/") + 1),
    ext: "psd",
    app: "photoshop",
    folder: path.slice(0, path.lastIndexOf("/")),
    volume: "/",
    modifiedMs,
    lastUsedMs: null,
    sizeBytes: null,
  };
}

describe("dedupe", () => {
  it("keeps the first record per path", () => {
    const out = dedupe([rec("/a.psd", 1), rec("/b.psd", 2), rec("/a.psd", 3)]);
    expect(out.map((r) => r.path)).toEqual(["/a.psd", "/b.psd"]);
    expect(out[0].modifiedMs).toBe(1);
  });
  it("handles empty input", () => {
    expect(dedupe([])).toEqual([]);
  });
});
