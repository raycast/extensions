import assert from "node:assert/strict";
import test from "node:test";
import { createTaskLimiter } from "../src/lib/worktree-core.ts";

test("bounds Git-style tasks across nested scheduling", async () => {
  const limit = createTaskLimiter(4);
  let active = 0;
  let maximumActive = 0;
  const releases: Array<() => void> = [];
  const tasks = Array.from({ length: 32 }, () =>
    limit(
      () =>
        new Promise<void>((resolve) => {
          active++;
          maximumActive = Math.max(maximumActive, active);
          releases.push(() => {
            active--;
            resolve();
          });
        }),
    ),
  );

  while (releases.length < 4) await Promise.resolve();
  while (releases.length > 0 || active > 0) {
    releases.shift()?.();
    await Promise.resolve();
  }
  await Promise.all(tasks);
  assert.equal(maximumActive, 4);
  assert.equal(active, 0);
});
