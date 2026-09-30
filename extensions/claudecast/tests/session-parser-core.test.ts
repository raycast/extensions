import assert from "node:assert/strict";
import test from "node:test";
import {
  METADATA_SOFT_LINE_LIMIT,
  isMissingPathError,
  shouldStopMetadataScan,
} from "../src/lib/session-parser-core.ts";

test("metadata scan continues past the soft limit until it sees a user entry", () => {
  assert.equal(shouldStopMetadataScan(METADATA_SOFT_LINE_LIMIT, false), false);
  assert.equal(shouldStopMetadataScan(METADATA_SOFT_LINE_LIMIT, true), true);
});

test("metadata scan has no arbitrary line cap before a user entry", () => {
  assert.equal(shouldStopMetadataScan(10_000, false), false);
  assert.equal(shouldStopMetadataScan(10_000, true), true);
});

test("only missing-path errors are safe to suppress", () => {
  assert.equal(isMissingPathError({ code: "ENOENT" }), true);
  assert.equal(isMissingPathError({ code: "ENOTDIR" }), true);
  assert.equal(isMissingPathError({ code: "EACCES" }), false);
  assert.equal(isMissingPathError(new SyntaxError("invalid JSON")), false);
});
