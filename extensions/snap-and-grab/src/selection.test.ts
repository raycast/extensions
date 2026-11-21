import assert from "node:assert/strict";
import { test } from "node:test";
import { selectedInHistoryOrder, toggleSelection } from "./selection";
import { resolveConfiguration } from "./config";

test("selection toggles without mutating the previous selection", () => {
  const original = new Set(["new"]);
  const added = toggleSelection(original, "old");
  assert.deepEqual([...original], ["new"]);
  assert.deepEqual([...added], ["new", "old"]);
  assert.deepEqual([...toggleSelection(added, "new")], ["old"]);
});

test("copied order follows history, regardless of selection order and stale entries", () => {
  const history = ["new", "old", "new"].map((path) => ({ path, name: path, modifiedAt: "2026-11-13" }));
  assert.deepEqual(
    selectedInHistoryOrder(history, new Set(["old", "deleted", "new"])).map((s) => s.path),
    ["new", "old"],
  );
});

test("confirmation can be disabled without changing selection previews or folder defaults", () => {
  assert.deepEqual(resolveConfiguration({ confirmation: "0" }), {
    folder: "",
    previews: true,
    confirmationDuration: 0,
  });
  assert.deepEqual(
    resolveConfiguration({ confirmation: "bad", showPreviews: false, screenshotFolder: " /tmp/shots " }),
    {
      folder: "/tmp/shots",
      previews: false,
      confirmationDuration: 1.5,
    },
  );
});
