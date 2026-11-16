import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { createResultBatcher } from "../src/lib/search-result-batcher.ts";

function setup(intervalMs = 100) {
  mock.timers.enable({ apis: ["setTimeout"] });
  const flushes: number[][] = [];
  const batcher = createResultBatcher<number>(
    (items) => flushes.push(items),
    intervalMs,
  );
  return { batcher, flushes };
}

test("a burst of 100 results produces one flush", (t) => {
  t.after(() => mock.timers.reset());
  const { batcher, flushes } = setup();

  for (let value = 0; value < 100; value++) batcher.push(value);
  assert.equal(flushes.length, 0);

  mock.timers.tick(100);
  assert.equal(flushes.length, 1);
  assert.equal(flushes[0].length, 100);
  assert.deepEqual(flushes[0].slice(0, 2), [0, 1]);
});

test("results arriving over time flush at most once per interval", (t) => {
  t.after(() => mock.timers.reset());
  const { batcher, flushes } = setup();

  for (let value = 0; value < 50; value++) {
    batcher.push(value);
    mock.timers.tick(10);
  }

  assert.ok(
    flushes.length <= 5,
    `expected <= 5 flushes, got ${flushes.length}`,
  );
  batcher.flush();
  assert.equal(flushes.flat().length, 50);
});

test("flush delivers pending results immediately and cancels the timer", (t) => {
  t.after(() => mock.timers.reset());
  const { batcher, flushes } = setup();

  batcher.push(1);
  batcher.flush();
  assert.deepEqual(flushes, [[1]]);

  mock.timers.tick(100);
  assert.deepEqual(flushes, [[1]]);
});

test("flush with nothing pending does not call the consumer", (t) => {
  t.after(() => mock.timers.reset());
  const { batcher, flushes } = setup();

  batcher.flush();
  assert.deepEqual(flushes, []);
});

test("dispose drops pending results and ignores later pushes", (t) => {
  t.after(() => mock.timers.reset());
  const { batcher, flushes } = setup();

  batcher.push(1);
  batcher.dispose();
  batcher.push(2);
  batcher.flush();
  mock.timers.tick(100);

  assert.deepEqual(flushes, []);
});
