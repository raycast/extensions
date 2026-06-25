import { describe, expect, it } from "vitest";
import { isAutoSavePath, walkRoot } from "../scan";
import { Drive } from "../types";

const root: Drive = { path: "/", name: "Macintosh HD", indexed: false, isRoot: true };
const external: Drive = { path: "/Volumes/SSD", name: "SSD", indexed: false, isRoot: false };

describe("walkRoot", () => {
  it("walks home for the root volume to stay fast", () => {
    expect(walkRoot(root, "/Users/me")).toBe("/Users/me");
  });
  it("walks the whole volume for external drives", () => {
    expect(walkRoot(external, "/Users/me")).toBe("/Volumes/SSD");
  });
});

describe("isAutoSavePath", () => {
  it("flags Premiere and After Effects auto-save folders", () => {
    expect(isAutoSavePath("/V/Proj/Adobe Premiere Pro Auto-Save/clip-2026.prproj")).toBe(true);
    expect(isAutoSavePath("/V/Proj/Adobe After Effects Auto-Save/comp.aep")).toBe(true);
    expect(isAutoSavePath("/V/Proj/AutoSave/x.psd")).toBe(true);
  });
  it("leaves normal project paths alone", () => {
    expect(isAutoSavePath("/V/Clients/Acme/final.prproj")).toBe(false);
    expect(isAutoSavePath("/V/autosaved-notes/file.psd")).toBe(false);
  });
});
