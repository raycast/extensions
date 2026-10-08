import * as assert from "node:assert/strict";
import { test } from "node:test";
import { shouldRefreshProcesses } from "../src/utils/refresh";

test("does not refresh process list during background launches", () => {
  assert.equal(shouldRefreshProcesses("background"), false);
});

test("refreshes process list during user initiated launches", () => {
  assert.equal(shouldRefreshProcesses("userInitiated"), true);
});
