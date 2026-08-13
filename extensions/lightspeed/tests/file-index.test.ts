import { mkdir, mkdtemp, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileIndex } from "../src/file-index";

describe("FileIndex", () => {
  it("builds and persists its own searchable filesystem snapshot", async () => {
    const fixture = await mkdtemp(join(tmpdir(), "lightspeed-fixture-"));
    const support = await mkdtemp(join(tmpdir(), "lightspeed-support-"));
    await mkdir(join(fixture, "Documents"));
    await writeFile(join(fixture, "Documents", "instant-search.txt"), "lightspeed");

    const index = new FileIndex(fixture, "", support);
    await index.rebuild();

    expect(index.status.phase).toBe("ready");
    expect(index.search("instant", "all", 10).map((entry) => entry.name)).toContain("instant-search.txt");
    expect(index.search("ext:txt path:documents", "files", 10)[0]?.name).toBe("instant-search.txt");

    const watchedFile = join(fixture, "live-update.md");
    await writeFile(watchedFile, "new");
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_200));
    expect(index.search("live-update", "all", 10)[0]?.name).toBe("live-update.md");

    await unlink(watchedFile);
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_200));
    expect(index.search("live-update", "all", 10)).toEqual([]);
  });
});
