import { describe, expect, it } from "vitest";
import { foldersToRoots, ownerDrive } from "../roots";
import { Drive } from "../types";

const drives: Drive[] = [
  { path: "/", name: "Macintosh HD", indexed: false, isRoot: true },
  { path: "/Volumes/SSD", name: "SSD", indexed: true, isRoot: false },
];

describe("ownerDrive", () => {
  it("picks the longest matching mount prefix", () => {
    expect(ownerDrive("/Volumes/SSD/Work/proj", drives)?.name).toBe("SSD");
    expect(ownerDrive("/Users/me/Work", drives)?.name).toBe("Macintosh HD");
  });
  it("does not match a sibling that shares a name prefix", () => {
    const d: Drive[] = [{ path: "/Volumes/SS", name: "SS", indexed: false, isRoot: false }];
    expect(ownerDrive("/Volumes/SSD/x", d)).toBeUndefined();
  });
});

describe("foldersToRoots", () => {
  it("inherits the owning drive's indexed status and forces a walk", () => {
    expect(foldersToRoots(["/Volumes/SSD/Work", "/Users/me/Clients"], drives)).toEqual([
      { path: "/Volumes/SSD/Work", indexed: true, walk: true, isRoot: false },
      { path: "/Users/me/Clients", indexed: false, walk: true, isRoot: false },
    ]);
  });
  it("defaults to non-indexed when no drive matches", () => {
    expect(foldersToRoots(["/nowhere"], [])).toEqual([{ path: "/nowhere", indexed: false, walk: true, isRoot: false }]);
  });
});
