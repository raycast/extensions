import assert from "node:assert/strict";
import test from "node:test";
import { basename } from "node:path";

import {
  readChromiumBookmarks,
  type ChromiumBookmarksFileSystem,
  type ChromiumBookmarksRoot,
} from "../src/utils/chromiumProfiles.ts";

function fileError(code: string) {
  return Object.assign(new Error(code), { code });
}

function emptyRoot(): ChromiumBookmarksRoot {
  return {
    roots: {
      bookmark_bar: { guid: "bar", name: "Bookmarks Bar", type: "folder", children: [] },
      other: { guid: "other", name: "Other Bookmarks", type: "folder", children: [] },
    },
  };
}

function rootWithBookmark(name: string): ChromiumBookmarksRoot {
  return {
    roots: {
      bookmark_bar: {
        guid: "bar",
        name: "Bookmarks Bar",
        type: "folder",
        children: [{ guid: "bookmark", name, url: "https://example.com", type: "url" }],
      },
      other: { guid: "other", name: "Other Bookmarks", type: "folder", children: [] },
    },
  };
}

function fileSystem(files: Record<string, string | Error>): ChromiumBookmarksFileSystem {
  return {
    readFile: async (path) => {
      const file = files[basename(path)];
      if (file instanceof Error) {
        throw file;
      }
      if (file === undefined) {
        throw fileError("ENOENT");
      }
      return file;
    },
  };
}

test("propagates denied access to AccountBookmarks", async () => {
  await assert.rejects(
    readChromiumBookmarks("/Chrome", "Default", fileSystem({ AccountBookmarks: fileError("EPERM") })),
    { code: "EPERM" },
  );
});

test("propagates denied access to the legacy Bookmarks file", async () => {
  await assert.rejects(
    readChromiumBookmarks(
      "/Chrome",
      "Default",
      fileSystem({ AccountBookmarks: fileError("ENOENT"), Bookmarks: fileError("EACCES") }),
    ),
    { code: "EACCES" },
  );
});

test("returns undefined when both bookmark files are missing", async () => {
  assert.equal(
    await readChromiumBookmarks(
      "/Chrome",
      "Default",
      fileSystem({ AccountBookmarks: fileError("ENOENT"), Bookmarks: fileError("ENOENT") }),
    ),
    undefined,
  );
});

test("falls back to Bookmarks when AccountBookmarks is invalid", async () => {
  const result = await readChromiumBookmarks(
    "/Chrome",
    "Default",
    fileSystem({ AccountBookmarks: "not JSON", Bookmarks: JSON.stringify(rootWithBookmark("Legacy")) }),
  );

  assert.equal(result?.roots.bookmark_bar.children[0]?.name, "Legacy");
});

test("falls back to Bookmarks when AccountBookmarks is empty", async () => {
  const result = await readChromiumBookmarks(
    "/Chrome",
    "Default",
    fileSystem({
      AccountBookmarks: JSON.stringify(emptyRoot()),
      Bookmarks: JSON.stringify(rootWithBookmark("Legacy")),
    }),
  );

  assert.equal(result?.roots.bookmark_bar.children[0]?.name, "Legacy");
});

test("prefers non-empty AccountBookmarks", async () => {
  const result = await readChromiumBookmarks(
    "/Chrome",
    "Default",
    fileSystem({
      AccountBookmarks: JSON.stringify(rootWithBookmark("Account")),
      Bookmarks: JSON.stringify(rootWithBookmark("Legacy")),
    }),
  );

  assert.equal(result?.roots.bookmark_bar.children[0]?.name, "Account");
});
