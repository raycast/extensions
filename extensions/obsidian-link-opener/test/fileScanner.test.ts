import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";

const store = new Map<string, string>();

// test/setup.ts mocks these globally; this test needs the real ones
vi.mock("glob", async () => await vi.importActual("glob"));
vi.mock("gray-matter", async () => await vi.importActual("gray-matter"));

vi.mock("@raycast/api", () => ({
  // A plain class so vi.resetAllMocks() between tests doesn't wipe it
  Cache: class {
    get = (key: string) => store.get(key);
    set = (key: string, value: string) => store.set(key, value);
    remove = (key: string) => store.delete(key);
    clear = () => store.clear();
  },
  LocalStorage: { getItem: vi.fn() },
  getPreferenceValues: () => ({ cacheTTL: "5" }),
}));

import { LocalStorage } from "@raycast/api";
import { scanVaultForUrls } from "../src/services/fileScanner";

// Uses the real file system so paths have the platform's native separators
describe("scanVaultForUrls", () => {
  let vaultPath: string;

  beforeEach(async () => {
    store.clear();
    vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "olo-vault-"));
    await fs.mkdir(path.join(vaultPath, ".obsidian"));
    await fs.mkdir(path.join(vaultPath, "projects", "web"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(vaultPath, "projects", "web", "site.md"),
      "---\nhomepage: https://example.com\ngithub: https://github.com/x/y\n---\nBody\n"
    );
    await fs.writeFile(path.join(vaultPath, "plain.md"), "No frontmatter\n");
    vi.mocked(LocalStorage.getItem).mockResolvedValue(vaultPath);
  });

  afterEach(async () => {
    await fs.rm(vaultPath, { recursive: true, force: true });
  });

  it("finds URLs in nested notes", async () => {
    const notes = await scanVaultForUrls(true);

    expect(notes.map((n) => n.urlSource).sort()).toEqual([
      "github",
      "homepage",
    ]);
    expect(notes[0].path).toBe(path.join("projects", "web", "site.md"));
    expect(notes[0].title).toBe("site");
  });

  it("serves the second scan from the cache", async () => {
    const first = await scanVaultForUrls(true);
    const second = await scanVaultForUrls();

    expect(second).toHaveLength(first.length);
    expect(second.map((n) => n.path)).toEqual(first.map((n) => n.path));
  });

  it("re-reads only changed files on incremental scans", async () => {
    await scanVaultForUrls(true);
    // Expire the cache so the scanner does an incremental pass
    for (const [key, value] of store) {
      const entry = JSON.parse(value);
      entry.lastScanTime = 0;
      store.set(key, JSON.stringify(entry));
    }
    await fs.writeFile(
      path.join(vaultPath, "new.md"),
      "---\ndocs: https://docs.example.com\n---\n"
    );

    const notes = await scanVaultForUrls();

    expect(notes.map((n) => n.urlSource).sort()).toEqual([
      "docs",
      "github",
      "homepage",
    ]);
  });
});
