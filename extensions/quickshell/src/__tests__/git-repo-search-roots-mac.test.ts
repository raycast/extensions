import { afterEach, describe, expect, it } from "vitest";
import { listDefaultRootCandidates, searchRootsFromWorkspaces } from "../lib/git-repo-search-roots";

describe("git-repo-search-roots macOS", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
  });

  it("builds POSIX profile roots without drive letters on darwin", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
    const candidates = listDefaultRootCandidates({
      home: "/Users/dev",
      pathStyle: "posix",
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        "/Users/dev/Projects",
        "/Users/dev/Developer",
        "/Users/dev/Documents",
        "/Users/dev/Documents/GitHub",
        "/Users/dev/Code",
        "/Users/dev/Sites",
        "/Users/dev/GitHub",
        "/Users/dev/Library/Developer",
        "/Users/dev/Documents/Projects",
        "/Users/dev/Desktop/Projects",
        "/Users/dev/Desktop/Developer",
      ]),
    );
    expect(candidates.some((candidate) => /^[a-zA-Z]:\\/.test(candidate))).toBe(false);
    expect(candidates).not.toContain("/Users/dev");
  });

  it("derives workspace parent roots with POSIX paths", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
    const roots = searchRootsFromWorkspaces(["/Users/dev/Projects/QuickShell"], { pathStyle: "posix" });
    expect(roots).toEqual(expect.arrayContaining(["/Users/dev/Projects/QuickShell", "/Users/dev/Projects"]));
    expect(roots).not.toContain("/");
  });
});
