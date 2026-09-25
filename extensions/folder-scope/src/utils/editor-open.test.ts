import assert from "node:assert/strict";
import { test } from "node:test";
import type { EditorType } from "../types/preferences.ts";
import { EDITOR_BUNDLE_IDS, EDITOR_TITLES, editorLaunch } from "./editor-open.ts";

const TARGET = { filePath: "/Users/dev/src/file.ts", line: 12, column: 3 };

test("url editors produce scheme://file/<path>:line:column", () => {
  assert.deepEqual(editorLaunch("vscode", TARGET), {
    kind: "url",
    url: "vscode://file/Users/dev/src/file.ts:12:3",
  });
  assert.deepEqual(editorLaunch("cursor", TARGET), {
    kind: "url",
    url: "cursor://file/Users/dev/src/file.ts:12:3",
  });
  assert.deepEqual(editorLaunch("zed", TARGET), {
    kind: "url",
    url: "zed://file/Users/dev/src/file.ts:12:3",
  });
});

test("url paths are segment-encoded; a colon in a file name cannot fake a position", () => {
  const launch = editorLaunch("vscode", { filePath: "/Users/dev/My Proj/a#b:9.ts", line: 5, column: 1 });
  assert.equal(launch.kind, "url");
  assert.equal((launch as { url: string }).url, "vscode://file/Users/dev/My%20Proj/a%23b%3A9.ts:5:1");
});

test("sublime launches the bundled subl with path:line:column", () => {
  assert.deepEqual(editorLaunch("sublime", TARGET), {
    kind: "cli",
    relativeExecutable: "Contents/SharedSupport/bin/subl",
    args: ["/Users/dev/src/file.ts:12:3"],
  });
});

test("rider launches the bundled binary with --line and the plain path", () => {
  assert.deepEqual(editorLaunch("rider", TARGET), {
    kind: "cli",
    relativeExecutable: "Contents/MacOS/rider",
    args: ["--line", "12", "/Users/dev/src/file.ts"],
  });
});

test("invalid line and column values clamp to 1", () => {
  for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const launch = editorLaunch("vscode", { filePath: "/a.ts", line: bad, column: bad });
    assert.equal((launch as { url: string }).url, "vscode://file/a.ts:1:1");
  }
  const fractional = editorLaunch("sublime", { filePath: "/a.ts", line: 3.9, column: 2.2 });
  assert.deepEqual((fractional as { args: string[] }).args, ["/a.ts:3:2"]);
});

test("every editor has a title, bundle ids, and a launch plan", () => {
  const editors: EditorType[] = ["vscode", "cursor", "zed", "sublime", "rider"];
  for (const editor of editors) {
    assert.ok(EDITOR_TITLES[editor].length > 0);
    assert.ok(EDITOR_BUNDLE_IDS[editor].length > 0);
    assert.ok(editorLaunch(editor, TARGET).kind);
  }
});
