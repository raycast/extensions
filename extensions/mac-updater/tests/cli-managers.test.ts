import { test } from "node:test";
import * as assert from "node:assert/strict";
import { isExternallyManagedError } from "../src/utils/sources/cli-managers";

test("isExternallyManagedError matches the real PEP 668 refusal text", () => {
  // The exact wording pip emits on a Homebrew-managed Python.
  const real =
    "error: externally-managed-environment\n\n× This environment is externally managed";
  assert.equal(isExternallyManagedError(real), true);
});

test("isExternallyManagedError matches Debian/Ubuntu phrasing too", () => {
  assert.equal(
    isExternallyManagedError("This environment is externally managed"),
    true,
  );
});

test("isExternallyManagedError ignores unrelated pip errors", () => {
  assert.equal(
    isExternallyManagedError("ERROR: Could not find a version that satisfies"),
    false,
  );
  assert.equal(
    isExternallyManagedError("ConnectionError: failed to fetch"),
    false,
  );
});
