import test from "node:test";
import assert from "node:assert/strict";
import { confirmationLifetime, planKey, readPlan } from "../src/lib/confirmation-plan";

test("confirmation receipts bind the operation and exact inputs", () => {
  assert.notEqual(planKey("add", { tags: ["a"] }), planKey("remove", { tags: ["a"] }));
  assert.notEqual(planKey("add", { tags: ["a"], paths: ["/a"] }), planKey("add", { tags: ["a"], paths: ["/b"] }));
});

test("a confirmed selection is frozen, serializable, and expires", () => {
  const plan = {
    createdAt: 1000,
    tags: ["Invoice"],
    paths: [{ path: "/original-selection", device: 1, inode: 2 }],
    failures: [],
  };
  assert.deepEqual(readPlan(JSON.stringify(plan), 1001).paths, plan.paths);
  assert.doesNotThrow(() => structuredClone(readPlan(JSON.stringify(plan), 1001)));
  assert.throws(() => readPlan(undefined));
  assert.throws(() => readPlan(JSON.stringify(plan), 1001 + confirmationLifetime));
  assert.throws(() => readPlan(JSON.stringify(plan), 999));
  assert.throws(() => readPlan(JSON.stringify({ ...plan, paths: [{ path: "/a" }] }), 1001));
});
