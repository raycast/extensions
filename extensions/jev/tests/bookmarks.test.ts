import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { discoverProfiles, readBookmarks, parseBookmarks, type BookmarkSource } from "../src/lib/bookmarks";
import { dataSchema, initialData } from "../src/lib/model";
import { Store } from "../src/lib/store";
let root: string;
const source: BookmarkSource = { browser: "chrome", profile: "Default", folders: [] };
const tree = {
  roots: {
    bookmark_bar: {
      type: "folder",
      id: "1",
      name: "Bookmarks Bar",
      children: [
        {
          type: "folder",
          id: "2",
          name: "Development",
          children: [
            { type: "url", id: "3", name: "API guide", url: "https://example.com/api" },
            { type: "url", id: "4", name: "Executable", url: "javascript:alert(1)" },
            { type: "url", id: "5", name: "Credential URL", url: "https://user:pass@example.com/" },
          ],
        },
        { type: "url", id: "6", name: "Reference", url: "https://example.org/" },
      ],
    },
  },
};
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "jev-bookmarks-"));
  await fs.mkdir(path.join(root, "Google/Chrome/Default"), { recursive: true });
  await fs.writeFile(path.join(root, "Google/Chrome/Default/Bookmarks"), JSON.stringify(tree));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});
describe("browser bookmark sources", () => {
  it("discovers selectable browsers and profile names without reading unrelated data", async () => {
    await fs.mkdir(path.join(root, "BraveSoftware/Brave-Browser/Profile 1"), { recursive: true });
    await fs.writeFile(
      path.join(root, "Google/Chrome/Local State"),
      JSON.stringify({ profile: { info_cache: { Default: { name: "Personal" } } } }),
    );
    const result = await discoverProfiles(root);
    expect(result.profiles.map((p) => p.name)).toEqual(["Chrome · Personal", "Brave · Profile 1"]);
    expect(result.warnings).toEqual([]);
  });
  it("reads nested folders and safe URLs without changing the browser file", async () => {
    const file = path.join(root, "Google/Chrome/Default/Bookmarks");
    const before = await fs.readFile(file);
    const result = await readBookmarks(source, "Chrome", root);
    expect(result.links).toHaveLength(2);
    expect(result.links[0]!.folder).toBe("Bookmarks Bar / Development");
    expect(result.links[0]!.ancestors).toEqual(["chrome:Default:1", "chrome:Default:2"]);
    expect(await fs.readFile(file)).toEqual(before);
    expect((await readBookmarks(source, "Chrome", root)).links[0]!.id).toBe(result.links[0]!.id);
  });
  it("honors selected folders including descendants and never broadens a deleted folder silently", async () => {
    expect((await readBookmarks({ ...source, folders: ["chrome:Default:2"] }, "Chrome", root)).links).toHaveLength(1);
    await expect(readBookmarks({ ...source, folders: ["chrome:Default:missing"] }, "Chrome", root)).rejects.toThrow(
      "no longer exists",
    );
  });
  it("rereads changes and deletions without maintaining a second library", async () => {
    expect((await readBookmarks(source, "Chrome", root)).links).toHaveLength(2);
    await fs.writeFile(path.join(root, "Google/Chrome/Default/Bookmarks"), JSON.stringify({ roots: {} }));
    expect((await readBookmarks(source, "Chrome", root)).links).toHaveLength(0);
  });
  it("rejects corrupt or unavailable sources and profile traversal", async () => {
    expect(() => parseBookmarks({}, source, "Chrome")).toThrow("could not be read");
    await expect(readBookmarks({ ...source, profile: "../Default" }, "Chrome", root)).rejects.toThrow(
      "Invalid browser profile",
    );
    await expect(readBookmarks({ ...source, profile: "Missing" }, "Chrome", root)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await fs.writeFile(path.join(root, "Google/Chrome/Default/Bookmarks"), "partial JSON");
    await expect(readBookmarks(source, "Chrome", root)).rejects.toThrow();
  });
  it("retains user source choices in backups and defaults older data without losing legacy links", async () => {
    const store = new Store(path.join(root, "jev"));
    await store.update((d) => {
      d.bookmarkSources = [{ ...source, folders: ["chrome:Default:2"] }];
    });
    const backup = JSON.parse(await fs.readFile(await store.exportBackup(root), "utf8"));
    expect(backup.data.bookmarkSources).toEqual([{ ...source, folders: ["chrome:Default:2"] }]);
    const old = {
      ...initialData(),
      bookmarkSources: undefined,
      links: [
        {
          id: "legacy",
          title: "Existing",
          url: "https://example.com/",
          description: "",
          collectionId: "",
          tags: [],
          createdAt: "",
          updatedAt: "",
        },
      ],
    };
    expect(dataSchema.parse(old).bookmarkSources).toEqual([]);
    expect(dataSchema.parse(old).links).toHaveLength(1);
  });
});
