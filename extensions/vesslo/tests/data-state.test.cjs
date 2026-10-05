const assert = require("node:assert/strict");
const test = require("node:test");
const { join } = require("node:path");
const { parseVessloData, MalformedVessloDataError } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data.js"),
);
const {
  exportFreshnessReason,
  hasSameDataPresentation,
  initialVessloDataState,
  MAX_EXPORT_AGE_MS,
  assessUpdateCount,
} = require(join(process.env.VESSLO_TEST_BUILD, "utils/data-state.js"));

const now = Date.parse("2026-09-10T00:00:00Z");
const timestamp = new Date(now).toISOString();
const app = (overrides = {}) => ({
  id: "1",
  name: "Example",
  path: "/Applications/Example.app",
  ...overrides,
});

test("parser preserves current-target skip and deletion history", () => {
  const parsed = parseVessloData(
    JSON.stringify({
      exportedAt: timestamp,
      apps: [
        app({
          isSkipped: true,
          currentTargetSkipped: false,
          hasAnySkippedVersion: true,
          isDeleted: true,
          isVisibleInUpdates: true,
          eligibilityKind: "executable",
          primaryActionKind: "update",
        }),
      ],
    }),
  );
  assert.equal(parsed.apps.length, 1);
  assert.equal(parsed.apps[0].isDeleted, true);
  assert.equal(parsed.apps[0].isSkipped, true);
  assert.equal(parsed.apps[0].currentTargetSkipped, false);
  assert.equal(parsed.apps[0].hasAnySkippedVersion, true);
  assert.equal(parsed.apps[0].exportContract, "current");
});

test("legacy fields remain explicit null and missing timestamp is never synthesized", () => {
  const parsed = parseVessloData(JSON.stringify({ apps: [app()] }));
  assert.equal(parsed.exportedAt, "");
  assert.equal(parsed.apps[0].currentTargetSkipped, null);
  assert.equal(parsed.apps[0].hasAnySkippedVersion, null);
  assert.equal(parsed.apps[0].exportContract, "legacy");
  assert.equal(parsed.updateCount, null);
  assert.match(exportFreshnessReason(parsed.exportedAt, now), /no timestamp/);
});

test("unsupported contract is retained for review", () => {
  const parsed = parseVessloData(
    JSON.stringify({
      exportedAt: timestamp,
      apps: [app({ isVisibleInUpdates: true, currentTargetSkipped: "false" })],
    }),
  );
  assert.equal(parsed.apps[0].exportContract, "unsupported");
  assert.equal(parsed.apps[0].currentTargetSkipped, null);
});

test("invalid structural entries and duplicate IDs fail instead of silently changing counts", () => {
  for (const value of [
    "{",
    "null",
    "[]",
    "{}",
    JSON.stringify({ apps: [null] }),
    JSON.stringify({ apps: [{ id: "1" }] }),
    JSON.stringify({ apps: [app(), app()] }),
  ]) {
    assert.throws(() => parseVessloData(value), MalformedVessloDataError);
  }
});

test("missing, invalid, future, expired timestamps are stale", () => {
  assert.match(exportFreshnessReason("", now), /no timestamp/);
  for (const invalid of [
    "invalid",
    "September 10 2026",
    "2026-02-31T00:00:00Z",
    "2026-09-10",
  ]) {
    assert.match(exportFreshnessReason(invalid, now), /invalid/);
  }
  assert.match(
    exportFreshnessReason(new Date(now + 1).toISOString(), now),
    /future/,
  );
  assert.match(
    exportFreshnessReason(new Date(now - MAX_EXPORT_AGE_MS).toISOString(), now),
    /24 hours/,
  );
  assert.equal(exportFreshnessReason(timestamp, now), null);
  assert.equal(
    exportFreshnessReason(
      new Date(now - MAX_EXPORT_AGE_MS + 1).toISOString(),
      now,
    ),
    null,
  );
});

test("malformed lifecycle flags and unknown explicit schema fail closed", () => {
  for (const key of ["isDeleted", "isIgnored", "isSkipped"]) {
    for (const value of ["true", 1, null]) {
      assert.throws(
        () =>
          parseVessloData(JSON.stringify({ apps: [app({ [key]: value })] })),
        MalformedVessloDataError,
      );
    }
  }
  for (const schemaVersion of [1, 999, "1", null]) {
    assert.throws(
      () => parseVessloData(JSON.stringify({ schemaVersion, apps: [app()] })),
      /unsupported schema/,
    );
  }
});

test("presentation equality ignores checkedAt and path insertion order", () => {
  const previous = {
    ...initialVessloDataState(),
    status: "ready",
    data: { exportedAt: timestamp, apps: [] },
    pathAvailability: { "/A.app": "available", "/B.app": "missing" },
  };
  const next = {
    ...previous,
    checkedAt: previous.checkedAt + 3000,
    pathAvailability: { "/B.app": "missing", "/A.app": "available" },
  };
  assert.equal(hasSameDataPresentation(previous, next), true);
  assert.equal(hasSameDataPresentation(next, previous), true);
});

test("presentation changes include status, reason, data identity and every path change", () => {
  const previous = {
    ...initialVessloDataState(),
    status: "ready",
    data: { exportedAt: timestamp, apps: [] },
    pathAvailability: { "/A.app": "available" },
  };
  for (const change of [
    { status: "stale" },
    { reason: "Export expired" },
    { data: { ...previous.data } },
    { pathAvailability: { "/A.app": "missing" } },
    { pathAvailability: { "/B.app": "available" } },
    { pathAvailability: {} },
    { pathAvailability: { ...previous.pathAvailability, "/B.app": "unknown" } },
  ]) {
    assert.equal(
      hasSameDataPresentation(previous, { ...previous, ...change }),
      false,
    );
  }
});

test("known actions and eligibility are normalized while unknown raw values remain reviewable", () => {
  const current = require("./fixtures/current-app.json");
  const known = parseVessloData(
    JSON.stringify({ apps: [current], updateCount: 1 }),
  );
  assert.equal(known.apps[0].primaryActionKind, "runBrew");
  assert.equal(known.apps[0].eligibilityKind, "executableUpdate.homebrew");
  const future = parseVessloData(
    JSON.stringify({
      apps: [
        {
          ...current,
          primaryActionKind: "runFutureInstaller",
          eligibilityKind: "executableUpdate.future",
        },
      ],
      updateCount: 1,
    }),
  );
  assert.equal(future.apps[0].primaryActionKind, "unknown");
  assert.equal(future.apps[0].eligibilityKind, "unknown");
  assert.equal(future.apps[0].rawPrimaryActionKind, "runFutureInstaller");
  assert.equal(future.apps[0].rawEligibilityKind, "executableUpdate.future");
  assert.equal(future.apps[0].exportContract, "current");
});

test("current update count uses explicit visibility rather than historical skips or execution routes", () => {
  const current = require("./fixtures/current-app.json");
  const apps = [
    { ...current, isSkipped: true, hasAnySkippedVersion: true },
    { ...current, id: "review", primaryActionKind: "refreshRequired" },
    { ...current, id: "hidden", isVisibleInUpdates: false },
  ];
  const data = parseVessloData(JSON.stringify({ apps, updateCount: 2 }));
  assert.deepEqual(assessUpdateCount(data), {
    status: "consistent",
    reportedCount: 2,
    visibleCount: 2,
    reason: null,
  });
  const mismatch = assessUpdateCount({ ...data, updateCount: 1 });
  assert.equal(mismatch.status, "mismatch");
  assert.match(mismatch.reason, /reports 1 update,.*contain 2/);
});

test("legacy and incomplete visibility cannot produce a false current-count mismatch", () => {
  const current = require("./fixtures/current-app.json");
  const legacy = app({ targetVersion: "2.0", isSkipped: false });
  for (const apps of [[legacy], [current, { ...legacy, id: "legacy" }]]) {
    const data = parseVessloData(JSON.stringify({ apps, updateCount: 97 }));
    const assessment = assessUpdateCount(data);
    assert.equal(assessment.status, "unverifiable");
    assert.equal(assessment.reportedCount, 97);
    assert.match(assessment.reason, /Legacy or incomplete/);
  }
  const missingCount = parseVessloData(JSON.stringify({ apps: [current] }));
  assert.equal(assessUpdateCount(missingCount).status, "unverifiable");
  assert.equal(assessUpdateCount(missingCount).reportedCount, null);
});

test("contradictory current visibility is a contract mismatch even when reported count matches flags", () => {
  const current = require("./fixtures/current-app.json");
  for (const flags of [
    { isDeleted: true },
    { isIgnored: true },
    { currentTargetSkipped: true },
  ]) {
    const data = parseVessloData(
      JSON.stringify({ apps: [{ ...current, ...flags }], updateCount: 1 }),
    );
    const assessment = assessUpdateCount(data);
    assert.equal(assessment.status, "mismatch");
    assert.equal(assessment.visibleCount, 0);
    assert.match(
      assessment.reason,
      /marks a deleted, ignored, or currently skipped/,
    );
  }
});

test("explicit invalid counts are malformed rather than silently converted to zero", () => {
  for (const updateCount of [
    null,
    -1,
    1.5,
    "1",
    true,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.throws(
      () => parseVessloData(JSON.stringify({ apps: [], updateCount })),
      /invalid update count/,
    );
  }
  const empty = parseVessloData(JSON.stringify({ apps: [], updateCount: 0 }));
  assert.equal(assessUpdateCount(empty).status, "consistent");
  assert.equal(
    assessUpdateCount({ ...empty, updateCount: 1 }).status,
    "mismatch",
  );
});
