import { strict as assert } from "node:assert";
import { test } from "node:test";
import { retainStatus } from "../src/state";
import { DEFAULT_CONFIG, Status } from "../service/protocol";

// Polling identical status must not cause Raycast to repeatedly render an unchanged view.
test("unchanged status keeps its object identity", () => {
  const previous: Status = {
    version: 1,
    config: DEFAULT_CONFIG,
    activity: "idle",
    missingRoots: [],
    modelReady: true,
  };
  assert.equal(retainStatus(previous, structuredClone(previous)), previous);
  const changed = { ...previous, activity: "indexing" };
  assert.equal(retainStatus(previous, changed), changed);
  assert.equal(retainStatus(undefined, changed), changed);
});
