import { strict as assert } from "node:assert";
import test from "node:test";
import { inferAccessLevelFromProbeStatus } from "./access-control";

test("inferAccessLevelFromProbeStatus marks 403 as read-only", () => {
  assert.equal(inferAccessLevelFromProbeStatus(403), "read-only");
});

test("inferAccessLevelFromProbeStatus marks validation-like failures as full access", () => {
  assert.equal(inferAccessLevelFromProbeStatus(400), "full-access");
  assert.equal(inferAccessLevelFromProbeStatus(422), "full-access");
});

test("inferAccessLevelFromProbeStatus leaves unknown statuses unresolved", () => {
  assert.equal(inferAccessLevelFromProbeStatus(401), undefined);
  assert.equal(inferAccessLevelFromProbeStatus(500), undefined);
});
