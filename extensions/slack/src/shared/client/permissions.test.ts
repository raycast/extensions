import assert from "node:assert/strict";
import test from "node:test";
import { canReauthorizeSlack, getMissingScopeDetails } from "./permissions";

test("reads missing permissions from Slack structured errors and legacy messages", () => {
  assert.deepEqual(getMissingScopeDetails({ data: { error: "missing_scope", needed: "groups:read,mpim:read" } }), {
    needed: "groups:read,mpim:read",
  });
  assert.deepEqual(getMissingScopeDetails(new Error("An API error occurred: missing_scope")), { needed: undefined });
  assert.equal(getMissingScopeDetails(new Error("invalid_auth")), undefined);
  assert.equal(getMissingScopeDetails(null), undefined);
});

test("personal tokens never offer OAuth recovery even with leftover OAuth credentials", () => {
  assert.equal(canReauthorizeSlack("xoxp-manual", true), false);
  assert.equal(canReauthorizeSlack("xoxp-manual", false), false);
  assert.equal(canReauthorizeSlack(undefined, true), true);
  assert.equal(canReauthorizeSlack("", true), true);
  assert.equal(canReauthorizeSlack(undefined, false), false);
});
