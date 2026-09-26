const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");
const { join } = require("node:path");
const { realpathSync } = require("node:fs");

test("hook publishes meaningful polling changes while retaining the newest check time internally", async (t) => {
  const hookPath = realpathSync(
    join(process.env.VESSLO_TEST_BUILD, "utils/useVessloData.js"),
  );
  const publications = [];
  const scheduled = [];
  const snapshots = [];
  const readers = [];
  let effect;
  class Reader {
    constructor() {
      this.disposed = false;
      readers.push(this);
    }
    async read() {
      return snapshots.shift();
    }
    dispose() {
      this.disposed = true;
    }
  }
  const originalLoad = Module._load;
  const loadMock = t.mock.method(
    Module,
    "_load",
    function (request, parent, isMain) {
      if (parent?.filename === hookPath && request === "react") {
        return {
          useState: (initialize) => [
            initialize(),
            (state) => publications.push(state),
          ],
          useRef: (current) => ({ current }),
          useCallback: (callback) => callback,
          useEffect: (callback) => {
            effect = callback;
          },
        };
      }
      if (parent?.filename === hookPath && request === "./data-reader") {
        return { VessloDataReader: Reader };
      }
      return originalLoad.call(this, request, parent, isMain);
    },
  );
  t.mock.method(global, "setTimeout", (callback) => {
    scheduled.push(callback);
    return scheduled.length;
  });
  t.mock.method(global, "clearTimeout", () => {});
  delete require.cache[hookPath];
  const { useVessloData } = require(hookPath);
  loadMock.mock.restore();
  t.after(() => {
    delete require.cache[hookPath];
  });

  const data = { exportedAt: "2026-09-10T00:00:00Z", apps: [] };
  const ready = {
    status: "ready",
    reason: null,
    data,
    checkedAt: 1,
    pathAvailability: { "/A.app": "available" },
  };
  snapshots.push(ready);
  const hook = useVessloData();
  const cleanup = effect();
  await new Promise(setImmediate);
  assert.equal(publications.length, 1);

  const poll = async (snapshot) => {
    snapshots.push(snapshot);
    await scheduled.shift()();
  };
  await poll({
    ...ready,
    checkedAt: 3001,
    pathAvailability: { ...ready.pathAvailability },
  });
  assert.equal(
    publications.length,
    1,
    "unchanged polling must not call setState",
  );
  assert.equal(hook.getCurrentState().checkedAt, 3001);

  const expired = {
    ...ready,
    checkedAt: 90000000,
    status: "stale",
    reason: "Export expired",
  };
  await poll(expired);
  assert.equal(publications.length, 2);
  const missingPath = { ...expired, pathAvailability: { "/A.app": "missing" } };
  await poll(missingPath);
  assert.equal(publications.length, 3);
  const newData = { ...missingPath, data: { ...data } };
  await poll(newData);
  assert.equal(publications.length, 4);

  snapshots.push({ ...newData, checkedAt: 90003000 });
  await hook.refresh();
  assert.equal(
    publications.length,
    4,
    "unchanged refresh must not call setState",
  );
  assert.equal(hook.getCurrentState().checkedAt, 90003000);
  cleanup();
  assert.equal(readers[0].disposed, true);
});
