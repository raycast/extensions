import assert from "node:assert/strict";
import { test } from "node:test";
import { saveTodoDraft } from "../src/lib/form-submission";
import type { Mutation } from "../src/lib/protocol";

test("new Todo stays in input mode for consecutive additions", async () => {
  const operations: Mutation[] = [];
  const result = await saveTodoDraft("散歩", undefined, async (operation) => {
    operations.push(operation);
    return true;
  });
  assert.deepEqual(operations, [["add", "散歩"]]);
  assert.equal(result, "stay-open");
});

test("successful edit returns to the list", async () => {
  const operations: Mutation[] = [];
  const result = await saveTodoDraft("更新", "todo-1", async (operation) => {
    operations.push(operation);
    return true;
  });
  assert.deepEqual(operations, [["edit", "todo-1", "更新"]]);
  assert.equal(result, "close");
});

test("failed save must not close the editor or clear the input", async () => {
  for (const id of [undefined, "todo-1"]) {
    assert.equal(
      await saveTodoDraft("残す入力", id, async () => false),
      "failed",
    );
  }
});
