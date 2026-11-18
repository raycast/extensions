import assert from "node:assert/strict";
import test from "node:test";

import { elsewhereRecoveryCopy } from "./recovery-copy";

test("offers open and retry for stopped or unavailable Elsewhere state", () => {
  assert.deepEqual(elsewhereRecoveryCopy({ kind: "unavailable" }), {
    title: "Open Elsewhere First",
    message: "Open Elsewhere and retry this command when its controls are ready?",
    canOpenAndRetry: true,
  });

  const stale = elsewhereRecoveryCopy({
    kind: "stale",
    reason: "stopped",
    snapshot: {} as never,
    snapshotPath: "/tmp/elsewhere-control-v1.json",
  });
  assert.equal(stale.title, "Elsewhere Isn’t Running");
  assert.equal(stale.canOpenAndRetry, true);
});

test("does not blindly retry an unsupported snapshot", () => {
  assert.deepEqual(
    elsewhereRecoveryCopy({
      kind: "unsupported",
      schemaVersion: 2,
      snapshotPath: "/tmp/elsewhere-control-v1.json",
    }),
    {
      title: "Update the Elsewhere Extension",
      message: "Snapshot schema 2 is not supported.",
      canOpenAndRetry: false,
    },
  );
});
