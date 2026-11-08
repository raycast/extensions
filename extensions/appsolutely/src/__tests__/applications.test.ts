import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assignmentFor,
  moveApplication,
  prepareApplications,
  searchApplications,
} from "../services/application-model.ts";
import { emptyState } from "../models/folder.ts";
import { createFolder } from "../utils/hierarchy.ts";

test("discovery deduplicates normalized paths while preserving distinct copies and case-sensitive paths", () => {
  const apps = prepareApplications([
    { name: "Editor", path: "/Applications/Editor.app/", bundleId: "com.editor" },
    { name: "Editor", path: "/Applications/./Editor.app", bundleId: "com.editor" },
    { name: "Editor", path: "/Users/me/Applications/Editor.app", bundleId: "com.editor" },
    { name: "editor", path: "/Applications/editor.app" },
    { name: "Alpha", path: "/Applications/Alpha.app" },
  ]);
  assert.equal(apps.length, 4);
  assert.equal(apps[0].name, "Alpha");
  assert.equal(new Set(apps.map((a) => a.id)).size, 4);
  assert.equal(apps.filter((a) => a.hasMultipleInstallations).length, 2);
  assert.equal(apps[0].stableId, "path:/Applications/Alpha.app");
});

test("bundle identity retains assignments after rename, removal, and reinstallation at a new path", () => {
  const [app] = prepareApplications([{ name: "Editor", path: "/Applications/Editor.app", bundleId: "com.editor" }]);
  const state = moveApplication(createFolder(emptyState(), "dev", "Development", null), app, "dev");
  const [reinstalled] = prepareApplications([
    { name: "New Editor", path: "/Users/me/New.app", bundleId: "com.editor" },
  ]);
  assert.equal(assignmentFor(reinstalled, state)?.folderId, "dev");
  assert.deepEqual(prepareApplications([]), []);
  const [newApp] = prepareApplications([{ name: "New", path: "/Applications/New.app" }]);
  assert.equal(assignmentFor(newApp, state), undefined);
  assert.throws(() => moveApplication(state, app, "missing"));
});

test("copies of a bundle can be assigned independently, including when a duplicate is installed later", () => {
  const source = { name: "Editor", path: "/Applications/Editor.app", bundleId: "com.editor" };
  const [original] = prepareApplications([source]);
  let state = moveApplication(createFolder(emptyState(), "dev", "Development", null), original, "dev");
  const copies = prepareApplications([source, { ...source, path: "/Users/me/Editor.app" }]);
  assert.equal(assignmentFor(copies[0], state)?.folderId, "dev");
  assert.equal(assignmentFor(copies[1], state), undefined);
  state = moveApplication(state, copies[1], "dev");
  state = moveApplication(state, copies[0], null);
  assert.equal(assignmentFor(copies[0], state)?.folderId, null);
  assert.equal(assignmentFor(copies[1], state)?.folderId, "dev");
  const [remaining] = prepareApplications([{ ...source, path: "/Users/me/Editor.app" }]);
  assert.equal(assignmentFor(remaining, state)?.folderId, "dev");
});

test("search includes nested apps, matches without case sensitivity, and never mutates discovery", () => {
  const apps = prepareApplications([
    { name: "Code", path: "/Applications/Code.app" },
    { name: "Safari", path: "/Applications/Safari.app" },
  ]);
  const state = moveApplication(createFolder(emptyState(), "dev", "Development", null), apps[0], "dev");
  assert.equal(assignmentFor(apps[0], state)?.folderId, "dev");
  assert.deepEqual(
    searchApplications(apps, "  cODE  ").map((a) => a.name),
    ["Code"],
  );
  assert.equal(searchApplications(apps, "").length, 2);
  assert.equal(searchApplications(apps, "missing").length, 0);
});
