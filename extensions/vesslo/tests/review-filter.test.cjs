const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const build = process.env.VESSLO_TEST_BUILD;
if (!build) throw new Error("Run npm test to compile consumer test modules.");
const { filterReviewApps, reviewCategories } = require(
  path.join(build, "utils/review-filter"),
);
const { isUpdatableApp } = require(path.join(build, "utils/update-filter"));
const { resolveAppActions } = require(path.join(build, "utils/action-policy"));
const fixture = require("./fixtures/current-app.json");

function app(overrides = {}) {
  return { ...fixture, ...overrides };
}

function context(apps, status = "ready") {
  return {
    status,
    data: {
      apps,
      exportedAt: "2026-09-10T00:00:00Z",
      updateCount: apps.filter((app) => app.isVisibleInUpdates === true).length,
    },
    pathAvailability: Object.fromEntries(
      apps.map((item) => [item.path, "available"]),
    ),
  };
}

test("review categories distinguish security, source checks, and management context", () => {
  const security = app({ securityReasons: ["invalidSignature"] });
  const source = app({ updateHealthStatus: "repeatedFailure" });
  const management = app({ managementReasons: ["noMemoOrTags"] });
  assert.deepEqual(reviewCategories(security), ["security"]);
  assert.deepEqual(reviewCategories(source), ["source"]);
  assert.deepEqual(reviewCategories(management), ["management"]);
  assert.deepEqual(
    reviewCategories({
      ...security,
      ...source,
      ...management,
      securityReasons: ["unsignedApp"],
      updateHealthStatus: "stale",
    }),
    ["security", "source", "management"],
  );
});

test("update availability and broad audit group labels alone do not create review warnings", () => {
  const item = app({
    auditGroups: ["management"],
    managementReasons: ["updateAvailable"],
  });
  assert.equal(isUpdatableApp(item), true);
  assert.deepEqual(filterReviewApps([item]), []);
  assert.deepEqual(
    reviewCategories(
      app({ auditGroups: ["security", "updateMaintenance", "management"] }),
    ),
    [],
  );
});

test("review inclusion uses active source health states from the existing display contract", () => {
  for (const updateHealthStatus of [
    "stale",
    "repeatedFailure",
    "unavailable",
    "suspectedEnded",
  ]) {
    assert.deepEqual(reviewCategories(app({ updateHealthStatus })), ["source"]);
  }
  for (const updateHealthStatus of [
    null,
    "healthy",
    "unknown",
    "futureHealthState",
  ]) {
    assert.deepEqual(
      reviewCategories(
        app({ updateHealthStatus, updateHealthReasons: ["historicalFailure"] }),
      ),
      [],
    );
  }
});

test("deleted records stay in source data but never enter review results", () => {
  const deleted = app({
    id: "deleted",
    isDeleted: true,
    securityReasons: ["unsignedApp"],
  });
  const live = app({ managementReasons: ["subscriptionApp"] });
  const source = [deleted, live];
  assert.deepEqual(filterReviewApps(source), [live]);
  assert.equal(source.length, 2);
  assert.equal(source[0], deleted);
});

test("category filtering preserves multiple categories without duplicating an app", () => {
  const security = app({ id: "security", securityReasons: ["unsignedApp"] });
  const multi = app({
    id: "multi",
    securityReasons: ["notNotarized"],
    managementReasons: ["largeApp"],
  });
  const source = app({ id: "source", updateHealthStatus: "stale" });
  const apps = [security, multi, source];
  assert.deepEqual(filterReviewApps(apps, { category: "management" }), [multi]);
  assert.equal(filterReviewApps(apps, { category: "security" }).length, 2);
  assert.deepEqual(filterReviewApps(apps, { category: "source" }), [source]);
  assert.equal(filterReviewApps(apps).length, 3);
});

test("review search matches identity, notes, tags, exported groups, and all reason fields", () => {
  const item = app({
    name: "Review Example",
    bundleId: "com.example.review",
    developer: "Review Developer",
    memo: "Keep for annual reports",
    tags: ["Accounting"],
    auditGroups: ["updateMaintenance"],
    securityReasons: ["invalidSignature"],
    managementReasons: ["subscriptionApp"],
    updateHealthStatus: "repeatedFailure",
    updateHealthReasons: ["updateSourceUnavailable"],
    updateHealthSource: "Homebrew",
    updateHealthSourceIdentity: "homebrew-cask-fixture",
  });
  for (const query of [
    "review example",
    "COM.EXAMPLE.REVIEW",
    "review developer",
    "annual reports",
    "accounting",
    "updateMaintenance",
    "invalid signature",
    "subscription app",
    "repeated failure",
    "update source unavailable",
    "Homebrew",
    "homebrew-cask-fixture",
    "Update Sources",
  ]) {
    assert.deepEqual(filterReviewApps([item], { query }), [item], query);
  }
  assert.deepEqual(filterReviewApps([item], { query: "not-present" }), []);
  assert.deepEqual(filterReviewApps([item], { query: "  " }), [item]);
});

test("results sort without changing the supplied array or app fields", () => {
  const zulu = app({
    id: "zulu",
    name: "Zulu",
    securityReasons: ["unsignedApp"],
  });
  const alpha = app({
    id: "alpha",
    name: "Alpha",
    managementReasons: ["largeApp"],
  });
  const apps = [zulu, alpha];
  const before = structuredClone(apps);
  assert.deepEqual(filterReviewApps(apps), [alpha, zulu]);
  assert.deepEqual(apps, before);
});

test("review search matches the full reason labels displayed to the user", () => {
  const cases = [
    [
      app({
        updateHealthStatus: "suspectedEnded",
        updateHealthReasons: ["suspectedUpdateEnded"],
      }),
      "Update support may have ended",
    ],
    [
      app({
        updateHealthStatus: "repeatedFailure",
        updateHealthReasons: ["updateSourceRepeatedFailure"],
      }),
      "Update source checks failed repeatedly",
    ],
    [
      app({
        updateHealthStatus: "stale",
        updateHealthReasons: ["updateCheckStale"],
      }),
      "Update check is stale",
    ],
    [
      app({ managementReasons: ["previouslyDeletedBundleIDMatch"] }),
      "Matches a previously deleted app",
    ],
  ];
  for (const [item, query] of cases) {
    assert.deepEqual(filterReviewApps([item], { query }), [item], query);
  }
});

test("inactive source reasons, status, and identity cannot create review search matches", () => {
  for (const updateHealthStatus of [
    null,
    "healthy",
    "unknown",
    "futureHealthState",
  ]) {
    const item = app({
      securityReasons: ["unsignedApp"],
      updateHealthStatus,
      updateHealthReasons: ["updateSourceUnavailable"],
      updateHealthSource: "historical-source",
      updateHealthSourceIdentity: "historical-source-identity",
    });
    assert.deepEqual(filterReviewApps([item]), [item]);
    for (const query of [
      "updateSourceUnavailable",
      "Update source is unavailable",
      "update source unavailable",
      "historical-source",
      "historical-source-identity",
      ...(updateHealthStatus ? [updateHealthStatus] : []),
    ]) {
      assert.deepEqual(filterReviewApps([item], { query }), [], query);
    }
  }
});

test("audit filtering never changes visibility or action policy for any data state", () => {
  const item = app({
    securityReasons: ["invalidSignature"],
    isSkipped: true,
    hasAnySkippedVersion: true,
  });
  for (const status of [
    "ready",
    "stale",
    "missing",
    "malformed",
    "permissionDenied",
  ]) {
    const state = context([item], status);
    const before = resolveAppActions(item, state);
    const visible = isUpdatableApp(item);
    assert.deepEqual(filterReviewApps([item]), [item]);
    assert.deepEqual(resolveAppActions(item, state), before);
    assert.equal(isUpdatableApp(item), visible);
    if (status !== "ready") assert.equal(before.update.kind, "review");
  }
});

test("unknown and refresh-required update actions may be reviewed without execution authority", () => {
  for (const primaryActionKind of ["refreshRequired", "futureAction"]) {
    const item = app({
      primaryActionKind,
      isVisibleInUpdates: false,
      managementReasons: ["homebrewAdoptionAvailable"],
    });
    assert.deepEqual(filterReviewApps([item]), [item]);
    assert.equal(
      resolveAppActions(item, context([item])).update.kind,
      "review",
    );
    assert.equal(isUpdatableApp(item), false);
  }
});

test("update-only review scope is independent of category and search", () => {
  const updating = app({
    id: "updating",
    name: "Alpha",
    securityReasons: ["unsignedApp"],
    managementReasons: ["largeApp"],
  });
  const notUpdating = app({
    id: "not-updating",
    name: "Beta",
    isVisibleInUpdates: false,
    securityReasons: ["unsignedApp"],
  });
  const hiddenSkip = app({
    id: "skipped",
    currentTargetSkipped: true,
    securityReasons: ["unsignedApp"],
  });
  const apps = [notUpdating, updating, hiddenSkip];
  assert.equal(
    filterReviewApps(apps, { scope: "all", category: "security" }).length,
    3,
  );
  assert.deepEqual(
    filterReviewApps(apps, { scope: "updates", category: "security" }),
    [updating],
  );
  assert.deepEqual(
    filterReviewApps(apps, {
      scope: "updates",
      category: "management",
      query: "large app",
    }),
    [updating],
  );
  assert.deepEqual(
    filterReviewApps(apps, {
      scope: "updates",
      category: "security",
      query: "Beta",
    }),
    [],
  );
  assert.deepEqual(
    filterReviewApps(apps, {
      scope: "all",
      category: "security",
      query: "Beta",
    }),
    [notUpdating],
  );
});

test("unknown review reason keys never inherit Object prototype labels", () => {
  for (const reason of ["__proto__", "constructor", "toString"]) {
    const item = app({ securityReasons: [reason] });
    assert.deepEqual(filterReviewApps([item], { query: reason }), [item]);
    assert.deepEqual(filterReviewApps([item], { query: "native code" }), []);
    assert.deepEqual(filterReviewApps([item], { query: "object Object" }), []);
  }
});
