import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getDialogNavigationPaths } from "../src/lib/dialog-navigation.ts";

test("file results provide full path for selection and parent fallback", () => {
  assert.deepEqual(getDialogNavigationPaths("/Users/test/Projects/report.pdf"), {
    containingFolder: "/Users/test/Projects",
    selectedPath: "/Users/test/Projects/report.pdf",
  });
});

test("folder results can paste the exact selected folder path", () => {
  assert.deepEqual(getDialogNavigationPaths("/Users/test/Downloads"), {
    containingFolder: "/Users/test",
    selectedPath: "/Users/test/Downloads",
  });
});

test("Chinese, spaces and embedded newlines are transferred without shell quoting", () => {
  const original = "/Users/test/中文 文件夹/季度\n报告.pdf";
  assert.equal(getDialogNavigationPaths(original).containingFolder, "/Users/test/中文 文件夹");
  assert.equal(getDialogNavigationPaths(original).selectedPath, original);
});

test("invalid relative and NUL paths are rejected", () => {
  assert.throws(() => getDialogNavigationPaths("../relative.txt"));
  assert.throws(() => getDialogNavigationPaths("/safe/unsafe\0name"));
});

test("assisted dialog command uses Action.Paste and no UI automation or fd scan", async () => {
  const dialogCommand = await readFile(new URL("../src/dialog-search.tsx", import.meta.url), "utf8");
  const searchView = await readFile(new URL("../src/search-files.tsx", import.meta.url), "utf8");
  assert.match(dialogCommand, /<SearchFilesView dialogMode/);
  assert.match(searchView, /<Action\.Paste/);
  assert.match(searchView, /Assisted Open\/Save Navigation/);
  assert.doesNotMatch(dialogCommand, /\bspawn\s*\(|\brebuildIndex\s*\(|\bosascript\b/);
  assert.doesNotMatch(searchView, /\bspawn\s*\(|\brebuildIndex\s*\(|\bosascript\b/);
});

test("dialog primary paste is exact selection; fallback paste uses parent folder", async () => {
  const view = await readFile(new URL("../src/search-files.tsx", import.meta.url), "utf8");
  const exact = view.indexOf("getDialogNavigationPaths(filepath).selectedPath");
  const parent = view.indexOf("getDialogNavigationPaths(filepath).containingFolder");
  assert.ok(exact >= 0 && parent >= 0 && exact < parent);
  assert.match(view, /Select File or Go to Folder/);
});
