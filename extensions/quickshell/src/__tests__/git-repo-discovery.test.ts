import { describe, expect, it } from "vitest";
import { buildSearchRoots, listDefaultRootCandidates, searchRootsFromWorkspaces } from "../lib/git-repo-search-roots";

/** Windows-path contracts must not depend on the host OS (macOS CI uses darwin). */
const win32Roots = { pathStyle: "win32" as const };

describe("searchRootsFromWorkspaces", () => {
  it("includes each workspace directory and its parent, skipping drive-root parents", () => {
    const roots = searchRootsFromWorkspaces(
      ["D:\\Dev\\QuickShell", "D:\\Dev\\Trackdub", "C:\\Users\\tonyt\\source\\repos\\demo"],
      win32Roots,
    );

    expect(roots.map((root) => root.toLowerCase())).toEqual(
      expect.arrayContaining([
        "d:\\dev\\quickshell",
        "d:\\dev",
        "d:\\dev\\trackdub",
        "c:\\users\\tonyt\\source\\repos\\demo",
        "c:\\users\\tonyt\\source\\repos",
      ]),
    );
    expect(roots.map((root) => root.toLowerCase())).not.toContain("d:\\");
  });

  it("dedupes case-insensitively", () => {
    const roots = searchRootsFromWorkspaces(["D:\\Dev\\QuickShell", "d:\\dev\\QuickShell"], win32Roots);
    const lower = roots.map((root) => root.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });
});

describe("listDefaultRootCandidates", () => {
  it("adds common folders under profile and every drive, plus non-system drive roots", () => {
    const candidates = listDefaultRootCandidates({
      ...win32Roots,
      home: "C:\\Users\\tonyt",
      drives: ["C:\\", "D:\\"],
      systemRoot: "C:\\",
    });

    const lower = candidates.map((candidate) => candidate.toLowerCase());
    expect(lower).toEqual(
      expect.arrayContaining([
        "c:\\users\\tonyt\\projects",
        "c:\\users\\tonyt\\development",
        "c:\\users\\tonyt\\documents",
        "c:\\users\\tonyt\\documents\\github",
        "c:\\projects",
        "c:\\dev",
        "d:\\dev",
        "d:\\projects",
        "d:\\",
      ]),
    );
    expect(lower).not.toContain("c:\\users\\tonyt");
    expect(lower).not.toContain("c:\\");
  });

  it("resolves profile nested roots from the real username home, not a literal YourName", () => {
    const candidates = listDefaultRootCandidates({
      ...win32Roots,
      home: "C:\\Users\\actual.user",
      drives: ["C:\\"],
      systemRoot: "C:\\",
    });

    expect(candidates.map((candidate) => candidate.toLowerCase())).toContain(
      "c:\\users\\actual.user\\documents\\github",
    );
    expect(candidates.join("\n").toLowerCase()).not.toContain("yourname");
  });
});

describe("buildSearchRoots", () => {
  it("puts extra roots first, includes defaults, and never adds the home profile root", () => {
    const exists = new Set(["d:\\dev", "c:\\users\\tonyt\\projects", "c:\\users\\tonyt", "d:\\"]);

    const roots = buildSearchRoots(["D:\\Dev"], {
      ...win32Roots,
      home: "C:\\Users\\tonyt",
      defaultRootCandidates: listDefaultRootCandidates({
        ...win32Roots,
        home: "C:\\Users\\tonyt",
        drives: ["C:\\", "D:\\"],
        systemRoot: "C:\\",
      }),
      exists: (candidate) => exists.has(candidate.toLowerCase()),
    });

    expect(roots[0].toLowerCase()).toBe("d:\\dev");
    expect(roots.map((root) => root.toLowerCase())).toContain("d:\\");
    expect(roots.map((root) => root.toLowerCase())).toContain("c:\\users\\tonyt\\projects");
    expect(roots.map((root) => root.toLowerCase())).not.toContain("c:\\users\\tonyt");
  });
});
