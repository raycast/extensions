import { describe, expect, it } from "vitest";
import { detectRepositoryKind, type DirEntryInfo } from "../../src/filesystem/git-markers";

function entry(name: string, kind: "dir" | "file"): DirEntryInfo {
  return { name, isDirectory: kind === "dir", isFile: kind === "file" };
}

describe("detectRepositoryKind", () => {
  it("detects a normal repository from a .git directory", () => {
    expect(detectRepositoryKind([entry(".git", "dir"), entry("src", "dir")], true)).toBe("normal");
  });

  it("detects a linked worktree from a .git file", () => {
    expect(detectRepositoryKind([entry(".git", "file")], true)).toBe("worktree");
  });

  it("detects a bare repository from HEAD/objects/refs", () => {
    const entries = [entry("HEAD", "file"), entry("objects", "dir"), entry("refs", "dir")];
    expect(detectRepositoryKind(entries, true)).toBe("bare");
  });

  it("does not detect bare repos when disabled", () => {
    const entries = [entry("HEAD", "file"), entry("objects", "dir"), entry("refs", "dir")];
    expect(detectRepositoryKind(entries, false)).toBeNull();
  });

  it("prefers a .git directory over bare markers", () => {
    const entries = [entry(".git", "dir"), entry("HEAD", "file"), entry("objects", "dir"), entry("refs", "dir")];
    expect(detectRepositoryKind(entries, true)).toBe("normal");
  });

  it("returns null for an ordinary directory", () => {
    expect(detectRepositoryKind([entry("src", "dir"), entry("README.md", "file")], true)).toBeNull();
  });

  it("returns null when only some bare markers are present", () => {
    expect(detectRepositoryKind([entry("HEAD", "file"), entry("objects", "dir")], true)).toBeNull();
  });
});
