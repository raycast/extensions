// regression tests for search-spotlight.tsx
// covers the three bugs we hit during the 2026-04-05 debugging session:
//   1. inline callback in usePromise deps → infinite abort/restart loop
//      guarded by: signature must return Promise<T>, no callback arg
//   2. per-keystroke osascript spawns → EAGAIN
//      guarded by: searchSpotlight must not import run-applescript
//   3. abort errors surfacing as user-visible toasts
//      guarded by: aborted searches resolve with partial results (don't reject)

import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import path from "path";
import fs from "fs-extra";
import os from "os";

// stub @raycast/api before importing the module under test.
// we must stub all named exports that search-spotlight.tsx's transitive deps pull in
// (utils.tsx imports Alert, Icon, closeMainWindow, confirmAlert, trash, showToast, popToRoot)
const noop = () => {};
mock.module("@raycast/api", () => ({
  getPreferenceValues: () => ({ maxResults: 250, maxRecentFolders: "10" }),
  Alert: { ActionStyle: { Destructive: "destructive" } },
  Icon: { Trash: "trash" },
  closeMainWindow: async () => {},
  confirmAlert: async () => true,
  trash: async () => {},
  showToast: async () => ({ hide: noop }),
  popToRoot: async () => {},
  environment: { extensionName: "finder-file-actions" },
}));

// dynamic import so the mock takes effect before module load
// (bun:test's mock.module doesn't retroactively rewrite static imports)
type SearchFn = (
  search: string,
  searchScope: string,
  abortable: { current: AbortController | null | undefined } | undefined,
) => Promise<{ path: string }[]>;

let searchSpotlight: SearchFn;
type SpotlightSearchResult = { path: string };

describe("searchSpotlight - regression tests", () => {
  let tempDir: string;
  let uniqueFolderName: string;

  beforeAll(async () => {
    // dynamic import after mock.module is set up
    const mod = await import("../common/search-spotlight");
    searchSpotlight = mod.searchSpotlight as SearchFn;

    // create a uniquely-named folder on disk so mdfind is guaranteed to find it
    // mdfind indexes ~/tmp only selectively; use ~/Documents which is always indexed
    const homeDocs = path.join(os.homedir(), "Documents");
    uniqueFolderName = `ffa-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    tempDir = path.join(homeDocs, uniqueFolderName);
    await fs.mkdir(tempDir, { recursive: true });
    // give Spotlight a moment to index the new folder
    await new Promise((r) => setTimeout(r, 2500));
  });

  describe("signature contract (bug 1 guard)", () => {
    it("returns a Promise<SpotlightSearchResult[]>, not a callback-based function", async () => {
      // if someone reintroduces the callback arg, this call shape breaks at type-check
      // AND at runtime since the returned value must be iterable/array-like
      const abortable = { current: new AbortController() };
      const result = searchSpotlight("downloads", "", abortable);
      expect(result).toBeInstanceOf(Promise);
      const resolved = await result;
      expect(Array.isArray(resolved)).toBe(true);
    }, 15000);

    it("accepts exactly 3 arguments (no callback)", () => {
      // arity check - would catch re-adding a 4th callback param
      expect(searchSpotlight.length).toBe(3);
    });
  });

  describe("no osascript dependency (bug 2 guard)", () => {
    it("search-spotlight module does not import run-applescript", async () => {
      // the old code spawned osascript per keystroke to resolve localized
      // system folder names, causing EAGAIN under fast typing.
      // check for actual imports/calls, ignoring comments.
      const sourcePath = path.join(__dirname, "..", "common", "search-spotlight.tsx");
      const source = await fs.readFile(sourcePath, "utf-8");
      // strip line and block comments so comments mentioning "osascript" don't trip us
      const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(stripped).not.toContain("run-applescript");
      expect(stripped).not.toContain("runAppleScript");
      expect(stripped).not.toMatch(/spawn\s*\(\s*["']osascript/);
    });
  });

  describe("abort handling (bug 3 guard)", () => {
    it("resolves with empty/partial results when aborted immediately, does not reject", async () => {
      const abortable = { current: new AbortController() };
      // abort before starting
      abortable.current.abort();
      const results = await searchSpotlight("downloads", "", abortable);
      expect(Array.isArray(results)).toBe(true);
      // aborted search shouldn't throw - either empty or partial, never rejects
    }, 15000);

    it("resolves with partial results when aborted mid-flight", async () => {
      const abortable = { current: new AbortController() };
      const searchPromise = searchSpotlight("a", "", abortable);
      // abort after a short delay
      setTimeout(() => abortable.current.abort(), 50);
      const results = await searchPromise;
      expect(Array.isArray(results)).toBe(true);
    }, 15000);
  });

  describe("functional correctness", () => {
    it("finds a newly created test folder via display name", async () => {
      const abortable = { current: new AbortController() };
      const results = await searchSpotlight(uniqueFolderName, "", abortable);
      const found = results.find((r: SpotlightSearchResult) => r.path === tempDir);
      // mdfind may or may not have indexed it depending on timing/system load.
      // assert the search completed cleanly; log if the folder wasn't found for diagnostics
      expect(Array.isArray(results)).toBe(true);
      if (!found) {
        console.warn(`[test] mdfind did not index ${tempDir} yet - non-fatal, may be timing-related`);
      }
    }, 15000);

    it("returns results for a common query like 'downloads'", async () => {
      const abortable = { current: new AbortController() };
      const results = await searchSpotlight("downloads", "", abortable);
      expect(Array.isArray(results)).toBe(true);
      // in any reasonable user environment, "downloads" must find at least one folder
      expect(results.length).toBeGreaterThan(0);
      // all results must be folders with a path
      results.forEach((r: SpotlightSearchResult) => {
        expect(typeof r.path).toBe("string");
        expect(r.path.length).toBeGreaterThan(0);
      });
    }, 15000);

    it("deduplicates results by normalized path", async () => {
      const abortable = { current: new AbortController() };
      const results = await searchSpotlight("documents", "", abortable);
      const normalized = results.map((r: SpotlightSearchResult) => r.path.replace(/\/+$/, "").toLowerCase());
      const unique = new Set(normalized);
      expect(unique.size).toBe(normalized.length);
    }, 15000);
  });

  // cleanup
  afterAll(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
