const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { createAppActionExecutor } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/action-execution.js"),
);
const { parseVessloData } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data.js"),
);

const { schema2Data, uuid } = require("./schema2-test-data.cjs");
const { resolveAppActions } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/action-policy.js"),
);
function fixture(overrides = {}) {
  return parseVessloData(
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      updateCount: 1,
      apps: [
        {
          id: uuid("executor-app"),
          name: "Example",
          path: "/Applications/Example.app",
          bundleId: "com.example.app",
          version: "1",
          sources: ["Sparkle"],
          targetVersion: "2",
          isVisibleInUpdates: true,
          primaryActionKind: "runSparkle",
          eligibilityKind: "executableUpdate.sparkle",
          homebrewCask: "example",
          currentTargetSkipped: false,
          hasAnySkippedVersion: false,
          ...overrides,
        },
      ],
    }),
  ).apps[0];
}
function state(app, status = "ready") {
  return {
    status,
    data: schema2Data([app]),
    pathAvailability: { [app.path]: "available" },
    reason: null,
    checkedAt: Date.now(),
  };
}
function harness(read) {
  const calls = [];
  const execute = createAppActionExecutor({
    read,
    open: async (url) => {
      calls.push(["open", url]);
    },
    reveal: async (path) => {
      calls.push(["reveal", path]);
    },
  });
  return { execute, calls };
}

test("Sparkle handoff opens only its per-app Vesslo URL and reports handoff, not completion", async () => {
  const app = fixture();
  const h = harness(async () => state(app));
  assert.deepEqual(await h.execute(app, "update"), { kind: "handedOff" });
  assert.deepEqual(h.calls, [["open", "vesslo://update/com.example.app"]]);
});
for (const status of [
  "stale",
  "missing",
  "malformed",
  "contractMismatch",
  "permissionDenied",
  "ioError",
  "loading",
]) {
  test(`fresh read ${status} blocks every previously displayed external app action`, async () => {
    const app = fixture();
    const h = harness(async () => state(app, status));
    for (const intent of ["update", "open", "finder"])
      assert.equal((await h.execute(app, intent)).kind, "blocked");
    assert.deepEqual(h.calls, []);
  });
}
for (const overrides of [
  { isDeleted: true },
  { currentTargetSkipped: true },
  { isIgnored: true },
  { primaryActionKind: "unknown" },
  { primaryActionKind: "refreshRequired" },
  { targetVersion: "3" },
  { version: "changed" },
  { homebrewCask: "different" },
  { appStoreId: "456" },
  { eligibilityKind: "executableUpdate.homebrew" },
  { path: "/Applications/Replaced.app" },
  { bundleId: "com.changed" },
])
  test(`changed candidate cannot execute ${JSON.stringify(overrides)}`, async () => {
    const app = fixture();
    const h = harness(async () => state(fixture(overrides)));
    assert.equal((await h.execute(app, "update")).kind, "blocked");
    assert.deepEqual(h.calls, []);
  });
test("record removal and duplicate bundle both block handoff", async () => {
  const app = fixture();
  for (const apps of [
    [],
    [
      app,
      {
        ...app,
        id: uuid("executor-duplicate"),
        path: "/Applications/Another.app",
      },
    ],
  ]) {
    const current = state(app);
    current.data = schema2Data(apps);
    const h = harness(async () => current);
    const result = await h.execute(app, "update");
    assert.equal(result.kind, "blocked");
    assert.match(
      result.reason,
      apps.length === 0 ? /record changed/ : /unique installed app/,
    );
    assert.deepEqual(h.calls, []);
  }
});

test("fresh count disagreement or missing count blocks a previously displayed update without external effects", async () => {
  const app = fixture();
  for (const updateCount of [0, 2, null]) {
    const current = state(app);
    current.data.updateCount = updateCount;
    const h = harness(async () => current);
    const result = await h.execute(app, "update");
    assert.equal(result.kind, "blocked");
    assert.deepEqual(h.calls, []);
  }
});
test("path disappearance after render blocks Open/Finder/update", async () => {
  const app = fixture();
  const current = state(app);
  current.pathAvailability[app.path] = "missing";
  const h = harness(async () => current);
  for (const intent of ["update", "open", "finder"])
    assert.equal((await h.execute(app, intent)).kind, "blocked");
  assert.deepEqual(h.calls, []);
});
test("available Open/Finder paths are revalidated and forwarded literally", async () => {
  const app = fixture({ path: "/Applications/Example $(text).app" });
  const h = harness(async () => state(app));
  await h.execute(app, "open");
  await h.execute(app, "finder");
  assert.deepEqual(h.calls, [
    ["open", app.path],
    ["reveal", app.path],
  ]);
});
test("concurrent handoff is rejected and failure releases the per-app gate", async () => {
  const app = fixture();
  let finish;
  let reads = 0;
  const h = harness(() => {
    reads++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const first = h.execute(app, "update");
  assert.equal((await h.execute(app, "update")).kind, "blocked");
  assert.equal(reads, 1);
  finish(state(app));
  await first;
  assert.equal(h.calls.length, 1);
  let shouldFail = true;
  const retry = harness(async () => {
    if (shouldFail) throw new Error("read failed");
    return state(app);
  });
  await assert.rejects(retry.execute(app, "update"), /read failed/);
  shouldFail = false;
  assert.equal((await retry.execute(app, "update")).kind, "handedOff");
});

test("App Store browsing never opens a different product after a fresh read", async () => {
  const app = fixture({
    primaryActionKind: "openAppStore",
    eligibilityKind: "appStoreManualUpdate",
    sources: ["App Store"],
    appStoreId: "123",
  });
  const current = fixture({
    primaryActionKind: "openAppStore",
    eligibilityKind: "appStoreManualUpdate",
    sources: ["App Store"],
    appStoreId: "456",
  });
  assert.equal(resolveAppActions(app, state(app)).update.kind, "openAppStore");
  const h = harness(async () => state(current));
  assert.equal((await h.execute(app, "update")).kind, "blocked");
  assert.deepEqual(h.calls, []);
});

test("Homebrew manual installer never opens the generic update URL while a Manual source retains its handoff", async () => {
  const homebrew = fixture({
    primaryActionKind: "openInstaller",
    eligibilityKind: "manualInstallerUpdate",
    sources: ["Brew"],
    homebrewCask: "example",
  });
  const policy = resolveAppActions(homebrew, state(homebrew));
  assert.equal(policy.update.kind, "review");
  assert.match(policy.update.reason, /Homebrew installer/);
  const blocked = harness(async () => state(homebrew));
  assert.equal((await blocked.execute(homebrew, "update")).kind, "blocked");
  assert.deepEqual(blocked.calls, []);
  const manual = fixture({
    primaryActionKind: "openInstaller",
    eligibilityKind: "manualInstallerUpdate",
    sources: ["Manual"],
    homebrewCask: null,
  });
  const allowed = harness(async () => state(manual));
  assert.equal((await allowed.execute(manual, "update")).kind, "handedOff");
  assert.deepEqual(allowed.calls, [
    ["open", "vesslo://update/com.example.app"],
  ]);
});

test("source set changes while a fresh read is pending block handoff even when the current route remains eligible", async () => {
  const displayed = fixture({ sources: ["Sparkle"] });
  let completeRead;
  const h = harness(
    () =>
      new Promise((resolve) => {
        completeRead = resolve;
      }),
  );
  const pending = h.execute(displayed, "update");
  const changed = fixture({ sources: ["Sparkle", "Brew"] });
  assert.equal(
    resolveAppActions(changed, state(changed)).update.kind,
    "handoff",
  );
  completeRead(state(changed));
  const result = await pending;
  assert.equal(result.kind, "blocked");
  assert.match(result.reason, /candidate changed/);
  assert.deepEqual(h.calls, []);

  const sameSetDisplayed = fixture({ sources: ["Sparkle", "Manual"] });
  const sameSetCurrent = fixture({ sources: ["Manual", "Sparkle", "Sparkle"] });
  const reordered = harness(async () => state(sameSetCurrent));
  assert.equal(
    (await reordered.execute(sameSetDisplayed, "update")).kind,
    "handedOff",
  );
  assert.deepEqual(reordered.calls, [
    ["open", "vesslo://update/com.example.app"],
  ]);
});

test("generic executor never opens an old update URL even for a fully eligible Homebrew review target", async () => {
  const app = fixture({
    primaryActionKind: "runBrew",
    eligibilityKind: "executableUpdate.homebrew",
    sources: ["Brew"],
  });
  const current = state(app);
  assert.equal(resolveAppActions(app, current).update.kind, "homebrewReview");
  const h = harness(async () => current);
  assert.equal((await h.execute(app, "update")).kind, "blocked");
  assert.deepEqual(h.calls, []);
});

test("fresh legacy or unchecked snapshots block an already displayed update while retaining ordinary app browsing", async () => {
  const app = fixture();
  for (const change of [
    { schemaVersion: undefined },
    { checkPhase: "unverified" },
    { checkPhase: "checking" },
    { checkPhase: "failed" },
    { checkedInventoryRevision: 41 },
    { completedCheckRevision: 10 },
    { capabilities: [] },
    { lastUpdateCheckAt: "2020-01-01T00:00:00Z" },
  ]) {
    const current = state(app);
    Object.assign(current.data, change);
    const h = harness(async () => current);
    const result = await h.execute(app, "update");
    assert.equal(result.kind, "blocked", JSON.stringify(change));
    assert.deepEqual(h.calls, []);
    assert.equal((await h.execute(app, "open")).kind, "opened");
    assert.deepEqual(h.calls, [["open", app.path]]);
  }
});
