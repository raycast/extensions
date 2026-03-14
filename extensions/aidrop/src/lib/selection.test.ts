import test from "node:test";
import assert from "node:assert/strict";

import {
  getSelectedPathsInDisplayOrder,
  togglePathSelection,
} from "./selection";

test("togglePathSelection adds an unselected path", () => {
  const next = togglePathSelection(new Set<string>(), "/tmp/first.png");

  assert.deepEqual([...next], ["/tmp/first.png"]);
});

test("togglePathSelection removes a selected path", () => {
  const next = togglePathSelection(
    new Set<string>(["/tmp/first.png", "/tmp/second.png"]),
    "/tmp/first.png",
  );

  assert.deepEqual([...next], ["/tmp/second.png"]);
});

test("getSelectedPathsInDisplayOrder preserves the visible list order", () => {
  const files = [
    { path: "/tmp/recent.pdf" },
    { path: "/tmp/middle.zip" },
    { path: "/tmp/oldest.txt" },
  ];

  const selectedPaths = new Set<string>(["/tmp/oldest.txt", "/tmp/recent.pdf"]);

  assert.deepEqual(getSelectedPathsInDisplayOrder(files, selectedPaths), [
    "/tmp/recent.pdf",
    "/tmp/oldest.txt",
  ]);
});
