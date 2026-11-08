import assert from "node:assert/strict";
import test from "node:test";

import { searchStateForApplicationChange } from "./searchLifecycle.ts";

test("switching Blume applications clears stale results and returns to loading", () => {
  assert.deepEqual(searchStateForApplicationChange(), {
    results: [],
    isLoading: true,
    error: null,
  });
});
