const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const {
  schema3Fixture,
  fixtureClock,
} = require("./helpers/readiness-fixture.cjs");
const load = (name) =>
  require(join(process.env.VESSLO_TEST_BUILD, "utils", name));
const { parseVessloData } = load("data.js");
const { reviewSnapshotReason, homebrewReviewSnapshotReason } =
  load("data-state.js");
const { homebrewTargetReadinessReason, readyHomebrewTargetCount } = load(
  "homebrew-readiness.js",
);
const { createHomebrewReviewExecutor, homebrewReviewSelectionReason } = load(
  "handoff-execution.js",
);
const { parseHomebrewReviewURL } = load("handoff-contract.js");

function snapshot(failed = true) {
  const value = schema3Fixture();
  if (failed) {
    value.checkPhase = "failed";
    value.checkReason = "sourceFailure";
    delete value.checkedInventoryRevision;
  }
  return parseVessloData(JSON.stringify(value));
}

function state(data) {
  return {
    status: "ready",
    data,
    reason: null,
    checkedAt: fixtureClock,
    pathAvailability: Object.fromEntries(
      data.apps.map((app) => [app.path, "available"]),
    ),
  };
}

function failEvidence(evidence) {
  evidence.state = "failed";
  evidence.reason = "sourceFailed";
  delete evidence.evidenceId;
  delete evidence.checkedAt;
  delete evidence.expiresAt;
}

function executor(read, clock = () => fixtureClock) {
  const urls = [];
  return {
    urls,
    execute: createHomebrewReviewExecutor({
      read,
      now: clock,
      uuid: () => "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      open: async (url) => urls.push(url),
    }),
  };
}

test("schema3 keeps global failure while current Homebrew evidence authorizes exact v2 review", async () => {
  const shown = snapshot();
  assert.match(reviewSnapshotReason(shown, fixtureClock), /failed/);
  assert.equal(homebrewReviewSnapshotReason(shown, fixtureClock), null);
  assert.equal(readyHomebrewTargetCount(shown, fixtureClock), 2);
  const h = executor(async () => state(snapshot()));
  const result = await h.execute(shown, [...shown.apps].reverse());
  assert.equal(result.kind, "opened");
  assert.equal(h.urls.length, 1);
  assert.match(h.urls[0], /^vesslo:\/\/review-homebrew\/v2\?/);
  assert.deepEqual(parseHomebrewReviewURL(h.urls[0]), result.request);
  assert.equal(result.request.schemaVersion, 2);
  assert.deepEqual(
    result.request.targets.map((target) => target.readinessEvidenceId),
    [...shown.homebrewReadiness]
      .reverse()
      .map((evidence) => evidence.evidenceId),
  );
  assert.equal(Object.hasOwn(result, "accepted"), false);
  assert.equal(Object.hasOwn(result, "completed"), false);
});

test("new capability negotiation cannot fall back to schema2 review authority", () => {
  const value = snapshot(false);
  value.schemaVersion = 2;
  value.capabilities.push("homebrewReviewV1", "requestReceiptsV1");
  assert.match(homebrewReviewSnapshotReason(value, fixtureClock), /schema 3/);
});

for (const missing of [
  "homebrewReviewV2",
  "homebrewTargetReadinessV1",
  "requestReceiptsV2",
]) {
  test(`missing ${missing} cannot use legacy capabilities or positive target evidence`, async () => {
    const value = snapshot(false);
    value.capabilities = value.capabilities.filter(
      (capability) => capability !== missing,
    );
    value.capabilities.push("homebrewReviewV1", "requestReceiptsV1");
    const h = executor(async () => state(value));
    assert.equal((await h.execute(value, value.apps)).kind, "blocked");
    assert.equal(h.urls.length, 0);
  });
}

for (const phase of ["checking", "unverified"]) {
  test(`target evidence cannot override ${phase} full-cohort state`, () => {
    const value = snapshot();
    value.checkPhase = phase;
    assert.notEqual(
      homebrewReviewSelectionReason(value, value.apps, undefined, fixtureClock),
      null,
    );
    assert.equal(readyHomebrewTargetCount(value, fixtureClock), 0);
  });
}

test("incomplete cohort, mismatched completion and non-source failure reject otherwise valid evidence", () => {
  for (const change of [
    (value) => delete value.completedInventoryRevision,
    (value) => value.completedInventoryRevision--,
    (value) => value.completedCheckRevision--,
    (value) => (value.checkReason = "interrupted"),
  ]) {
    const value = snapshot();
    change(value);
    assert.notEqual(homebrewReviewSnapshotReason(value, fixtureClock), null);
  }
});

test("mixed target failure preserves the selection and sends nothing", async () => {
  const value = snapshot();
  failEvidence(value.homebrewReadiness[1]);
  const originalIds = value.apps.map((app) => app.id);
  const h = executor(async () => state(value));
  const result = await h.execute(value, value.apps);
  assert.equal(result.kind, "blocked");
  assert.match(result.reason, /source check failed/);
  assert.deepEqual(
    value.apps.map((app) => app.id),
    originalIds,
  );
  assert.equal(h.urls.length, 0);
  assert.equal(readyHomebrewTargetCount(value, fixtureClock), 1);
});

test("persisted health success and eligibility cannot replace missing per-target evidence", async () => {
  const value = snapshot(false);
  value.homebrewReadiness = [];
  for (const app of value.apps) {
    app.updateHealthStatus = "healthy";
    app.lastUpdateSourceSuccessAt = value.lastUpdateCheckAt;
    app.updateHealthSource = "homebrew";
  }
  const h = executor(async () => state(value));
  assert.equal((await h.execute(value, value.apps)).kind, "blocked");
  assert.equal(h.urls.length, 0);
});

for (const [field, replacement] of [
  ["publisherSessionId", "cccccccc-cccc-cccc-cccc-cccccccccccc"],
  ["inventoryRevision", 41],
  ["checkRevision", 10],
]) {
  test(`selected source evidence from another ${field} is rejected`, async () => {
    const value = snapshot();
    value.homebrewReadiness[0][field] = replacement;
    const h = executor(async () => state(value));
    assert.equal((await h.execute(value, [value.apps[0]])).kind, "blocked");
    assert.equal(h.urls.length, 0);
  });
}

test("source evidence identity remains bound to the proposed installed target", () => {
  const substitutions = {
    bundleId: "com.example.other",
    canonicalPath: "/Applications/Other.app",
    caskToken: "other",
    installedVersion: "0.9",
    expectedTargetVersion: "3.0",
  };
  for (const [field, replacement] of Object.entries(substitutions)) {
    const value = snapshot();
    value.homebrewReadiness[0].target[field] = replacement;
    assert.match(
      homebrewTargetReadinessReason(value, value.apps[0], fixtureClock),
      /no longer matches/,
    );
  }
});

test("evidence expires at its deadline and enforces both future bounds and maximum lifetime", () => {
  const value = snapshot();
  const app = value.apps[0];
  assert.equal(
    homebrewTargetReadinessReason(value, app, fixtureClock + 899999),
    null,
  );
  assert.match(
    homebrewTargetReadinessReason(value, app, fixtureClock + 900000),
    /expired/,
  );
  assert.equal(readyHomebrewTargetCount(value, fixtureClock + 900000), 0);
  for (const [checkedOffset, expiryOffset] of [
    [0, 900001],
    [31000, 900000],
    [-1000, 900000],
    [0, 0],
  ]) {
    const changed = snapshot();
    changed.homebrewReadiness[0].checkedAt = new Date(
      fixtureClock + checkedOffset,
    ).toISOString();
    changed.homebrewReadiness[0].expiresAt = new Date(
      fixtureClock + expiryOffset,
    ).toISOString();
    assert.notEqual(
      homebrewTargetReadinessReason(changed, changed.apps[0], fixtureClock),
      null,
    );
  }
  const tolerated = snapshot();
  tolerated.homebrewReadiness[0].checkedAt = new Date(
    fixtureClock + 30000,
  ).toISOString();
  tolerated.homebrewReadiness[0].expiresAt = new Date(
    fixtureClock + 900000,
  ).toISOString();
  assert.equal(
    homebrewTargetReadinessReason(tolerated, tolerated.apps[0], fixtureClock),
    null,
  );
});

test("expiry during the forced disk read blocks the original request without renewing it", async () => {
  const value = snapshot();
  let now = fixtureClock + 899000;
  const h = executor(
    async () => {
      now += 2000;
      return state(snapshot());
    },
    () => now,
  );
  const result = await h.execute(value, [value.apps[0]]);
  assert.equal(result.kind, "blocked");
  assert.match(result.reason, /expired/);
  assert.equal(h.urls.length, 0);
});

for (const change of [
  (proof) => (proof.evidenceId = "dddddddd-dddd-dddd-dddd-dddddddddddd"),
  (proof) => (proof.expiresAt = "2026-09-10T12:14:00Z"),
]) {
  test("forced reread cannot silently replace selected proof identity or content", async () => {
    const shown = snapshot();
    const current = snapshot();
    change(current.homebrewReadiness[0]);
    const h = executor(async () => state(current));
    const result = await h.execute(shown, [shown.apps[0]]);
    assert.equal(result.kind, "blocked");
    assert.match(result.reason, /evidence changed/);
    assert.equal(h.urls.length, 0);
  });
}

test("selection freezes nested evidence before an asynchronous reader can mutate its object", async () => {
  const shown = snapshot();
  const h = executor(async () => {
    shown.homebrewReadiness[0].expiresAt = "2026-09-10T12:14:00Z";
    return state(shown);
  });
  assert.equal((await h.execute(shown, [shown.apps[0]])).kind, "blocked");
  assert.equal(h.urls.length, 0);
});

test("unselected proof failure does not invalidate a still-trusted selected target", async () => {
  const shown = snapshot();
  const current = snapshot();
  failEvidence(current.homebrewReadiness[1]);
  current.exportRevision++;
  const h = executor(async () => state(current));
  assert.equal((await h.execute(shown, [shown.apps[0]])).kind, "opened");
  assert.equal(h.urls.length, 1);
});

for (const direction of [true, false]) {
  test(`unrelated global source failure transition (${direction}) preserves selected source authority`, async () => {
    const shown = snapshot(direction);
    const current = snapshot(!direction);
    current.exportRevision++;
    const h = executor(async () => state(current));
    assert.equal((await h.execute(shown, [shown.apps[0]])).kind, "opened");
    assert.equal(h.urls.length, 1);
  });
}

test("schema or capability changes during preparation cannot downgrade the request", async () => {
  for (const change of [
    (value) => (value.schemaVersion = 2),
    (value) => (value.capabilities = ["homebrewReviewV1", "requestReceiptsV1"]),
  ]) {
    const shown = snapshot();
    const current = snapshot();
    change(current);
    const h = executor(async () => state(current));
    assert.equal((await h.execute(shown, shown.apps)).kind, "blocked");
    assert.equal(h.urls.length, 0);
  }
});

test("ready-count excludes ambiguous app identities, evidence IDs and installed casks", () => {
  for (const change of [
    (value) => value.apps.push({ ...value.apps[0] }),
    (value) =>
      (value.homebrewReadiness[1].evidenceId =
        value.homebrewReadiness[0].evidenceId),
    (value) =>
      value.apps.push({
        ...value.apps[0],
        id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      }),
  ]) {
    const value = snapshot();
    change(value);
    value.updateCount = value.apps.filter(
      (app) => app.isVisibleInUpdates,
    ).length;
    assert.ok(readyHomebrewTargetCount(value, fixtureClock) < 2);
  }
});
