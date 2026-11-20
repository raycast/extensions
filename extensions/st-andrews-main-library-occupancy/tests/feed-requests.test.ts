import assert from "node:assert/strict";
import { test } from "node:test";
import { startFeedRequests } from "../src/feed-requests";

test("failures back off to one minute and a successful request restores normal polling", async ({ mock }) => {
  mock.timers.enable();
  let calls = 0;
  let healthy = false;
  const session = startFeedRequests(300_000, async () => {
    calls++;
    if (!healthy) throw new Error("Temporary failure");
    return true;
  });
  try {
    await Promise.resolve();
    assert.equal(calls, 1);
    for (const [index, delay] of [2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000].entries()) {
      mock.timers.tick(delay - 1);
      assert.equal(calls, index + 1);
      mock.timers.tick(1);
      await Promise.resolve();
      assert.equal(calls, index + 2);
    }
    healthy = true;
    await session.refresh();
    assert.equal(calls, 9);
    mock.timers.tick(299_999);
    assert.equal(calls, 9);
    healthy = false;
    mock.timers.tick(1);
    await Promise.resolve();
    assert.equal(calls, 10);
    mock.timers.tick(2_000);
    await Promise.resolve();
    assert.equal(calls, 11);
  } finally {
    session.stop();
  }
});

test("a timed-out or unmounted request is aborted without overlapping or leaving retry timers", async ({ mock }) => {
  mock.timers.enable();
  const signals: AbortSignal[] = [];
  const session = startFeedRequests(
    30_000,
    (signal) =>
      new Promise<boolean>((resolve) => {
        signals.push(signal);
        signal.addEventListener("abort", () => resolve(false), { once: true });
      }),
  );
  try {
    await session.refresh();
    mock.timers.tick(60_000);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].aborted, false);
    mock.timers.tick(5_000);
    await Promise.resolve();
    assert.equal(signals[0].aborted, true);
    mock.timers.tick(2_000);
    assert.equal(signals.length, 2);
    session.stop();
    assert.equal(signals[1].aborted, true);
    await Promise.resolve();
    mock.timers.tick(300_000);
    assert.equal(signals.length, 2);
  } finally {
    session.stop();
  }
});
