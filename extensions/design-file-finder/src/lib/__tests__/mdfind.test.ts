import { describe, expect, it } from "vitest";
import { buildMdfindArgs, buildMdfindQuery, parseMdfindOutput } from "../mdfind";

describe("buildMdfindQuery", () => {
  it("ORs a case/diacritic-insensitive filename match per extension", () => {
    expect(buildMdfindQuery(["psd", "ai"])).toBe('kMDItemFSName == "*.psd"cd || kMDItemFSName == "*.ai"cd');
  });
});

describe("buildMdfindArgs", () => {
  it("scopes to the volume with -onlyin", () => {
    expect(buildMdfindArgs("/Volumes/SSD", ["psd"])).toEqual(["-onlyin", "/Volumes/SSD", 'kMDItemFSName == "*.psd"cd']);
  });
});

describe("parseMdfindOutput", () => {
  it("splits lines and trims blanks", () => {
    expect(parseMdfindOutput("/a/x.psd\n/b/y.ai\n\n")).toEqual(["/a/x.psd", "/b/y.ai"]);
  });
  it("returns empty for empty output", () => {
    expect(parseMdfindOutput("")).toEqual([]);
    expect(parseMdfindOutput("\n\n")).toEqual([]);
  });
});
