import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyState } from "../models/folder.ts";
import { createFolder, deleteFolder, descendants, folderPath, moveFolder, renameFolder } from "../utils/hierarchy.ts";

function fixture() {
  let state = createFolder(emptyState(), "dev", "Development", null);
  state = createFolder(state, "ides", "IDEs", "dev");
  state = createFolder(state, "other", "Other", null);
  return {
    ...state,
    assignments: [
      { appId: "bundle:editor", folderId: "ides", order: 2 },
      { appId: "bundle:terminal", folderId: "dev", order: 0 },
      { appId: "bundle:missing", folderId: "other", order: 0 },
    ],
  };
}

test("folder mutations preserve the original tree, names, and ordering", () => {
  const original = fixture();
  const renamed = renameFolder(original, "dev", "  Work  ");
  assert.equal(renamed.folders[0].name, "Work");
  assert.equal(original.folders[0].name, "Development");
  assert.equal(original.folders[2].order, 1);
  assert.equal(folderPath(renamed.folders, "ides"), "Appsolutely / Work / IDEs");
  assert.throws(() => renameFolder(original, "dev", "   "));
  assert.throws(() => createFolder(original, "new", "New", "missing"));
  assert.throws(() => createFolder(original, "dev", "Duplicate", null));
});

test("moves reject self, descendant, and missing destinations", () => {
  const state = fixture();
  for (const destination of ["dev", "ides", "missing"]) {
    assert.throws(() => moveFolder(state, "dev", destination));
  }
  const moved = moveFolder(state, "ides", "other");
  assert.equal(moved.folders.find((f) => f.id === "ides")?.parentId, "other");
  assert.equal(moveFolder(moved, "ides", null).folders.find((f) => f.id === "ides")?.parentId, null);
});

test("deleting nested folders returns all contained apps to root, including missing apps", () => {
  const result = deleteFolder(fixture(), "dev");
  assert.deepEqual(
    result.folders.map((f) => f.id),
    ["other"],
  );
  assert.deepEqual(
    result.assignments.map((a) => a.folderId),
    [null, null, "other"],
  );
});

test("deep trees have no recursive stack limit; corrupt cycles cannot hang traversal", () => {
  const folders = Array.from({ length: 10000 }, (_, i) => ({
    id: String(i),
    name: String(i),
    parentId: i === 0 ? null : String(i - 1),
    order: 0,
  }));
  assert.equal(descendants(folders, "0").size, 10000);
  assert.ok(folderPath(folders, "9999").endsWith(" / 9999"));
  folders[0].parentId = "9999";
  assert.equal(descendants(folders, "0").size, 10000);
  assert.ok(folderPath(folders, "9999").startsWith("Appsolutely / "));
});
