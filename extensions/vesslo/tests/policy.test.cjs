const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const build = process.env.VESSLO_TEST_BUILD;
if (!build)
  throw new Error("Run npm test to compile the consumer test modules.");
const { classifyExportContract, installedApps } = require(
  path.join(build, "utils/app-policy"),
);
const { isUpdatableApp, updateRouteGroup, isHomebrewUpdateCandidate } = require(
  path.join(build, "utils/update-filter"),
);
const { resolveAppActions, resolveBulkAction } = require(
  path.join(build, "utils/action-policy"),
);
const { homebrewSelectionDriftReason } = require(
  path.join(build, "utils/action-policy"),
);
const { parseVessloData } = require(path.join(build, "utils/data"));
const { schema3Fixture } = require("./helpers/readiness-fixture.cjs");
const fixture = require("./fixtures/current-app.json");

const { schema2Data, uuid } = require("./schema2-test-data.cjs");
function app(overrides = {}) {
  return { ...fixture, id: uuid("base"), ...overrides };
}
function context(apps, overrides = {}) {
  return {
    status: "ready",
    data: schema2Data(apps),
    pathAvailability: Object.fromEntries(
      apps.map((item) => [item.path, "available"]),
    ),
    ...overrides,
  };
}
function resolve(item, overrides = {}) {
  return resolveAppActions(item, context([item], overrides));
}

function readinessContext() {
  const raw = schema3Fixture();
  const now = Date.now();
  raw.exportedAt = new Date(now).toISOString();
  raw.lastUpdateCheckAt = raw.exportedAt;
  raw.checkPhase = "failed";
  raw.checkReason = "sourceFailure";
  delete raw.checkedInventoryRevision;
  raw.homebrewReadiness.forEach((entry) => {
    entry.checkedAt = raw.lastUpdateCheckAt;
    entry.expiresAt = new Date(now + 900_000).toISOString();
  });
  const data = parseVessloData(JSON.stringify(raw));
  return context(data.apps, { data });
}

test("schema 3 sourceFailure permits only Homebrew targets with current positive evidence", () => {
  const ctx = readinessContext();
  const [brew] = ctx.data.apps;
  assert.equal(resolveAppActions(brew, ctx).update.kind, "homebrewReview");
  assert.equal(resolveBulkAction(ctx.data.apps, ctx).canSelect, true);
  assert.equal(ctx.data.checkPhase, "failed");
  assert.equal(ctx.data.checkReason, "sourceFailure");

  for (const [primaryActionKind, eligibilityKind, source] of [
    ["runSparkle", "executableUpdate.sparkle", "Sparkle"],
    ["runAppStore", "executableUpdate.appStore", "App Store"],
    ["openAppStore", "appStoreManualUpdate", "App Store"],
    ["openInstaller", "manualInstallerUpdate", "Manual"],
  ]) {
    const item = {
      ...brew,
      primaryActionKind,
      eligibilityKind,
      sources: [source],
      appStoreId: "123456",
    };
    const other = {
      ...ctx,
      data: { ...ctx.data, apps: [item], updateCount: 1 },
    };
    assert.equal(
      resolveAppActions(item, other).update.kind,
      "review",
      primaryActionKind,
    );
  }
});

test("schema 3 proof and cohort omissions never regain V1 or global-ready authority", () => {
  for (const change of [
    (data) => {
      data.homebrewReadiness = [];
    },
    (data) => {
      data.homebrewReadiness[0].state = "failed";
      data.homebrewReadiness[0].reason = "sourceFailed";
    },
    (data) => {
      data.homebrewReadiness[0].state = "unverified";
      data.homebrewReadiness[0].reason = "sourceUnverified";
    },
    (data) => {
      data.homebrewReadiness[0].expiresAt = new Date(
        Date.now() - 1,
      ).toISOString();
    },
    (data) => {
      data.completedInventoryRevision += 1;
    },
    (data) => {
      data.completedCheckRevision -= 1;
    },
    (data) => {
      data.capabilities = ["homebrewReviewV1", "requestReceiptsV1"];
    },
  ]) {
    for (const phase of ["ready", "failed"]) {
      const ctx = readinessContext();
      ctx.data.checkPhase = phase;
      if (phase === "ready") {
        ctx.data.checkedInventoryRevision = ctx.data.inventoryRevision;
        delete ctx.data.checkReason;
      }
      change(ctx.data);
      assert.equal(
        resolveAppActions(ctx.data.apps[0], ctx).update.kind,
        "review",
      );
    }
  }
});

test("bulk selection tracks selected proof identity and expiry without invalidating unrelated source changes", () => {
  const ctx = readinessContext();
  const selected = [ctx.data.apps[0]];
  const now = Date.parse(ctx.data.lastUpdateCheckAt);
  const changed = structuredClone(ctx.data);
  changed.homebrewReadiness[1].state = "failed";
  changed.homebrewReadiness[1].reason = "sourceFailed";
  assert.equal(
    homebrewSelectionDriftReason(
      ctx.data,
      changed,
      selected,
      ctx.pathAvailability,
      now,
    ),
    null,
  );
  const globallyRecovered = structuredClone(ctx.data);
  globallyRecovered.checkPhase = "ready";
  globallyRecovered.checkedInventoryRevision =
    globallyRecovered.inventoryRevision;
  delete globallyRecovered.checkReason;
  globallyRecovered.capabilities.reverse();
  assert.equal(
    homebrewSelectionDriftReason(
      ctx.data,
      globallyRecovered,
      selected,
      ctx.pathAvailability,
      now,
    ),
    null,
  );
  const shortenedProof = structuredClone(ctx.data);
  shortenedProof.homebrewReadiness[0].expiresAt = new Date(
    now + 899_000,
  ).toISOString();
  assert.match(
    homebrewSelectionDriftReason(
      ctx.data,
      shortenedProof,
      selected,
      ctx.pathAvailability,
      now,
    ),
    /proof changed/,
  );
  changed.homebrewReadiness[0].evidenceId = uuid("replacement-proof");
  assert.match(
    homebrewSelectionDriftReason(
      ctx.data,
      changed,
      selected,
      ctx.pathAvailability,
      now,
    ),
    /proof changed/,
  );
  assert.match(
    homebrewSelectionDriftReason(
      ctx.data,
      ctx.data,
      selected,
      ctx.pathAvailability,
      now + 900_000,
    ),
    /expired/,
  );

  for (const change of [
    (data) => {
      data.schemaVersion = 2;
    },
    (data) => {
      data.capabilities = data.capabilities.slice(1);
    },
    (data) => {
      data.completedInventoryRevision += 1;
    },
    (data) => {
      data.inventoryRevision += 1;
    },
    (data) => {
      data.checkRevision += 1;
    },
    (data) => {
      data.apps[0].targetVersion = "99.0";
    },
  ]) {
    const current = structuredClone(ctx.data);
    change(current);
    assert.ok(
      homebrewSelectionDriftReason(
        ctx.data,
        current,
        selected,
        ctx.pathAvailability,
        now,
      ),
    );
  }
});

// These fixtures cover the Swift export boundary, not Raycast UI rendering.
test("historical skips never override current visibility truth", () => {
  const item = app({
    isSkipped: true,
    hasAnySkippedVersion: true,
    currentTargetSkipped: false,
  });
  assert.equal(isUpdatableApp(item), true);
  assert.equal(resolve(item).update.kind, "homebrewReview");
});

test("a current target skip, ignored flag, or deleted record hides the update", () => {
  for (const flags of [
    { currentTargetSkipped: true },
    { isIgnored: true },
    { isDeleted: true },
  ]) {
    const item = app(flags);
    assert.equal(isUpdatableApp(item), false);
    assert.equal(
      ["handoff", "homebrewReview", "openAppStore"].includes(
        resolve(item).update.kind,
      ),
      false,
    );
  }
});

test("explicit false visibility cannot fall back to target version or source", () => {
  const item = app({ isVisibleInUpdates: false });
  assert.equal(isUpdatableApp(item), false);
  assert.equal(resolve(item).update.kind, "none");
});

test("current export may omit newer skip metadata without reusing broad skip", () => {
  const raw = { ...fixture };
  delete raw.currentTargetSkipped;
  delete raw.hasAnySkippedVersion;
  assert.equal(classifyExportContract(raw), "current");
  const item = app({
    currentTargetSkipped: null,
    hasAnySkippedVersion: null,
    isSkipped: true,
  });
  assert.equal(isUpdatableApp(item), true);
});

test("only wholly absent contract fields qualify for legacy fallback", () => {
  assert.equal(
    classifyExportContract({ targetVersion: "2.0", isSkipped: false }),
    "legacy",
  );
  assert.equal(
    classifyExportContract({ isVisibleInUpdates: true }),
    "unsupported",
  );
  assert.equal(
    classifyExportContract({ primaryActionKind: "runBrew" }),
    "unsupported",
  );
  assert.equal(
    classifyExportContract({ currentTargetSkipped: false }),
    "unsupported",
  );
  assert.equal(
    classifyExportContract({ ...fixture, currentTargetSkipped: "false" }),
    "unsupported",
  );
  assert.equal(
    classifyExportContract({ ...fixture, isVisibleInUpdates: "true" }),
    "unsupported",
  );
  assert.equal(
    classifyExportContract({ ...fixture, primaryActionKind: null }),
    "unsupported",
  );
});

test("legacy visibility is conservative and never grants execution authority", () => {
  const item = app({
    exportContract: "legacy",
    isVisibleInUpdates: null,
    eligibilityKind: null,
    primaryActionKind: null,
    currentTargetSkipped: null,
    hasAnySkippedVersion: null,
  });
  assert.equal(isUpdatableApp(item), true);
  assert.equal(resolve(item).update.kind, "review");
  assert.equal(isUpdatableApp({ ...item, isSkipped: true }), false);
  assert.equal(isUpdatableApp({ ...item, targetVersion: "undefined" }), false);
  assert.equal(isUpdatableApp({ ...item, targetVersion: " " }), false);
});

test("partial current contracts preserve explicit review visibility but cannot execute", () => {
  const item = app({ exportContract: "unsupported", primaryActionKind: null });
  assert.equal(isUpdatableApp(item), true);
  assert.equal(resolve(item).update.kind, "review");
  assert.equal(isUpdatableApp({ ...item, isVisibleInUpdates: null }), false);
});

test("unknown and nonexecutable actions use a review route", () => {
  for (const primaryActionKind of [
    "refreshRequired",
    "adoptAndUpdate",
    "none",
    "runFutureInstaller",
    null,
  ]) {
    const item = app({ primaryActionKind });
    const policy = resolve(item);
    assert.equal(policy.update.kind, "review", primaryActionKind);
    assert.equal(updateRouteGroup(item), "review", primaryActionKind);
    assert.equal(isHomebrewUpdateCandidate(item), false, primaryActionKind);
  }
});

test("only exact current action and eligibility pairs allow Vesslo handoff", () => {
  const allowed = [
    ["runBrew", "executableUpdate.homebrew", "homebrew", "Brew"],
    ["runSparkle", "executableUpdate.sparkle", "sparkle", "Sparkle"],
    ["runAppStore", "executableUpdate.appStore", "appStore", "App Store"],
    ["openInstaller", "manualInstallerUpdate", "manual", "Manual"],
  ];
  for (const [primaryActionKind, eligibilityKind, route, source] of allowed) {
    const item = app({ primaryActionKind, eligibilityKind, sources: [source] });
    assert.deepEqual(
      resolve(item).update,
      route === "homebrew"
        ? { kind: "homebrewReview" }
        : { kind: "handoff", route, bundleId: item.bundleId },
    );
    assert.equal(
      resolve({ ...item, eligibilityKind: `${eligibilityKind}.future` }).update
        .kind,
      "review",
    );
  }
});

test("warnings and historical skips never change current authority", () => {
  const base = app();
  const decorated = app({
    isSkipped: true,
    hasAnySkippedVersion: true,
    auditGroups: ["security", "management"],
    securityReasons: ["unsignedBinary"],
    managementReasons: ["adoptionAvailable"],
    updateHealthStatus: "degraded",
    updateHealthReasons: ["failedCheck"],
  });
  assert.deepEqual(resolve(decorated), resolve(base));
});

test("invalid cask proof and App Store IDs fail closed without shell execution", () => {
  assert.equal(
    resolve(app({ homebrewCask: "fixture;echo bad" })).update.kind,
    "review",
  );
  for (const appStoreId of ["123x", "-1", "1;echo bad", null, ""]) {
    const item = app({
      primaryActionKind: "runAppStore",
      eligibilityKind: "executableUpdate.appStore",
      sources: ["App Store"],
      appStoreId,
    });
    assert.equal(resolve(item).update.kind, "review");
  }
});

test("openAppStore grants browsing only with the manual eligibility pair and numeric ID", () => {
  const item = app({
    primaryActionKind: "openAppStore",
    eligibilityKind: "appStoreManualUpdate",
    sources: ["App Store"],
  });
  assert.deepEqual(resolve(item).update, {
    kind: "openAppStore",
    url: "macappstore://apps.apple.com/app/id123456789",
  });
  assert.equal(
    resolve({ ...item, appStoreId: "123/other" }).update.kind,
    "review",
  );
  assert.equal(
    resolve({ ...item, eligibilityKind: "executableUpdate.appStore" }).update
      .kind,
    "review",
  );
  assert.equal(resolve(item, { status: "stale" }).update.kind, "review");
});

test("all unavailable data states retain update truth but disable path and update actions", () => {
  for (const status of [
    "loading",
    "stale",
    "missing",
    "malformed",
    "contractMismatch",
    "permissionDenied",
    "ioError",
    "futureState",
  ]) {
    const policy = resolve(app(), { status });
    assert.equal(policy.visibleInUpdates, true, status);
    assert.equal(policy.canOpenApp, false, status);
    assert.equal(policy.canShowInFinder, false, status);
    assert.equal(policy.update.kind, "review", status);
  }
});

test("missing, denied, unknown and nonabsolute paths cannot open, reveal, or handoff", () => {
  for (const availability of ["missing", "permissionDenied", "unknown"]) {
    const item = app();
    const policy = resolve(item, {
      pathAvailability: { [item.path]: availability },
    });
    assert.equal(policy.canOpenApp, false);
    assert.equal(policy.canShowInFinder, false);
    assert.equal(policy.update.kind, "review");
  }
  for (const appPath of [
    "Applications/Fixture.app",
    "",
    "/Applications/Fixture\0.app",
  ]) {
    const policy = resolve(app({ path: appPath }));
    assert.equal(policy.canOpenApp, false);
    assert.equal(policy.canShowInFinder, false);
    assert.equal(policy.update.kind, "review");
  }
});

test("deleted records remain stored but are excluded from installed listing and tag aggregation", () => {
  const live = app();
  const deleted = app({
    id: "deleted",
    isDeleted: true,
    tags: ["DeletedOnly"],
  });
  const source = [live, deleted];
  const visible = installedApps(source);
  assert.deepEqual(visible, [live]);
  assert.deepEqual(
    visible.flatMap((item) => item.tags),
    ["Work"],
  );
  assert.equal(source.length, 2);
  const policy = resolve(deleted);
  assert.equal(policy.canOpenApp, false);
  assert.equal(policy.canShowInFinder, false);
  assert.equal(policy.update.kind, "review");
});

test("Homebrew review uses exact installation identity and rejects repeated casks rather than duplicate Bundle IDs", () => {
  const item = app();
  const duplicate = app({
    id: uuid("other-installation"),
    path: "/Applications/Other.app",
  });
  assert.equal(
    resolveAppActions(item, context([item, duplicate])).update.kind,
    "review",
  );
  assert.equal(
    resolveAppActions(
      item,
      context([
        item,
        { ...duplicate, isDeleted: true, isVisibleInUpdates: false },
      ]),
    ).update.kind,
    "homebrewReview",
  );
  const differentCask = { ...duplicate, homebrewCask: "other-fixture" };
  const exact = resolveAppActions(item, context([item, differentCask]));
  assert.equal(exact.update.kind, "homebrewReview");
  assert.equal(exact.navigationBundleId, null);
  assert.equal(
    resolveAppActions(differentCask, context([item, differentCask])).update
      .kind,
    "homebrewReview",
  );
  assert.equal(resolve(item, { data: null }).update.kind, "review");
  assert.equal(resolve(app({ bundleId: null })).update.kind, "review");
  assert.equal(
    resolveAppActions(item, context([duplicate])).update.kind,
    "review",
  );
});

test("Bundle ID update routes still require a unique installed target", () => {
  const item = app({
    primaryActionKind: "runSparkle",
    eligibilityKind: "executableUpdate.sparkle",
    sources: ["Sparkle"],
  });
  const duplicate = {
    ...item,
    id: uuid("sparkle-duplicate"),
    path: "/Applications/Other.app",
  };
  const policy = resolveAppActions(item, context([item, duplicate]));
  assert.equal(policy.update.kind, "review");
  assert.match(policy.update.reason, /unique installed app/);
  assert.equal(resolve(item).update.kind, "handoff");
});

test("bulk lists Homebrew candidates and enables exact selection only from a checked snapshot", () => {
  const brew = app();
  const review = app({ id: "refresh", primaryActionKind: "refreshRequired" });
  const sparkle = app({
    id: "sparkle",
    primaryActionKind: "runSparkle",
    eligibilityKind: "executableUpdate.sparkle",
    sources: ["Sparkle"],
  });
  const apps = [brew, review, sparkle];
  const ready = resolveBulkAction(apps, context(apps));
  assert.equal(ready.kind, "review");
  assert.equal(ready.canSelect, true);
  assert.deepEqual(ready.candidates, [brew]);
  assert.equal(updateRouteGroup(brew), "homebrew");
  const stale = resolveBulkAction(
    apps,
    context(apps, { status: "stale", pathAvailability: {} }),
  );
  assert.equal(stale.kind, "review");
  assert.equal(stale.canSelect, false);
  assert.deepEqual(stale.candidates, [brew]);
  assert.equal(
    resolveAppActions(brew, context(apps, { status: "stale" })).update.kind,
    "review",
  );
});

test("legacy exports and incomplete schema 2 check snapshots never grant any update route", () => {
  const routes = [
    ["runBrew", "executableUpdate.homebrew", "Brew"],
    ["runSparkle", "executableUpdate.sparkle", "Sparkle"],
    ["runAppStore", "executableUpdate.appStore", "App Store"],
    ["openInstaller", "manualInstallerUpdate", "Manual"],
    ["openAppStore", "appStoreManualUpdate", "App Store"],
  ];
  const metadataChanges = [
    { schemaVersion: undefined },
    { checkPhase: "unverified" },
    { checkPhase: "checking" },
    { checkPhase: "failed" },
    { checkedInventoryRevision: 41 },
    { completedCheckRevision: 10 },
    { capabilities: ["homebrewReviewV1"] },
    { lastUpdateCheckAt: "2020-01-01T00:00:00Z" },
  ];
  for (const [primaryActionKind, eligibilityKind, source] of routes) {
    const item = app({ primaryActionKind, eligibilityKind, sources: [source] });
    assert.equal(
      ["handoff", "homebrewReview", "openAppStore"].includes(
        resolve(item).update.kind,
      ),
      true,
    );
    for (const change of metadataChanges) {
      const ctx = context([item]);
      Object.assign(ctx.data, change);
      const policy = resolveAppActions(item, ctx);
      assert.equal(
        policy.update.kind,
        "review",
        `${primaryActionKind}: ${JSON.stringify(change)}`,
      );
      assert.equal(policy.canOpenApp, true);
      assert.equal(policy.canShowInFinder, true);
      assert.equal(resolveBulkAction([item], ctx).canSelect, false);
    }
  }
});

test("action and source mismatches cannot fall back to a generic update route", () => {
  const candidates = [
    ["runSparkle", "executableUpdate.sparkle", "Sparkle"],
    ["runAppStore", "executableUpdate.appStore", "App Store"],
    ["openAppStore", "appStoreManualUpdate", "App Store"],
    ["openInstaller", "manualInstallerUpdate", "Manual"],
  ];
  for (const [
    primaryActionKind,
    eligibilityKind,
    requiredSource,
  ] of candidates) {
    const item = app({
      primaryActionKind,
      eligibilityKind,
      sources: [requiredSource],
    });
    assert.equal(
      ["handoff", "openAppStore"].includes(resolve(item).update.kind),
      true,
    );
    for (const sources of [
      [],
      ["Future"],
      [` ${requiredSource}`],
      [requiredSource.toLowerCase()],
    ]) {
      const policy = resolve({ ...item, sources });
      assert.equal(policy.update.kind, "review");
      assert.match(policy.update.reason, /source do not match/);
    }
  }
  const brewInstaller = app({
    primaryActionKind: "openInstaller",
    eligibilityKind: "manualInstallerUpdate",
    sources: ["Brew"],
  });
  assert.equal(resolve(brewInstaller).update.kind, "review");
  assert.match(resolve(brewInstaller).update.reason, /Homebrew installer/);
});

test("hidden review candidates retain an explicit review action in Search and Tag", () => {
  for (const primaryActionKind of [
    "refreshRequired",
    "adoptAndUpdate",
    "futureAction",
    null,
  ]) {
    const item = app({ isVisibleInUpdates: false, primaryActionKind });
    assert.equal(resolve(item).visibleInUpdates, false);
    assert.equal(resolve(item).update.kind, "review", primaryActionKind);
  }
  assert.equal(
    resolve(
      app({
        isVisibleInUpdates: false,
        primaryActionKind: "none",
        eligibilityKind: "none",
      }),
    ).update.kind,
    "none",
  );
});

test("path review reasons remain available even when no update is visible", () => {
  const item = app({
    isVisibleInUpdates: false,
    primaryActionKind: "none",
    eligibilityKind: "none",
  });
  for (const availability of ["missing", "permissionDenied", "unknown"]) {
    const policy = resolve(item, {
      pathAvailability: { [item.path]: availability },
    });
    assert.equal(policy.update.kind, "none");
    assert.match(policy.reviewReason, /path is unavailable or unverified/);
    assert.equal(policy.canOpenApp, false);
  }
  assert.equal(resolve(item).reviewReason, null);
});

test("detail navigation never chooses an ambiguous or deleted Bundle ID target", () => {
  const item = app();
  const duplicate = app({ id: "other", path: "/Applications/Other.app" });
  assert.equal(resolve(item).navigationBundleId, item.bundleId);
  assert.equal(
    resolveAppActions(item, context([item, duplicate])).navigationBundleId,
    null,
  );
  assert.equal(
    resolveAppActions(item, context([item, { ...duplicate, isDeleted: true }]))
      .navigationBundleId,
    item.bundleId,
  );
  assert.equal(resolve({ ...item, isDeleted: true }).navigationBundleId, null);
});

test("count disagreement and unverifiable current counts never grant update handoff", () => {
  const item = app();
  for (const updateCount of [0, 2, null]) {
    const ctx = context([item]);
    ctx.data.updateCount = updateCount;
    const action = resolveAppActions(item, ctx).update;
    assert.equal(action.kind, "review");
    assert.match(action.reason, /count|reports/);
    assert.match(resolveBulkAction([item], ctx).reason, /count|reports/);
  }
  const legacy = app({
    id: "legacy",
    isVisibleInUpdates: null,
    exportContract: "legacy",
  });
  const mixed = context([item, legacy]);
  assert.equal(resolveAppActions(item, mixed).update.kind, "review");
  assert.match(resolveBulkAction([item], mixed).reason, /Legacy or incomplete/);
});
