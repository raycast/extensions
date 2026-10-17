import assert from "node:assert/strict";
import test from "node:test";
import { createLatestLoad } from "../src/latest-load.ts";
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const unexpectedError = (error) => {
  throw error;
};
test("delayed Finder results cannot overwrite edited, cleared, or swapped paths", async () => {
  for (const change of ["edit", "clear", "swap"]) {
    const load = createLatestLoad(),
      pending = deferred();
    let paths = ["before.txt", "after.txt"];
    const done = load.run(
      () => pending.promise,
      (v) => {
        paths = v;
      },
      unexpectedError,
    );
    load.invalidate();
    paths =
      change === "swap"
        ? [paths[1], paths[0]]
        : [change === "clear" ? "" : "typed.txt", paths[1]];
    const expected = [...paths];
    pending.resolve(["old-left.txt", "old-right.txt"]);
    await done;
    assert.deepEqual(paths, expected, change);
  }
});
test("explicit Finder selection wins over delayed automatic prefill", async () => {
  const load = createLatestLoad(),
    prefill = deferred();
  let paths;
  const apply = (v) => {
    paths = v;
  };
  const first = load.run(() => prefill.promise, apply, unexpectedError);
  await load.run(
    async () => ["selected-left", "selected-right"],
    apply,
    unexpectedError,
  );
  prefill.resolve(["prefill-left", "prefill-right"]);
  await first;
  assert.deepEqual(paths, ["selected-left", "selected-right"]);
});
test("newest clipboard request wins when reads finish out of order", async () => {
  const load = createLatestLoad(),
    first = deferred(),
    second = deferred();
  let text = "";
  const apply = (v) => {
    text = v;
  };
  const a = load.run(() => first.promise, apply, unexpectedError);
  const b = load.run(() => second.promise, apply, unexpectedError);
  second.resolve("new clipboard");
  await b;
  first.resolve("old clipboard");
  await a;
  assert.equal(text, "new clipboard");
});
test("editing one side cancels only that side; empty clipboard text remains valid", async () => {
  const left = createLatestLoad(),
    right = createLatestLoad(),
    l = deferred(),
    r = deferred();
  let leftText = "",
    rightText = "previous";
  const a = left.run(
    () => l.promise,
    (v) => {
      leftText = v;
    },
    unexpectedError,
  );
  const b = right.run(
    () => r.promise,
    (v) => {
      rightText = v;
    },
    unexpectedError,
  );
  left.invalidate();
  leftText = "typed while loading";
  l.resolve("stale clipboard");
  r.resolve("");
  await Promise.all([a, b]);
  assert.equal(leftText, "typed while loading");
  assert.equal(rightText, "");
});
test("stale failures stay silent while current failures are reported", async () => {
  const load = createLatestLoad(),
    old = deferred(),
    errors = [];
  const fail = () => assert.fail("unexpected value");
  const report = (e) => {
    errors.push(e.message);
  };
  const pending = load.run(() => old.promise, fail, report);
  await load.run(
    async () => {
      throw new Error("current failure");
    },
    fail,
    report,
  );
  old.reject(new Error("stale failure"));
  await pending;
  assert.deepEqual(errors, ["current failure"]);
});
test("submit or unmount invalidation discards pending success and failure", async () => {
  for (const fail of [false, true]) {
    const load = createLatestLoad(),
      pending = deferred();
    const done = load.run(
      () => pending.promise,
      () => assert.fail("late update"),
      () => assert.fail("late error"),
    );
    load.invalidate();
    if (fail) pending.reject(new Error("late failure"));
    else pending.resolve("late value");
    await done;
  }
  const load = createLatestLoad();
  load.invalidate();
  let value;
  await load.run(
    async () => "next request",
    (v) => {
      value = v;
    },
    unexpectedError,
  );
  assert.equal(value, "next request");
});
