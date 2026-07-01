import { strict as assert } from "node:assert";
import test from "node:test";
import {
  getEffectiveAccessLevel,
  hasConfiguredWriteAccess,
  markSessionReadOnly,
  resetSessionAccessOverride,
} from "./access-control";

test.afterEach(() => {
  resetSessionAccessOverride();
});

test("hasConfiguredWriteAccess disables writes for read-only keys", () => {
  assert.equal(hasConfiguredWriteAccess("read-only"), false);
});

test("hasConfiguredWriteAccess enables writes for full-access keys", () => {
  assert.equal(hasConfiguredWriteAccess("full-access"), true);
});

test("session override can downgrade a full-access configuration", () => {
  assert.equal(getEffectiveAccessLevel("full-access", "key-a"), "full-access");
  markSessionReadOnly("key-a");
  assert.equal(getEffectiveAccessLevel("full-access", "key-a"), "read-only");
});

test("session override is scoped to the current key", () => {
  markSessionReadOnly("key-a");
  assert.equal(getEffectiveAccessLevel("full-access", "key-a"), "read-only");
  assert.equal(getEffectiveAccessLevel("full-access", "key-b"), "full-access");
});
