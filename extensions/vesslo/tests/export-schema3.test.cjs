const assert = require("node:assert/strict");
const test = require("node:test");
const { join } = require("node:path");
const { schema3Fixture } = require("./helpers/readiness-fixture.cjs");
const { parseVessloData, MalformedVessloDataError } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data.js"),
);
const parse = (raw) => parseVessloData(JSON.stringify(raw));
const changeEntry = (changes) => {
  const data = schema3Fixture();
  Object.assign(data.homebrewReadiness[0], changes);
  return data;
};

test("schema 3 preserves global source failure and separate completed cohort and target evidence", () => {
  const raw = schema3Fixture();
  raw.checkPhase = "failed";
  raw.checkReason = "sourceFailure";
  delete raw.checkedInventoryRevision;
  const data = parse(raw);
  assert.equal(data.schemaVersion, 3);
  assert.equal(data.checkPhase, "failed");
  assert.equal(data.checkReason, "sourceFailure");
  assert.equal(data.checkedInventoryRevision, undefined);
  assert.equal(data.completedInventoryRevision, data.inventoryRevision);
  assert.deepEqual(data.homebrewReadiness, raw.homebrewReadiness);
});

test("schema 3 readiness collection is required, bounded and never falls back to missing proof", () => {
  for (const value of [undefined, null, {}, "ready", Array(10001).fill({})]) {
    const raw = schema3Fixture();
    raw.homebrewReadiness = value;
    assert.throws(() => parse(raw), MalformedVessloDataError);
  }
  assert.deepEqual(
    parse({ ...schema3Fixture(), homebrewReadiness: [] }).homebrewReadiness,
    [],
  );
  assert.throws(
    () => parse({ ...schema3Fixture(), schemaVersion: 4 }),
    /unsupported/,
  );
});

test("schema 3 complete cohort field cannot invent a check or future inventory", () => {
  for (const value of [
    undefined,
    null,
    -1,
    "42",
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    41,
    43,
  ])
    assert.throws(
      () => parse({ ...schema3Fixture(), completedInventoryRevision: value }),
      MalformedVessloDataError,
    );
  const raw = schema3Fixture();
  raw.checkPhase = "unverified";
  delete raw.checkedInventoryRevision;
  delete raw.completedCheckRevision;
  delete raw.lastUpdateCheckAt;
  raw.homebrewReadiness = [];
  assert.throws(() => parse(raw), /cohort/);
  delete raw.completedInventoryRevision;
  assert.equal(parse(raw).completedInventoryRevision, undefined);
});

test("schema 3 target identity, source, state, UUID and integer fields remain exact", () => {
  const invalid = [
    { target: null },
    { target: {} },
    { source: "sparkle" },
    { source: undefined },
    { state: "completed" },
    { state: undefined },
    { publisherSessionId: "bad" },
    { publisherSessionId: null },
    { checkRevision: -1 },
    { checkRevision: undefined },
    { inventoryRevision: null },
    { inventoryRevision: Number.MAX_SAFE_INTEGER + 1 },
  ];
  for (const entry of invalid)
    assert.throws(() => parse(changeEntry(entry)), MalformedVessloDataError);
  for (const proof of [null, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"]) {
    const raw = schema3Fixture();
    raw.homebrewReadiness[0].target.readinessEvidenceId = proof;
    assert.throws(() => parse(raw), /identity/);
  }
  const raw = schema3Fixture();
  raw.homebrewReadiness[0].target.bundleId = "Com.Example.Editor";
  assert.equal(
    parse(raw).homebrewReadiness[0].target.bundleId,
    "Com.Example.Editor",
  );
});

test("schema 3 nonready nil fields normalize without producing evidence and require the exact state reason", () => {
  for (const state of ["failed", "unverified"]) {
    const data = parse(
      changeEntry({
        state,
        evidenceId: null,
        checkedAt: null,
        expiresAt: null,
        reason: state === "failed" ? "sourceFailed" : "sourceUnverified",
      }),
    );
    const entry = data.homebrewReadiness[0];
    assert.equal(entry.evidenceId, undefined);
    assert.equal(entry.checkedAt, undefined);
    assert.equal(entry.expiresAt, undefined);
    assert.equal(entry.state, state);
  }
  for (const state of ["failed", "unverified"]) {
    const raw = changeEntry({
      state,
      evidenceId: null,
      checkedAt: null,
      expiresAt: null,
      reason: state === "failed" ? "sourceFailed" : "sourceUnverified",
    });
    for (const reason of [
      undefined,
      null,
      "futureReason",
      "staleSourceEvidence",
      "sourceEvidenceExpired",
      state === "failed" ? "sourceUnverified" : "sourceFailed",
    ])
      assert.throws(
        () =>
          parse({
            ...raw,
            homebrewReadiness: [{ ...raw.homebrewReadiness[0], reason }],
          }),
        /evidence fields/,
      );
    for (const key of ["evidenceId", "checkedAt", "expiresAt"])
      assert.throws(
        () =>
          parse({
            ...raw,
            homebrewReadiness: [
              {
                ...raw.homebrewReadiness[0],
                [key]: schema3Fixture().homebrewReadiness[0][key],
              },
            ],
          }),
        /evidence fields/,
      );
  }
});

test("ready state requires positive UUID evidence and complete dates, and cannot carry a failure reason", () => {
  for (const field of ["evidenceId", "checkedAt", "expiresAt"])
    for (const value of [undefined, null, "invalid", 1])
      assert.throws(
        () => parse(changeEntry({ [field]: value })),
        MalformedVessloDataError,
        `${field}=${value}`,
      );
  assert.throws(
    () => parse(changeEntry({ reason: "sourceFailed" })),
    /evidence fields/,
  );
  assert.equal(
    parse(changeEntry({ reason: null })).homebrewReadiness[0].reason,
    undefined,
  );
});

test("evidence chronology cannot be zero, negative or beyond fifteen minutes", () => {
  for (const changes of [
    { expiresAt: "2026-09-10T12:00:00Z" },
    { expiresAt: "2026-09-10T11:59:59Z" },
    { expiresAt: "2026-09-10T12:15:00.001Z" },
  ])
    assert.throws(() => parse(changeEntry(changes)), /chronology/);
  assert.equal(
    parse(
      changeEntry({
        checkedAt: "2026-09-10T12:00:30Z",
        expiresAt: "2026-09-10T12:15:30Z",
      }),
    ).homebrewReadiness[0].checkedAt,
    "2026-09-10T12:00:30Z",
  );
});

test("structurally valid future and previous-check evidence stays browseable for the readiness gate to reject", () => {
  for (const [checkedAt, expiresAt] of [
    ["2026-09-10T12:00:30.001Z", "2026-09-10T12:15:30.001Z"],
    ["2026-09-09T12:00:00Z", "2026-09-09T12:15:00Z"],
  ]) {
    const data = parse(changeEntry({ checkedAt, expiresAt }));
    assert.equal(data.homebrewReadiness[0].checkedAt, checkedAt);
    assert.equal(data.homebrewReadiness[0].expiresAt, expiresAt);
  }
});

test("schema 3 duplicate app and evidence UUIDs are rejected case-insensitively", () => {
  for (const key of ["app", "evidence"]) {
    const raw = schema3Fixture();
    if (key === "app")
      raw.homebrewReadiness[1].target.appId =
        raw.homebrewReadiness[0].target.appId.toUpperCase();
    else
      raw.homebrewReadiness[1].evidenceId =
        raw.homebrewReadiness[0].evidenceId.toUpperCase();
    assert.throws(() => parse(raw), /duplicate/);
  }
});

test("versioned metadata does not acquire schema 3 authority when its version is legacy or schema 2", () => {
  const raw = schema3Fixture();
  raw.schemaVersion = 2;
  const older = parse(raw);
  assert.equal(older.homebrewReadiness, undefined);
  assert.equal(older.completedInventoryRevision, undefined);
  delete raw.schemaVersion;
  const legacy = parse(raw);
  assert.equal(legacy.schemaVersion, undefined);
  assert.equal(legacy.homebrewReadiness, undefined);
  assert.equal(legacy.capabilities, undefined);
});

const { createHash } = require("node:crypto");
const appFixtures = require("./helpers/app-readiness-fixture.cjs");
const { homebrewTargetReadinessReason } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/homebrew-readiness.js"),
);

test("app-owned hand-authored schema 3 fixtures preserve the pinned manifest and all twenty-seven file hashes", () => {
  const hash = (content) => createHash("sha256").update(content).digest("hex");
  const expected =
    "0028fcefb14cd69b59d9cc12299abf90e09be4c9f59e1d80aab896869ca45d03";
  assert.equal(hash(appFixtures.read("manifest.json")), expected);
  assert.equal(appFixtures.read("manifest.sha256").split(/\s+/)[0], expected);
  assert.equal(appFixtures.manifest.entries.length, 27);
  assert.equal(appFixtures.fixture("provenance.json").swiftGenerated, false);
  for (const entry of appFixtures.manifest.entries)
    assert.equal(hash(appFixtures.read(entry.file)), entry.sha256, entry.file);
});

for (const entry of appFixtures.manifest.entries.filter(
  (entry) => entry.kind === "export",
)) {
  test(`app-owned schema 3 export preserves decode and selected-target semantics: ${entry.file}`, () => {
    if (entry.expected.decode === "rejectInvalidReadiness") {
      assert.throws(
        () => parseVessloData(appFixtures.read(entry.file)),
        MalformedVessloDataError,
      );
      return;
    }
    const raw = appFixtures.fixture(entry.file);
    const data = parseVessloData(appFixtures.read(entry.file));
    assert.equal(data.schemaVersion, 3);
    assert.equal(data.checkPhase, raw.checkPhase);
    assert.equal(
      data.completedInventoryRevision,
      raw.completedInventoryRevision,
    );
    assert.deepEqual(data.homebrewReadiness, raw.homebrewReadiness);
    if (entry.expected.reviewGate === "eligibleWithInjectedAuthorization") {
      for (const index of entry.expected.selectedTargetIndices)
        assert.equal(
          homebrewTargetReadinessReason(
            data,
            data.apps[index],
            appFixtures.fixtureClock,
          ),
          null,
        );
      for (const index of Object.keys(
        entry.expected.blockedTargetReasons ?? {},
      ))
        assert.notEqual(
          homebrewTargetReadinessReason(
            data,
            data.apps[index],
            appFixtures.fixtureClock,
          ),
          null,
        );
    } else {
      assert.notEqual(
        homebrewTargetReadinessReason(
          data,
          data.apps[0],
          appFixtures.fixtureClock,
        ),
        null,
      );
    }
  });
}
