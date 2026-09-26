const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { parseVessloData } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data.js"),
);
const { createHomebrewReviewExecutor, homebrewReviewSelectionReason } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/handoff-execution.js"),
);
const { parseHomebrewReviewURL } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/handoff-contract.js"),
);
const now = Date.parse("2026-09-10T12:00:00Z");
const requestId = "44444444-4444-4444-4444-444444444444";
function data(file = "ready.json") {
  return parseVessloData(
    readFileSync(join(__dirname, "fixtures/app-integration", file), "utf8"),
  );
}
function state(snapshot = data()) {
  return {
    status: "ready",
    data: snapshot,
    reason: null,
    checkedAt: now,
    pathAvailability: Object.fromEntries(
      snapshot.apps.map((app) => [app.path, "available"]),
    ),
  };
}
function harness(read, overrides = {}) {
  const calls = [];
  const execute = createHomebrewReviewExecutor({
    read,
    open: async (url) => calls.push(url),
    now: () => now,
    uuid: () => requestId,
    ...overrides,
  });
  return { execute, calls };
}

test("submission rereads current snapshot and preserves selected target order exactly", async () => {
  const snapshot = data();
  let reads = 0;
  const h = harness(async () => {
    reads++;
    return state();
  });
  const result = await h.execute(snapshot, [...snapshot.apps].reverse());
  assert.equal(result.kind, "opened");
  assert.equal(reads, 1);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(parseHomebrewReviewURL(h.calls[0]), result.request);
  assert.deepEqual(
    result.request.targets.map((target) => target.appId),
    snapshot.apps.map((app) => app.id).reverse(),
  );
  assert.equal(result.request.source, "homebrew");
  assert.equal(result.request.createdAt, new Date(now).toISOString());
  assert.equal(result.request.inventoryRevision, 42);
  assert.equal(result.request.completedCheckRevision, 11);
  assert.equal(result.request.requestId, requestId);
  assert.equal(Object.hasOwn(result, "accepted"), false);
  assert.equal(Object.hasOwn(result, "completed"), false);
});

test("pure preview supports omitted paths but a supplied map must verify every path", () => {
  const snapshot = data();
  assert.equal(
    homebrewReviewSelectionReason(snapshot, snapshot.apps, undefined, now),
    null,
  );
  assert.match(
    homebrewReviewSelectionReason(snapshot, snapshot.apps, {}, now),
    /path/,
  );
  assert.match(
    homebrewReviewSelectionReason(snapshot, [], undefined, now),
    /between 1 and 16/,
  );
  assert.match(
    homebrewReviewSelectionReason(
      snapshot,
      Array(17).fill(snapshot.apps[0]),
      undefined,
      now,
    ),
    /between 1 and 16/,
  );
});

test("past skipped version is allowed, but current skipped and unknown action fixtures cannot send", async () => {
  for (const [file, expected] of [
    ["ready-past-skip-new-target.json", "opened"],
    ["ready-current-target-skipped.json", "blocked"],
    ["unknown-action.json", "blocked"],
    ["deleted.json", "blocked"],
  ]) {
    const snapshot = data(file);
    const h = harness(async () => state(snapshot));
    assert.equal(
      (await h.execute(snapshot, snapshot.apps)).kind,
      expected,
      file,
    );
    assert.equal(h.calls.length, expected === "opened" ? 1 : 0);
  }
});

test("same Bundle ID at distinct cask paths keeps both exact targets", async () => {
  const snapshot = data("duplicate-bundle-different-paths.json");
  const h = harness(async () => state(snapshot));
  const result = await h.execute(snapshot, snapshot.apps);
  assert.equal(result.kind, "opened");
  assert.equal(result.request.targets.length, 2);
  assert.equal(
    result.request.targets[0].bundleId,
    result.request.targets[1].bundleId,
  );
  assert.notEqual(
    result.request.targets[0].canonicalPath,
    result.request.targets[1].canonicalPath,
  );
});

test("every non-ready read state blocks without opening any URL", async () => {
  for (const status of [
    "loading",
    "missing",
    "malformed",
    "permissionDenied",
    "ioError",
    "stale",
    "contractMismatch",
  ]) {
    const snapshot = data();
    const current = { ...state(), status };
    const h = harness(async () => current);
    assert.equal(
      (await h.execute(snapshot, snapshot.apps)).kind,
      "blocked",
      status,
    );
    assert.equal(h.calls.length, 0);
  }
});

test("checking, failed, unverified, missing capabilities and legacy snapshots cannot send", async () => {
  for (const file of [
    "checking.json",
    "failed.json",
    "unverified-startup.json",
  ]) {
    const snapshot = data(file);
    const h = harness(async () => state(snapshot));
    assert.equal(
      (await h.execute(snapshot, snapshot.apps)).kind,
      "blocked",
      file,
    );
    assert.equal(h.calls.length, 0);
  }
  for (const changes of [
    { schemaVersion: undefined },
    { capabilities: [] },
    { capabilities: ["homebrewReviewV1"] },
    { lastUpdateCheckAt: undefined },
  ]) {
    const snapshot = { ...data(), ...changes };
    const h = harness(async () => state(snapshot));
    assert.equal((await h.execute(snapshot, snapshot.apps)).kind, "blocked");
    assert.equal(h.calls.length, 0);
  }
});

test("same mtime/date cannot hide session, inventory, or completed check changes at submission", async () => {
  const changes = [
    { publisherSessionId: "99999999-9999-9999-9999-999999999999" },
    { inventoryRevision: 43, checkedInventoryRevision: 43 },
    { completedCheckRevision: 12, checkRevision: 12 },
    { checkRevision: 12 },
    { checkedInventoryRevision: 43 },
    { exportRevision: 99 },
  ];
  for (const changed of changes) {
    const current = { ...data(), ...changed };
    const h = harness(async () => state(current));
    const selected = data();
    assert.equal(
      (await h.execute(selected, selected.apps)).kind,
      "blocked",
      JSON.stringify(changed),
    );
    assert.equal(h.calls.length, 0);
  }
  const newerPublication = data();
  newerPublication.exportRevision++;
  const h = harness(async () => state(newerPublication));
  const selected = data();
  assert.equal((await h.execute(selected, selected.apps)).kind, "opened");
});

test("all ordered identities and executable route fields are revalidated after the read", async () => {
  for (const changes of [
    { id: "99999999-9999-9999-9999-999999999999" },
    { bundleId: "com.changed" },
    { path: "/Applications/Changed.app" },
    { homebrewCask: "changed" },
    { version: "1.1" },
    { targetVersion: "2.1" },
    { sources: ["Sparkle"] },
    { isDeleted: true },
    { isIgnored: true },
    { currentTargetSkipped: true },
    { currentTargetSkipped: null },
    { primaryActionKind: "openInstaller" },
    { primaryActionKind: "runSparkle" },
    { eligibilityKind: "executableUpdate.sparkle" },
    { isVisibleInUpdates: false },
  ]) {
    const current = data();
    Object.assign(current.apps[0], changes);
    const h = harness(async () => state(current));
    const selected = data();
    assert.equal(
      (await h.execute(selected, selected.apps)).kind,
      "blocked",
      JSON.stringify(changes),
    );
    assert.equal(h.calls.length, 0);
  }
});

test("new duplicate cask instance, duplicate UUID, missing record and unverified counts block the whole request", async () => {
  for (const mutate of [
    (d) =>
      d.apps.push({
        ...d.apps[0],
        id: "99999999-9999-9999-9999-999999999999",
        path: "/Applications/Other.app",
        isVisibleInUpdates: false,
      }),
    (d) =>
      d.apps.push({
        ...d.apps[0],
        path: "/Applications/Other.app",
        isVisibleInUpdates: false,
      }),
    (d) => {
      d.apps.shift();
      d.updateCount = 1;
    },
    (d) => {
      d.updateCount = 1;
    },
    (d) => {
      d.updateCount = null;
    },
  ]) {
    const current = data();
    mutate(current);
    const h = harness(async () => state(current));
    const selected = data();
    assert.equal((await h.execute(selected, selected.apps)).kind, "blocked");
    assert.equal(h.calls.length, 0);
  }
});

test("path permission denial, missing and unknown fail all-or-none after revalidation", async () => {
  for (const availability of [
    "permissionDenied",
    "missing",
    "unknown",
    undefined,
  ]) {
    const current = state();
    current.pathAvailability[current.data.apps[1].path] = availability;
    const h = harness(async () => current);
    const selected = data();
    assert.equal((await h.execute(selected, selected.apps)).kind, "blocked");
    assert.equal(h.calls.length, 0);
  }
});

test("selection snapshots cannot be rewritten during asynchronous preparation", async () => {
  const selected = data();
  const h = harness(async () => {
    selected.apps[0].version = "changed";
    selected.inventoryRevision = 999;
    return state();
  });
  const result = await h.execute(selected, selected.apps);
  assert.equal(result.kind, "opened");
  assert.equal(result.request.targets[0].installedVersion, "1.0");
  assert.equal(result.request.inventoryRevision, 42);
});

test("slow read expires the original request and never recreates it automatically", async () => {
  let clock = now;
  const h = harness(
    async () => {
      clock += 120001;
      return state();
    },
    { now: () => clock },
  );
  const selected = data();
  const result = await h.execute(selected, selected.apps);
  assert.equal(result.kind, "blocked");
  assert.match(result.reason, /expired/);
  assert.equal(h.calls.length, 0);
});

test("concurrent and repeated same selection submissions cannot create multiple review opens", async () => {
  let resolveRead;
  const h = harness(
    () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
  );
  const selected = data();
  const first = h.execute(selected, selected.apps);
  assert.equal((await h.execute(selected, selected.apps)).kind, "blocked");
  resolveRead(state());
  assert.equal((await first).kind, "opened");
  assert.equal(
    (await h.execute(selected, [...selected.apps].reverse())).kind,
    "blocked",
  );
  assert.equal(h.calls.length, 1);
});

test("read and open errors release the gate without retry or fallback mutation URLs", async () => {
  const selected = data();
  let reads = 0;
  const h = harness(async () => {
    reads++;
    if (reads === 1) throw new Error("read denied");
    return state();
  });
  assert.deepEqual(await h.execute(selected, selected.apps), {
    kind: "blocked",
    reason: "read denied",
  });
  assert.equal((await h.execute(selected, selected.apps)).kind, "opened");
  assert.equal(reads, 2);
  let opens = 0;
  const failed = harness(async () => state(), {
    open: async () => {
      opens++;
      throw new Error("review open failed");
    },
  });
  assert.deepEqual(await failed.execute(selected, selected.apps), {
    kind: "blocked",
    reason: "review open failed",
  });
  assert.equal(opens, 1);
});
