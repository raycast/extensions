const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");
const { join } = require("node:path");
const { realpathSync } = require("node:fs");

test("receipt polling suppresses unchanged renders, force refreshes and stops all lifecycle work on unmount", async (t) => {
  const hookPath = realpathSync(
    join(process.env.VESSLO_TEST_BUILD, "utils/useHandoffReceipts.js"),
  );
  const { initialReceiptState } = require(
    join(process.env.VESSLO_TEST_BUILD, "utils/receipt-contract.js"),
  );
  const publications = [],
    scheduled = [],
    cleared = [],
    reads = [],
    readers = [];
  let effect, pending;
  let snapshot = { ...initialReceiptState(), status: "ready", checkedAt: 1 };
  class Reader {
    constructor() {
      readers.push(this);
      this.disposed = false;
    }
    async read(options) {
      reads.push(options);
      return pending ? pending : snapshot;
    }
    dispose() {
      this.disposed = true;
    }
  }
  const originalLoad = Module._load;
  const mock = t.mock.method(
    Module,
    "_load",
    function (request, parent, isMain) {
      if (parent?.filename === hookPath && request === "react")
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
      if (parent?.filename === hookPath && request === "./receipt-reader")
        return { HandoffReceiptReader: Reader, initialReceiptState };
      return originalLoad.call(this, request, parent, isMain);
    },
  );
  t.mock.method(global, "setTimeout", (callback) => {
    scheduled.push(callback);
    return scheduled.length;
  });
  t.mock.method(global, "clearTimeout", (id) => {
    cleared.push(id);
  });
  delete require.cache[hookPath];
  const { useHandoffReceipts } = require(hookPath);
  mock.mock.restore();
  t.after(() => {
    delete require.cache[hookPath];
  });
  const hook = useHandoffReceipts();
  const cleanup = effect();
  await new Promise(setImmediate);
  assert.equal(publications.length, 1);
  assert.equal(scheduled.length, 1);
  snapshot = { ...snapshot, checkedAt: 3001 };
  await scheduled.shift()();
  assert.equal(
    publications.length,
    1,
    "Unchanged status must not rerender each poll",
  );
  await hook.refresh();
  assert.deepEqual(reads.at(-1), { force: true });
  snapshot = { ...snapshot, status: "permissionDenied", reason: "Denied" };
  await hook.refresh();
  assert.equal(publications.length, 2);
  let release;
  pending = new Promise((resolve) => {
    release = resolve;
  });
  const inflight = scheduled.shift()();
  await new Promise(setImmediate);
  cleanup();
  assert.equal(readers[0].disposed, true);
  assert.ok(cleared.length);
  release({ ...snapshot, status: "ready" });
  await inflight;
  assert.equal(
    publications.length,
    2,
    "Disposed reader cannot publish a late success",
  );
  assert.equal(
    scheduled.length,
    0,
    "Disposed poll cannot schedule itself again",
  );
  const readCount = reads.length;
  await hook.refresh();
  assert.equal(reads.length, readCount);
});
