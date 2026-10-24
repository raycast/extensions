import { describe, expect, it } from "vitest";
import { parseEnabled, resolveEnabled } from "../prefs-core";
import { Drive } from "../types";

const drives: Drive[] = [
  { path: "/", name: "Macintosh HD", indexed: false, isRoot: true },
  { path: "/Volumes/SSD", name: "SSD", indexed: true, isRoot: false },
  { path: "/Volumes/Backup", name: "Backup", indexed: false, isRoot: false },
];

describe("parseEnabled", () => {
  it("parses a JSON string array", () => {
    expect(parseEnabled('["/","/Volumes/SSD"]')).toEqual(["/", "/Volumes/SSD"]);
  });
  it("returns null for junk or non-string arrays", () => {
    expect(parseEnabled(undefined)).toBeNull();
    expect(parseEnabled("not json")).toBeNull();
    expect(parseEnabled("[1,2,3]")).toBeNull();
    expect(parseEnabled('{"a":1}')).toBeNull();
  });
});

describe("resolveEnabled", () => {
  it("defaults to indexed drives when nothing stored", () => {
    expect([...resolveEnabled(null, drives)]).toEqual(["/Volumes/SSD"]);
  });
  it("defaults to all drives when none are indexed", () => {
    const noIndex = drives.map((d) => ({ ...d, indexed: false }));
    expect([...resolveEnabled(null, noIndex)]).toEqual(["/", "/Volumes/SSD", "/Volumes/Backup"]);
  });
  it("keeps only stored paths that still exist", () => {
    expect([...resolveEnabled(["/Volumes/SSD", "/Volumes/Gone"], drives)]).toEqual(["/Volumes/SSD"]);
  });
  it("falls back to default when stored paths are all stale", () => {
    expect([...resolveEnabled(["/Volumes/Gone"], drives)]).toEqual(["/Volumes/SSD"]);
  });
});
