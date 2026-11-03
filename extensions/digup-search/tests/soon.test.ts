import assert from "node:assert/strict";
import { test } from "node:test";
import { soon } from "../src/digup/soon";

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

test("a task set for soon runs once, after the code that set it has finished", async () => {
  let runs = 0;
  soon(() => {
    runs += 1;
  });
  assert.equal(runs, 0);
  await tick();
  assert.equal(runs, 1);
});

test("a task called off before its turn never runs", async () => {
  let runs = 0;
  const cancel = soon(() => {
    runs += 1;
  });
  cancel();
  await tick();
  assert.equal(runs, 0);
});
