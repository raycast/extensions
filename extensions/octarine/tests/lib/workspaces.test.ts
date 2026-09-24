import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setMockPreferences } from "../__mocks__/@raycast/api";
import { findWorkspaceByName, getWorkspaces } from "@lib/workspaces";

const { scanPaths, readFile } = vi.hoisted(() => ({
  scanPaths: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({ readFile }));

vi.mock("@lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lib/utils")>();

  return {
    ...actual,
    normalizeExtensions(input?: string) {
      return new Set(
        actual
          .splitList(input)
          .map((value) => value.replace(/^\./, "").toLowerCase())
          .filter(Boolean),
      );
    },
    splitLowerList(input?: string) {
      return new Set(actual.splitList(input).map((value) => value.toLowerCase()));
    },
  };
});

vi.mock("@lib/files", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lib/files")>();
  return {
    ...actual,
    scanPaths,
  };
});

beforeEach(() => {
  readFile.mockRejectedValue(new Error("Store unavailable"));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  scanPaths.mockReset();
  readFile.mockReset();
});

function mockStore(workspaces: Record<string, unknown>) {
  readFile.mockResolvedValue(JSON.stringify({ store: { config: { workspaces } } }));
}

describe("findWorkspaceByName", () => {
  const namedWorkspaces = [
    { name: "Work Notes", path: "/tmp/work" },
    { name: "Personal", path: "/tmp/personal" },
  ];

  it("matches workspace names case-insensitively", () => {
    expect(findWorkspaceByName(namedWorkspaces, "work notes")).toEqual(namedWorkspaces[0]);
    expect(findWorkspaceByName(namedWorkspaces, "  WORK   NOTES  ")).toEqual(namedWorkspaces[0]);
    expect(findWorkspaceByName(namedWorkspaces, "Personal")).toEqual(namedWorkspaces[1]);
    expect(findWorkspaceByName(namedWorkspaces, "work")).toEqual(namedWorkspaces[0]);
  });

  it("prefers the Octarine name over another workspace's folder name", () => {
    const workspaces = [
      { name: "Personal", path: "/tmp/Work" },
      { name: "Renamed", path: "/tmp/Personal" },
    ];

    expect(findWorkspaceByName(workspaces, "Personal")).toEqual(workspaces[0]);
  });

  it("returns undefined for empty or unknown names", () => {
    expect(findWorkspaceByName(namedWorkspaces, "")).toBeUndefined();
    expect(findWorkspaceByName(namedWorkspaces, "Missing")).toBeUndefined();
  });
});

describe("getWorkspaces", () => {
  const staleOffsetMs = 24 * 60 * 60 * 1000;
  const validPath = (path: string, ignored = false) => ({ path, ignored, invalid: false });
  const invalidPath = (path: string) => ({ path, ignored: false, invalid: true });

  it("uses registered names by normalized path and sorts by those names", async () => {
    setMockPreferences({ workspaceRoots: "/tmp/renamed", excludedWorkspaces: "", excludedFoldersInWorkspaces: "" });
    scanPaths.mockResolvedValue([validPath("/tmp/renamed/Old"), validPath("/tmp/renamed/Beta")]);
    mockStore({ id: { path: "/tmp/renamed/Old/", name: "Alpha" } });

    expect(await getWorkspaces()).toEqual([
      { name: "Alpha", path: "/tmp/renamed/Old", ignored: false, invalid: false },
      { name: "Beta", path: "/tmp/renamed/Beta", ignored: false, invalid: false },
    ]);
  });

  it("updates registered names even when discovery comes from cache", async () => {
    setMockPreferences({ workspaceRoots: "/tmp/renamed", excludedWorkspaces: "", excludedFoldersInWorkspaces: "" });
    scanPaths.mockResolvedValue([validPath("/tmp/renamed/Old")]);
    mockStore({ id: { path: "/tmp/renamed/Old", name: "First" } });

    expect((await getWorkspaces())[0].name).toBe("First");
    mockStore({ id: { path: "/tmp/renamed/Old", name: "Second" } });
    expect((await getWorkspaces())[0].name).toBe("Second");
    expect(scanPaths).toHaveBeenCalledTimes(1);
  });

  it.each(["Old", "Renamed"])("excludes a renamed workspace by %s", async (excludedWorkspaces) => {
    setMockPreferences({ workspaceRoots: "/tmp/renamed", excludedWorkspaces, excludedFoldersInWorkspaces: "" });
    scanPaths.mockResolvedValue([validPath("/tmp/renamed/Old", excludedWorkspaces === "Old")]);
    mockStore({ id: { path: "/tmp/renamed/Old", name: "Renamed" } });

    expect(await getWorkspaces()).toEqual([
      { name: "Renamed", path: "/tmp/renamed/Old", ignored: true, invalid: false },
    ]);
  });

  it("falls back to folder names when the store is unavailable or malformed", async () => {
    setMockPreferences({ workspaceRoots: "/tmp/renamed", excludedWorkspaces: "", excludedFoldersInWorkspaces: "" });
    scanPaths.mockResolvedValue([validPath("/tmp/renamed/Old")]);

    expect((await getWorkspaces())[0].name).toBe("Old");
    readFile.mockResolvedValue("{");
    expect((await getWorkspaces())[0].name).toBe("Old");
    expect(scanPaths).toHaveBeenCalledTimes(1);
  });

  it("ignores unmatched or invalid registry records", async () => {
    setMockPreferences({ workspaceRoots: "/tmp/renamed", excludedWorkspaces: "", excludedFoldersInWorkspaces: "" });
    scanPaths.mockResolvedValue([validPath("/tmp/renamed/Old")]);
    mockStore({
      other: { path: "/tmp/other", name: "Other" },
      relative: { path: "Old", name: "Wrong" },
      blank: { path: "/tmp/renamed/Old", name: "  " },
    });

    expect(await getWorkspaces()).toEqual([{ name: "Old", path: "/tmp/renamed/Old", ignored: false, invalid: false }]);
  });

  it("maps discovered paths into sorted indexed workspaces", async () => {
    const root = "/tmp/root";
    const nestedRoot = "/tmp/root/nested";
    const invalidRoot = "/tmp/missing";

    setMockPreferences({
      workspaceRoots: `${root}, ${nestedRoot}, ${invalidRoot}`,
      excludedWorkspaces: "skipme",
      excludedFoldersInWorkspaces: "",
    });
    scanPaths.mockResolvedValue([
      validPath("/tmp/root/Beta"),
      validPath("/tmp/other/Alpha"),
      validPath("/tmp/root/Alpha"),
      invalidPath(invalidRoot),
    ]);

    const result = await getWorkspaces();
    const [roots, excludedDirectories] = scanPaths.mock.calls[0];

    expect(result).toEqual([
      { name: "Alpha", path: "/tmp/other/Alpha", ignored: false, invalid: false },
      { name: "Alpha", path: "/tmp/root/Alpha", ignored: false, invalid: false },
      { name: "Beta", path: "/tmp/root/Beta", ignored: false, invalid: false },
      { name: "missing", path: invalidRoot, ignored: false, invalid: true },
    ]);
    expect(roots).toEqual([root, nestedRoot, invalidRoot]);
    expect(excludedDirectories).toEqual(new Set(["skipme"]));
  });

  it("reuses the cache until a refresh is requested", async () => {
    const root = "/tmp/root";

    setMockPreferences({
      workspaceRoots: root,
      excludedWorkspaces: "",
      excludedFoldersInWorkspaces: "",
    });
    scanPaths.mockResolvedValueOnce([validPath("/tmp/root/Alpha")]);

    const initial = await getWorkspaces();
    scanPaths.mockResolvedValueOnce([validPath("/tmp/root/Alpha"), validPath("/tmp/root/Beta")]);

    const cachedResult = await getWorkspaces();
    const refreshed = await getWorkspaces({ refresh: true });

    expect(initial).toEqual([{ name: "Alpha", path: "/tmp/root/Alpha", ignored: false, invalid: false }]);
    expect(cachedResult).toEqual([{ name: "Alpha", path: "/tmp/root/Alpha", ignored: false, invalid: false }]);
    expect(refreshed).toEqual([
      { name: "Alpha", path: "/tmp/root/Alpha", ignored: false, invalid: false },
      { name: "Beta", path: "/tmp/root/Beta", ignored: false, invalid: false },
    ]);
    expect(scanPaths).toHaveBeenCalledTimes(2);
  });

  it("ignores cached workspaces when workspaceRoots changes", async () => {
    const firstRoot = "/tmp/first-root";
    const secondRoot = "/tmp/second-root";

    setMockPreferences({
      workspaceRoots: firstRoot,
      excludedWorkspaces: "",
      excludedFoldersInWorkspaces: "",
    });
    scanPaths.mockResolvedValueOnce([validPath("/tmp/first-root/Alpha")]);

    const initial = await getWorkspaces();

    setMockPreferences({
      workspaceRoots: secondRoot,
      excludedWorkspaces: "",
      excludedFoldersInWorkspaces: "",
    });
    scanPaths.mockResolvedValueOnce([validPath("/tmp/second-root/Beta")]);

    const changedRoots = await getWorkspaces();

    expect(initial).toEqual([{ name: "Alpha", path: "/tmp/first-root/Alpha", ignored: false, invalid: false }]);
    expect(changedRoots).toEqual([{ name: "Beta", path: "/tmp/second-root/Beta", ignored: false, invalid: false }]);
  });

  it("ignores cached workspaces when excludedWorkspaces changes", async () => {
    const root = "/tmp/root";
    const skipped = "/tmp/root/SkipMe";

    setMockPreferences({
      workspaceRoots: root,
      excludedWorkspaces: "",
      excludedFoldersInWorkspaces: "",
    });
    scanPaths.mockResolvedValueOnce([validPath(skipped)]);

    const initial = await getWorkspaces();

    setMockPreferences({
      workspaceRoots: root,
      excludedWorkspaces: "skipme",
      excludedFoldersInWorkspaces: "",
    });
    scanPaths.mockResolvedValueOnce([validPath(skipped, true)]);

    const changedExcludedWorkspaces = await getWorkspaces();

    expect(initial).toEqual([{ name: "SkipMe", path: skipped, ignored: false, invalid: false }]);
    expect(changedExcludedWorkspaces).toEqual([{ name: "SkipMe", path: skipped, ignored: true, invalid: false }]);
    expect(scanPaths).toHaveBeenCalledTimes(2);
  });

  it("rescans when the workspace cache is stale", async () => {
    const now = new Date("2026-03-31T10:00:00.000Z").valueOf();
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(now);
    const root = "/tmp/root";

    setMockPreferences({
      workspaceRoots: root,
      excludedWorkspaces: "",
      excludedFoldersInWorkspaces: "",
    });
    scanPaths.mockResolvedValueOnce([validPath("/tmp/root/Alpha")]);

    const initial = await getWorkspaces();
    scanPaths.mockResolvedValueOnce([validPath("/tmp/root/Alpha"), validPath("/tmp/root/Beta")]);
    nowSpy.mockReturnValue(now + staleOffsetMs);

    const stale = await getWorkspaces();

    expect(initial).toEqual([{ name: "Alpha", path: "/tmp/root/Alpha", ignored: false, invalid: false }]);
    expect(stale).toEqual([
      { name: "Alpha", path: "/tmp/root/Alpha", ignored: false, invalid: false },
      { name: "Beta", path: "/tmp/root/Beta", ignored: false, invalid: false },
    ]);
  });
});
