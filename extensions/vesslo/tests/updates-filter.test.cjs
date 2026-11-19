const test = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { filterUpdates } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/updates-filter"),
);
const fixture = require("./fixtures/current-app.json");
const { schema2Data, uuid } = require("./schema2-test-data.cjs");
function app(id, overrides = {}) {
  return {
    ...fixture,
    id: uuid(id),
    homebrewCask: id.toLowerCase(),
    name: id,
    bundleId: `com.fixture.${id}`,
    path: `/Applications/${id}.app`,
    ...overrides,
  };
}
function context(apps, status = "ready") {
  return {
    status,
    data: schema2Data(apps),
    pathAvailability: Object.fromEntries(
      apps.map((app) => [app.path, "available"]),
    ),
  };
}
test("update source filtering uses the approved route and keeps review actions separate", () => {
  const brew = app("Brew");
  const sparkle = app("Sparkle", {
    sources: ["Sparkle"],
    primaryActionKind: "runSparkle",
    eligibilityKind: "executableUpdate.sparkle",
  });
  const review = app("Recheck", {
    primaryActionKind: "refreshRequired",
    eligibilityKind: "refreshRequired",
  });
  const hidden = app("Hidden", { isVisibleInUpdates: false });
  const apps = [brew, sparkle, review, hidden];
  assert.deepEqual(filterUpdates(apps, context(apps), { filter: "homebrew" }), [
    brew,
  ]);
  assert.deepEqual(filterUpdates(apps, context(apps), { filter: "sparkle" }), [
    sparkle,
  ]);
  assert.deepEqual(filterUpdates(apps, context(apps), { filter: "review" }), [
    review,
  ]);
  assert.equal(filterUpdates(apps, context(apps)).length, 3);
});
test("Needs Review reflects stale and unavailable path policy without granting execution", () => {
  const available = app("Available");
  const unavailable = app("Unavailable");
  const apps = [available, unavailable];
  const ready = context(apps);
  ready.pathAvailability[unavailable.path] = "missing";
  assert.deepEqual(filterUpdates(apps, ready, { filter: "review" }), [
    unavailable,
  ]);
  assert.deepEqual(
    filterUpdates(apps, context(apps, "stale"), { filter: "review" }),
    apps,
  );
});
test("query, source, and sorting compose without mutating the inventory", () => {
  const zulu = app("Zulu", {
    developer: "Alpha Studio",
    homebrewCask: "target-cask",
  });
  const alpha = app("Alpha", { developer: "Zulu Studio" });
  const deleted = app("Deleted", {
    isDeleted: true,
    isVisibleInUpdates: false,
  });
  const apps = [zulu, alpha, deleted];
  const snapshot = structuredClone(apps);
  assert.deepEqual(
    filterUpdates(apps, context(apps), {
      filter: "homebrew",
      query: "target-cask",
    }),
    [zulu],
  );
  assert.deepEqual(
    filterUpdates(apps, context(apps), { query: "com.fixture.alpha" }),
    [alpha],
  );
  assert.deepEqual(filterUpdates(apps, context(apps), { sortBy: "name" }), [
    alpha,
    zulu,
  ]);
  assert.deepEqual(filterUpdates(apps, context(apps), { sortBy: "nameDesc" }), [
    zulu,
    alpha,
  ]);
  assert.deepEqual(
    filterUpdates(apps, context(apps), { sortBy: "developer" }),
    [zulu, alpha],
  );
  assert.deepEqual(apps, snapshot);
});

test("Needs Review includes visible rows from legacy and incomplete-check snapshots without losing source filters", () => {
  const brew = app("Brew");
  const sparkle = app("Sparkle", {
    sources: ["Sparkle"],
    primaryActionKind: "runSparkle",
    eligibilityKind: "executableUpdate.sparkle",
  });
  const apps = [brew, sparkle];
  for (const change of [
    { schemaVersion: undefined },
    { checkPhase: "unverified" },
    { checkPhase: "checking" },
    { checkPhase: "failed" },
    { completedCheckRevision: 10 },
    { capabilities: [] },
  ]) {
    const ctx = context(apps);
    Object.assign(ctx.data, change);
    assert.deepEqual(
      filterUpdates(apps, ctx, { filter: "review" }),
      apps,
      JSON.stringify(change),
    );
    assert.deepEqual(filterUpdates(apps, ctx, { filter: "homebrew" }), [brew]);
    assert.deepEqual(filterUpdates(apps, ctx, { filter: "sparkle" }), [
      sparkle,
    ]);
  }
});
