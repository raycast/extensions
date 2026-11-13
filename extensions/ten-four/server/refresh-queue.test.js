const { test } = require("node:test");
const assert = require("node:assert/strict");

const { createRefreshQueue } = require("../src/refresh-queue.js");

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

test("polls during a slow refresh do not schedule unbounded follow-up loads", async () => {
  const firstLoad = deferred();
  let calls = 0;
  const refresh = createRefreshQueue(() => {
    calls += 1;
    return firstLoad.promise;
  });

  const pending = refresh();
  refresh();
  refresh();

  firstLoad.resolve();
  await pending;
  assert.equal(calls, 1);
});

test("an action refresh waits for one follow-up load", async () => {
  const loads = [deferred(), deferred()];
  let calls = 0;
  const refresh = createRefreshQueue(() => loads[calls++].promise);

  const first = refresh();
  const action = refresh({ followUp: true });
  loads[0].resolve();
  await Promise.resolve();
  assert.equal(calls, 2);
  loads[1].resolve();

  await Promise.all([first, action]);
  assert.equal(calls, 2);
});

test("an action after the final follow-up check starts another refresh", async () => {
  const loads = [deferred(), deferred()];
  let calls = 0;
  const refresh = createRefreshQueue(() => loads[calls++].promise);

  const first = refresh();
  let action;
  loads[0].promise.then(() => {
    action = refresh({ followUp: true });
  });
  loads[0].resolve();

  await Promise.resolve();
  await Promise.resolve();
  assert.equal(calls, 2);
  loads[1].resolve();

  await Promise.all([first, action]);
  assert.equal(calls, 2);
});

test("a follow-up queued while the loop is exiting still runs", async () => {
  const loads = [deferred(), deferred()];
  let calls = 0;
  const refresh = createRefreshQueue(() => loads[calls++].promise);

  const first = refresh();
  loads[0].promise.then(() => {
    refresh({ followUp: true });
  });
  loads[0].resolve();

  await first;
  assert.equal(calls, 2);
  loads[1].resolve();
});
