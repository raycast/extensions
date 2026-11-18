const assert = require("node:assert/strict");
const test = require("node:test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { parseVessloData, MalformedVessloDataError } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data.js"),
);
const { reviewSnapshotReason, assessUpdateCount, MAX_EXPORT_AGE_MS } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data-state.js"),
);
const { isUpdatableApp, executableUpdateRoute } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/update-filter.js"),
);
const directory = join(__dirname, "fixtures/app-integration");
const manifest = JSON.parse(
  readFileSync(join(directory, "manifest.json"), "utf8"),
);
const now = Date.parse(manifest.fixtureClock);
const fixture = (name = "ready.json") =>
  JSON.parse(readFileSync(join(directory, name), "utf8"));
const parse = (raw) => parseVessloData(JSON.stringify(raw));

test("all thirteen app-owned export fixtures match schema, count and check-readiness expectations", () => {
  const exports = manifest.entries.filter((entry) => entry.kind === "export");
  assert.equal(exports.length, 13);
  for (const entry of exports) {
    if (
      ["count-mismatch.json", "unsupported-export-schema.json"].includes(
        entry.file,
      )
    ) {
      assert.throws(
        () => parse(fixture(entry.file)),
        MalformedVessloDataError,
        entry.file,
      );
      continue;
    }
    const data = parse(fixture(entry.file));
    assert.equal(data.schemaVersion, 2, entry.file);
    assert.equal(
      data.publisherSessionId,
      manifest.fixtureSessionId,
      entry.file,
    );
    assert.equal(assessUpdateCount(data).status, "consistent", entry.file);
    const blocked = [
      "checking.json",
      "failed.json",
      "unverified-startup.json",
    ].includes(entry.file);
    assert.equal(reviewSnapshotReason(data, now) !== null, blocked, entry.file);
  }
});

test("past skip, current skip, deleted history, unknown actions and duplicate Bundle IDs retain producer meaning", () => {
  const past = parse(fixture("ready-past-skip-new-target.json"));
  assert.equal(past.apps.filter(isUpdatableApp).length, 2);
  assert.equal(executableUpdateRoute(past.apps[0]), "homebrew");
  for (const name of ["ready-current-target-skipped.json", "deleted.json"])
    assert.equal(parse(fixture(name)).apps.filter(isUpdatableApp).length, 1);
  const unknown = parse(fixture("unknown-action.json"));
  assert.equal(unknown.apps.filter(isUpdatableApp).length, 2);
  assert.equal(unknown.apps[0].primaryActionKind, "unknown");
  assert.equal(executableUpdateRoute(unknown.apps[0]), null);
  const duplicate = parse(fixture("duplicate-bundle-different-paths.json"));
  assert.equal(duplicate.apps.length, 2);
  assert.equal(duplicate.apps[0].bundleId, duplicate.apps[1].bundleId);
  assert.notEqual(duplicate.apps[0].path, duplicate.apps[1].path);
  assert.notEqual(duplicate.apps[0].id, duplicate.apps[1].id);
});

test("schema 2 required metadata, capabilities and optional revisions fail closed when malformed", () => {
  for (const key of [
    "producerVersion",
    "producerBuild",
    "publisherSessionId",
    "inventoryRevision",
    "exportRevision",
    "checkRevision",
    "checkPhase",
    "capabilities",
    "exportedAt",
    "updateCount",
  ]) {
    const raw = fixture();
    delete raw[key];
    assert.throws(() => parse(raw), MalformedVessloDataError, `missing ${key}`);
  }
  for (const key of [
    "inventoryRevision",
    "exportRevision",
    "checkRevision",
    "completedCheckRevision",
    "checkedInventoryRevision",
  ])
    for (const value of [null, "1", -1, 1.5, Number.MAX_SAFE_INTEGER + 1, true])
      assert.throws(
        () => parse({ ...fixture(), [key]: value }),
        MalformedVessloDataError,
        `${key}=${value}`,
      );
  for (const change of [
    { publisherSessionId: "not-a-uuid" },
    { publisherSessionId: ` ${manifest.fixtureSessionId}` },
    { producerVersion: "\u0000" },
    { checkPhase: "complete" },
    { capabilities: "homebrewReviewV1" },
    { capabilities: ["homebrewReviewV1", null] },
    { capabilities: ["homebrewReviewV1", "homebrewReviewV1"] },
    { capabilities: [" homebrewReviewV1"] },
    { exportedAt: "2026-02-31T00:00:00Z" },
    { lastUpdateCheckAt: "2026-09-10" },
    { lastUpdateCheckAt: null },
    { checkReason: null },
  ])
    assert.throws(
      () => parse({ ...fixture(), ...change }),
      MalformedVessloDataError,
    );
});

test("inconsistent completion, inventory and check revisions cannot become ready", () => {
  for (const change of [
    { completedCheckRevision: 10 },
    { completedCheckRevision: 12 },
    { checkRevision: 0, completedCheckRevision: 0 },
    { checkedInventoryRevision: 41 },
    { checkedInventoryRevision: 43 },
    { checkPhase: "checking" },
    { checkPhase: "unverified" },
    { lastUpdateCheckAt: "2026-09-10T12:00:01Z" },
  ])
    assert.throws(
      () => parse({ ...fixture(), ...change }),
      /inconsistent|newer/,
    );
  for (const key of [
    "completedCheckRevision",
    "checkedInventoryRevision",
    "lastUpdateCheckAt",
  ]) {
    const raw = fixture();
    delete raw[key];
    assert.throws(() => parse(raw), /inconsistent/);
  }
  const unverified = fixture("unverified-startup.json");
  unverified.completedCheckRevision = 1;
  assert.throws(() => parse(unverified), /inconsistent/);
});

test("legacy metadata cannot grant authority and schema 2 missing capabilities remain browseable", () => {
  const legacy = fixture();
  delete legacy.schemaVersion;
  const data = parse(legacy);
  assert.equal(data.schemaVersion, undefined);
  assert.equal(data.publisherSessionId, undefined);
  assert.equal(data.capabilities, undefined);
  assert.match(reviewSnapshotReason(data, now), /legacy/);
  for (const capabilities of [
    [],
    ["homebrewReviewV1"],
    ["requestReceiptsV1"],
    ["futureCapability"],
  ])
    assert.match(
      reviewSnapshotReason(parse({ ...fixture(), capabilities }), now),
      /capabilities/,
    );
  assert.equal(
    reviewSnapshotReason(
      parse({
        ...fixture(),
        capabilities: [...fixture().capabilities, "futureCapability"],
      }),
      now,
    ),
    null,
  );
});

test("check freshness is independent of file export freshness and cannot use future or absent timestamps", () => {
  const data = parse(fixture());
  assert.equal(reviewSnapshotReason(data, now), null);
  assert.equal(reviewSnapshotReason(data, now + MAX_EXPORT_AGE_MS - 1), null);
  assert.match(reviewSnapshotReason(data, now + MAX_EXPORT_AGE_MS), /24 hours/);
  const reexported = parse({
    ...fixture(),
    lastUpdateCheckAt: new Date(now - MAX_EXPORT_AGE_MS).toISOString(),
  });
  assert.match(
    reviewSnapshotReason(reexported, now),
    /last completed.*24 hours/,
  );
  assert.match(reviewSnapshotReason(data, now - 1), /future/);
  assert.match(
    reviewSnapshotReason({ ...data, lastUpdateCheckAt: undefined }, now),
    /no valid/,
  );
  assert.match(
    reviewSnapshotReason({ ...data, checkedInventoryRevision: 41 }, now),
    /does not match/,
  );
  assert.match(
    reviewSnapshotReason({ ...data, publisherSessionId: "bad" }, now),
    /session/,
  );
  assert.match(
    reviewSnapshotReason(
      { ...data, checkRevision: Number.MAX_SAFE_INTEGER + 1 },
      now,
    ),
    /revision/,
  );
  assert.match(reviewSnapshotReason(data, Number.NaN), /invalid/);
});

test("a new publisher session may start lower revisions without inventing continuity with an old session", () => {
  const data = parse({
    ...fixture(),
    publisherSessionId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    inventoryRevision: 1,
    checkedInventoryRevision: 1,
    exportRevision: 2,
    checkRevision: 1,
    completedCheckRevision: 1,
  });
  assert.equal(reviewSnapshotReason(data, now), null);
  assert.notEqual(data.publisherSessionId, manifest.fixtureSessionId);
  assert.equal(data.exportRevision, 2);
});

test("schema 2 identities are preserved exactly or rejected, never trimmed into a different target", () => {
  const raw = fixture();
  raw.apps[0].bundleId = "Com.Example.Editor";
  raw.apps[0].version = "1.0 Beta";
  raw.apps[0].id = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";
  const data = parse(raw);
  assert.equal(data.apps[0].bundleId, raw.apps[0].bundleId);
  assert.equal(data.apps[0].version, raw.apps[0].version);
  assert.equal(data.apps[0].id, raw.apps[0].id);
  for (const key of [
    "id",
    "bundleId",
    "path",
    "homebrewCask",
    "version",
    "targetVersion",
    "primaryActionKind",
    "eligibilityKind",
  ])
    for (const transform of [
      (value) => ` ${value}`,
      (value) => `${value}\u0000`,
      (value) => `${value}\u202e`,
      () => "x".repeat(4097),
    ]) {
      const changed = fixture();
      changed.apps[0][key] = transform(changed.apps[0][key]);
      assert.throws(() => parse(changed), MalformedVessloDataError, key);
    }
  raw.apps[1].id = raw.apps[0].id.toLowerCase();
  assert.throws(() => parse(raw), /duplicate app/);
});

test("schema 2 required row flags and collections cannot degrade to legacy execution semantics", () => {
  for (const key of [
    "isDeleted",
    "isIgnored",
    "isSkipped",
    "isVisibleInUpdates",
    "currentTargetSkipped",
    "hasAnySkippedVersion",
    "sources",
    "tags",
    "primaryActionKind",
    "eligibilityKind",
  ]) {
    const raw = fixture();
    delete raw.apps[0][key];
    assert.throws(() => parse(raw), MalformedVessloDataError, key);
  }
  for (const key of ["isDeleted", "isIgnored", "currentTargetSkipped"]) {
    const raw = fixture();
    raw.apps[0][key] = true;
    assert.throws(() => parse(raw), /visibility/);
  }
  const raw = fixture();
  raw.apps[0].sources = ["Brew", null];
  assert.throws(() => parse(raw), /sources/);
});
