import assert from "node:assert/strict";
import test from "node:test";

import { defaultSnapshotPath, resolveSnapshotPath } from "../src/lib/paths.js";

test("resolves the exact default App Group snapshot path", () => {
  assert.equal(
    defaultSnapshotPath("/Users/example"),
    "/Users/example/Library/Group Containers/group.codes.kos.Promptty/Library/Application Support/RaycastIntegration/prompts-v1.json",
  );
});

test("uses a single explicit file preference without scanning", () => {
  assert.equal(resolveSnapshotPath("/tmp/custom.json", "/Users/example"), "/tmp/custom.json");
  assert.equal(resolveSnapshotPath(["", "/tmp/selected.json"], "/Users/example"), "/tmp/selected.json");
});

test("falls back to the default path for an empty preference", () => {
  assert.equal(resolveSnapshotPath("   ", "/Users/example"), defaultSnapshotPath("/Users/example"));
});
