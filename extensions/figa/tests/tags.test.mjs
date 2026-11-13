import assert from "node:assert/strict";
import { test } from "node:test";
import { canReadResource, getExpenseTagNames } from "../src/format.ts";

test("tag reads require an explicit v3 permission; older or restricted keys retain expense access", () => {
  for (const context of [
    { schemaVersion: 1 },
    { schemaVersion: 2, capabilities: { expenses: { read: true } } },
    { schemaVersion: 3, capabilities: { expenses: { read: true }, tags: { read: false } } },
  ]) {
    assert.equal(canReadResource(context, "tags"), false);
    assert.equal(canReadResource(context, "expenses"), true);
  }
  assert.equal(canReadResource({ schemaVersion: 3, capabilities: { tags: { read: true } } }, "tags"), true);
});

test("expense search resolves only assigned tags from the workspace catalog", () => {
  const tags = [
    { id: "home", name: "Home" },
    { id: "work", name: "Work" },
  ];
  assert.deepEqual(getExpenseTagNames({ tagIds: ["home", "home", "deleted"] }, tags), ["Home"]);
  assert.deepEqual(getExpenseTagNames({}, tags), []);
  assert.deepEqual(getExpenseTagNames({ tagIds: ["home"] }, []), []);
});
