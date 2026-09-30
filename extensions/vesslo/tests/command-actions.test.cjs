const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const Module = require("node:module");
const realLoad = Module._load;
const React = require("react");
const { parseVessloData } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data.js"),
);
const { schema2Data, uuid } = require("./schema2-test-data.cjs");
const {
  schema3Fixture,
  receiptV2Fixture,
} = require("./helpers/readiness-fixture.cjs");
const appID = uuid("command-app");
let currentState;
let initialStates = [];
let stateIndex = 0;
let stateChanges = [];
let refreshCount = 0;
const api = {
  Icon: new Proxy({}, { get: (_, key) => key }),
  Color: new Proxy({}, { get: (_, key) => key }),
  Detail: "Detail",
  List: Object.assign("List", {}),
};
api.List = Object.assign((props) => React.createElement("List", props), {
  Item: Object.assign("List.Item", {}),
  Section: "List.Section",
  EmptyView: "List.EmptyView",
  Dropdown: Object.assign((props) => props.children, {
    Item: "List.Dropdown.Item",
  }),
});
api.List.Item = Object.assign(
  (props) => React.createElement("List.Item", props),
  { Detail: "List.Item.Detail" },
);
api.Action = Object.assign((props) => React.createElement("Action", props), {
  Push: "Action.Push",
  CopyToClipboard: "Action.CopyToClipboard",
});
api.ActionPanel = Object.assign((props) => props.children, {
  Section: "ActionPanel.Section",
  Submenu: "ActionPanel.Submenu",
});
api.useNavigation = () => ({ push: () => {}, pop: () => {} });
api.Toast = { Style: { Success: "success", Failure: "failure" } };
Module._load = function (request, parent, isMain) {
  if (request === "@raycast/api") return api;
  if (request === "react")
    return {
      ...React,
      useMemo: (f) => f(),
      useState: (value) => {
        const index = stateIndex++;
        return [
          initialStates[index] ?? value,
          (next) => stateChanges.push([index, next]),
        ];
      },
    };
  if (request.endsWith("/utils/useVessloData"))
    return {
      useVessloData: () => ({
        data: currentState.data,
        state: currentState,
        isLoading: false,
        refresh: async () => {
          refreshCount++;
          return currentState;
        },
      }),
    };
  return realLoad.apply(this, arguments);
};
const commands = [
  "search-apps",
  "updates",
  "browse-by-tag",
  "bulk-homebrew-update",
  "review-apps",
  "deleted-apps",
].map((name) => [
  name,
  require(join(process.env.VESSLO_TEST_BUILD, `${name}.js`)).default,
]);
Module._load = realLoad;
function fixture(overrides = {}) {
  const data = parseVessloData(
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      updateCount: overrides.isVisibleInUpdates === false ? 0 : 1,
      apps: [
        {
          id: appID,
          version: "1.0",
          targetVersion: "2.0",
          sources: ["Brew"],
          name: "Example",
          path: "/Applications/Example.app",
          bundleId: "com.example.app",
          tags: ["Work"],
          securityReasons: ["unsignedApp"],
          isVisibleInUpdates: true,
          primaryActionKind: "runBrew",
          eligibilityKind: "executableUpdate.homebrew",
          homebrewCask: "example",
          currentTargetSkipped: false,
          hasAnySkippedVersion: false,
          ...overrides,
        },
      ],
    }),
  );
  return {
    status: "ready",
    data: schema2Data(data.apps),
    pathAvailability: { "/Applications/Example.app": "available" },
    reason: null,
    checkedAt: Date.now(),
  };
}
function readinessFixture() {
  const raw = schema3Fixture();
  const now = Date.now();
  raw.exportedAt = new Date(now).toISOString();
  raw.lastUpdateCheckAt = raw.exportedAt;
  raw.checkPhase = "failed";
  raw.checkReason = "sourceFailure";
  delete raw.checkedInventoryRevision;
  raw.homebrewReadiness.forEach((evidence) => {
    evidence.checkedAt = raw.lastUpdateCheckAt;
    evidence.expiresAt = new Date(now + 900_000).toISOString();
  });
  const data = parseVessloData(JSON.stringify(raw));
  return {
    status: "ready",
    data,
    pathAvailability: Object.fromEntries(
      data.apps.map((app) => [app.path, "available"]),
    ),
    reason: null,
    checkedAt: now,
  };
}
function collect(node, type, output = [], followPushTargets = true) {
  if (node == null || typeof node !== "object") return output;
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, type, output, followPushTargets));
    return output;
  }
  if (typeof node.type === "function")
    return collect(node.type(node.props), type, output, followPushTargets);
  if (
    node.type === type ||
    (type === "AnyAction" && ["Action", "Action.Push"].includes(node.type))
  )
    output.push(node.props);
  collect(node.props?.children, type, output, followPushTargets);
  if (
    node.type === "Action.Push" &&
    followPushTargets &&
    node.props.target?.type?.name === "TaggedApps"
  )
    collect(node.props.target, type, output, followPushTargets);
  if (node.type === "List.Item")
    collect(node.props.actions, type, output, followPushTargets);
  if (node.type === "List")
    collect(node.props.searchBarAccessory, type, output, followPushTargets);
  return output;
}
function appActions(Command) {
  const rows = collect(React.createElement(Command), "List.Item");
  const row = rows.find((item) => item.id === appID);
  return row
    ? collect(row.actions, "AnyAction", [], false).map((action) => action.title)
    : [];
}

test("the original four commands render the same primary per-app update action", () => {
  currentState = fixture();
  for (const [name, Command] of commands.slice(0, 4)) {
    const actions = appActions(Command);
    assert.equal(
      actions[0],
      name === "bulk-homebrew-update"
        ? "Select for Review"
        : "Review Homebrew Update in Vesslo",
      name,
    );
    assert.ok(actions.includes("Open App"), name);
    assert.ok(actions.includes("Show in Finder"), name);
    assert.ok(
      actions.every((title) => !/Direct|Terminal|Quick Update/.test(title)),
      name,
    );
  }
});
test("all five commands retain stale rows with review actions and visible status", () => {
  currentState = fixture();
  currentState.status = "missing";
  for (const [name, Command] of commands.slice(0, 5)) {
    const actions = appActions(Command);
    assert.equal(
      actions[0],
      name === "review-apps" ? "Open in Vesslo" : "Review in Vesslo",
      name,
    );
    assert.ok(
      !actions.includes("Open App") && !actions.includes("Show in Finder"),
      name,
    );
    assert.ok(
      collect(React.createElement(Command), "List.Item").some(
        (row) => row.id === "vesslo-data-status",
      ),
      name,
    );
  }
});
test("refreshRequired and unknown actions stay review-only in search, updates and tags", () => {
  for (const primaryActionKind of ["refreshRequired", "futureAction"]) {
    currentState = fixture({ primaryActionKind });
    for (const [name, Command] of commands.slice(0, 3)) {
      const actions = appActions(Command);
      assert.equal(
        actions[0],
        primaryActionKind === "refreshRequired"
          ? "Review Update Source in Vesslo"
          : "Review in Vesslo",
        name,
      );
      assert.ok(!actions.includes("Update in Vesslo"), name);
    }
  }
});
test("deleted records remain in snapshot but disappear from commands and tag counts", () => {
  currentState = fixture({ isDeleted: true, isVisibleInUpdates: false });
  for (const [name, Command] of commands.slice(0, 5))
    assert.deepEqual(appActions(Command), [], name);
  assert.equal(currentState.data.apps.length, 1);
  const tagCommand = commands.find(([name]) => name === "browse-by-tag")[1];
  assert.equal(
    collect(React.createElement(tagCommand), "Action.Push").length,
    0,
  );
});
test("bulk exposes review navigation without an update-all execution action", () => {
  currentState = fixture();
  const Command = commands[3][1];
  const summary = collect(React.createElement(Command), "List.Item").find(
    (row) => row.id === "vesslo-homebrew-review",
  );
  const actions = collect(summary.actions, "Action").map(
    (action) => action.title,
  );
  assert.equal(actions[0], "Select Matching Apps");
  assert.ok(actions.includes("Reload Vesslo Data"));
  assert.ok(
    !actions.some((title) =>
      /Update All|Start|Submit|Install|Update in Vesslo/.test(title),
    ),
  );
  const copiedReview = collect(summary.actions, "Action.CopyToClipboard");
  assert.equal(copiedReview[0].title, "Copy Matching Review List");
  assert.match(copiedReview[0].content, /review list only/);
});

test("search uses native exact tag navigation and preserves the parent search state", () => {
  currentState = fixture({ memo: "Only in memo: manuscript", name: "Example" });
  currentState.data.apps.push({
    ...currentState.data.apps[0],
    id: "app-2",
    name: "Other",
    bundleId: "com.example.other",
    path: "/Applications/Other.app",
    tags: ["Workflows"],
    isVisibleInUpdates: false,
  });
  initialStates = ["manuscript", "memo"];
  stateIndex = 0;
  stateChanges = [];
  const Command = commands[0][1];
  const tree = Command();
  assert.equal(tree.props.filtering, false);
  assert.equal(tree.props.searchText, "manuscript");
  assert.equal(tree.props.searchBarAccessory.props.value, "memo");
  const rows = collect(tree, "List.Item");
  assert.equal(
    rows.find((row) => row.id === appID).subtitle,
    "Memo: Only in memo: manuscript",
  );
  const tagAction = collect(tree, "Action.Push").find(
    (action) => action.title === "Browse #Work",
  );
  assert.ok(tagAction, "Browse tag must push a native view");
  assert.equal(tagAction.target.props.tag, "Work");
  const taggedRows = collect(tagAction.target, "List.Item");
  assert.ok(taggedRows.some((row) => row.id === appID));
  assert.ok(
    !taggedRows.some((row) => row.id === "app-2"),
    "Work must not include Workflows",
  );
  assert.deepEqual(
    stateChanges,
    [],
    "native back navigation must preserve the parent scope/query",
  );
  initialStates = [];
  stateIndex = 0;
});

test("Review Apps remains read-only even for executable or manual-store candidates", () => {
  const Command = commands.find(([name]) => name === "review-apps")[1];
  for (const [primaryActionKind, eligibilityKind] of [
    ["runBrew", "executableUpdate.homebrew"],
    ["runSparkle", "executableUpdate.sparkle"],
    ["openAppStore", "appStoreManualUpdate"],
    ["refreshRequired", "refreshRequired"],
  ]) {
    for (const status of ["ready", "stale", "missing"]) {
      currentState = fixture({
        primaryActionKind,
        eligibilityKind,
        appStoreId: "12345",
      });
      currentState.status = status;
      const actions = appActions(Command);
      assert.equal(actions[0], "Open in Vesslo");
      assert.ok(
        !actions.some((title) =>
          [
            "Update in Vesslo",
            "Review Homebrew Update in Vesslo",
            "Open in App Store",
            "Open App",
          ].includes(title),
        ),
      );
    }
  }
});

test("Deleted Apps exposes only recorded identity copying and data reload", () => {
  currentState = fixture({ isDeleted: true, isVisibleInUpdates: false });
  const Command = commands.find(([name]) => name === "deleted-apps")[1];
  const row = collect(React.createElement(Command), "List.Item").find(
    (row) => row.id === appID,
  );
  assert.ok(row);
  assert.equal(row.icon, "Trash");
  assert.deepEqual(
    collect(row.actions, "Action", [], false).map((action) => action.title),
    ["Reload Vesslo Data"],
  );
  assert.deepEqual(
    collect(row.actions, "Action.CopyToClipboard").map(
      (action) => action.title,
    ),
    ["Copy Bundle ID", "Copy Recorded Path"],
  );
  assert.equal(collect(row.actions, "Action.Push").length, 0);
});

test("count mismatch blocks update actions and is visible in every command", () => {
  currentState = fixture();
  currentState.data.updateCount = 5;
  currentState.status = "contractMismatch";
  currentState.reason =
    "Vesslo reports 5 updates, but the exported visibility flags contain 1.";
  for (const [name, Command] of commands) {
    const rows = collect(React.createElement(Command), "List.Item");
    const notice = rows.find((row) => row.id === "vesslo-data-status");
    assert.equal(notice.title, "Update Count Mismatch", name);
    assert.ok(!appActions(Command).includes("Update in Vesslo"), name);
    assert.ok(!appActions(Command).includes("Open in App Store"), name);
  }
});

test("unverifiable counts remain visible as a review notice even when browsing is ready", () => {
  currentState = fixture();
  currentState.data.updateCount = null;
  for (const [name, Command] of commands) {
    const rows = collect(React.createElement(Command), "List.Item");
    const notice = rows.find((row) => row.id === "vesslo-data-status");
    assert.equal(notice.title, "Update Count Unverified", name);
    assert.match(notice.subtitle, /does not provide an update count/, name);
    assert.ok(!appActions(Command).includes("Update in Vesslo"), name);
  }
});

test("every command offers Cmd+R to reload exported data", async () => {
  for (const [name, Command] of commands) {
    currentState = fixture(
      name === "deleted-apps"
        ? { isDeleted: true, isVisibleInUpdates: false }
        : {},
    );
    const action = collect(React.createElement(Command), "Action").find(
      (action) => action.title === "Reload Vesslo Data",
    );
    assert.ok(action, name);
    assert.deepEqual(action.shortcut, { modifiers: ["cmd"], key: "r" }, name);
    const before = refreshCount;
    await action.onAction();
    assert.equal(refreshCount, before + 1, name);
  }
});

test("bulk keeps exact selected targets when a search hides rows and clears stale selection before submission", async () => {
  currentState = fixture();
  const second = {
    ...currentState.data.apps[0],
    id: uuid("second"),
    name: "Second",
    path: "/Applications/Second.app",
    bundleId: "com.example.second",
    homebrewCask: "second",
  };
  currentState.data = schema2Data([...currentState.data.apps, second]);
  currentState.pathAvailability[second.path] = "available";
  const Command = commands[3][1];
  initialStates = [];
  stateIndex = 0;
  stateChanges = [];
  let tree = Command();
  const select = collect(tree, "Action").find(
    (a) => a.title === "Select Matching Apps",
  );
  assert.ok(select);
  await select.onAction();
  const selection = stateChanges.find(([index]) => index === 2)[1];
  assert.deepEqual(
    selection.apps.map((a) => a.id),
    [appID, second.id],
  );
  initialStates = ["Second", false, selection, null];
  stateIndex = 0;
  tree = Command();
  assert.equal(
    collect(tree, "List.Item").find((r) => r.id === "vesslo-homebrew-review")
      .title,
    "2 selected",
  );
  const review = collect(tree, "Action.Push").find(
    (a) => a.title === "Review 2 apps in Vesslo",
  );
  assert.deepEqual(
    review.target.props.apps.map((a) => a.id),
    [appID, second.id],
  );
  currentState.data = {
    ...currentState.data,
    inventoryRevision: currentState.data.inventoryRevision + 1,
  };
  stateIndex = 0;
  tree = Command();
  assert.ok(
    !collect(tree, "Action.Push").some(
      (a) => a.title === "Review 2 apps in Vesslo",
    ),
  );
  assert.match(
    collect(tree, "List.Item").find((r) => r.id === "vesslo-homebrew-review")
      .subtitle,
    /Inventory changed/,
  );
  initialStates = [];
  stateIndex = 0;
});
test("legacy and checking snapshots preserve browsing without Homebrew request actions", () => {
  for (const mode of ["legacy", "checking"]) {
    currentState = fixture();
    if (mode === "legacy") delete currentState.data.schemaVersion;
    else currentState.data.checkPhase = "checking";
    for (const [, Command] of commands.slice(0, 4)) {
      initialStates = [];
      stateIndex = 0;
      const tree = React.createElement(Command);
      assert.ok(
        !collect(tree, "Action.Push").some((a) =>
          /Review Homebrew Update|Review \d+ apps? in Vesslo/.test(a.title),
        ),
      );
      assert.ok(
        collect(tree, "List.Item").some((r) => r.id === "vesslo-data-status"),
      );
    }
  }
  initialStates = [];
  stateIndex = 0;
});

test("schema 3 keeps global failure visible while checked Homebrew targets retain review actions", () => {
  initialStates = [];
  stateIndex = 0;
  currentState = readinessFixture();
  const Command = commands[0][1];
  const tree = React.createElement(Command);
  const rows = collect(tree, "List.Item");
  const notice = rows.find((row) => row.id === "vesslo-data-status");
  assert.equal(notice.title, "Full Update Check Failed");
  assert.equal(notice.subtitle, "Other update routes are blocked");
  assert.equal(notice.accessories[0].text, "2 Homebrew ready");
  assert.equal(notice.accessories[0].tag, undefined);
  const checkDetails = collect(notice.actions, "Action.Push").find(
    (action) => action.title === "View Check Details",
  );
  assert.ok(checkDetails);
  assert.match(
    checkDetails.target.props.markdown,
    /2 targets have current Homebrew source evidence/,
  );
  assert.match(
    checkDetails.target.props.markdown,
    /separate from the total candidate count/,
  );
  assert.match(checkDetails.target.props.markdown, /failed/);
  const row = rows.find((row) => row.id === currentState.data.apps[0].id);
  assert.ok(
    collect(row.actions, "Action.Push").some(
      (action) => action.title === "Review Homebrew Update in Vesslo",
    ),
  );

  currentState.checkedAt = Date.now();
  currentState.data.homebrewReadiness.forEach((evidence) => {
    evidence.expiresAt = new Date(currentState.checkedAt - 1).toISOString();
  });
  stateIndex = 0;
  const expired = collect(React.createElement(Command), "List.Item");
  assert.equal(
    expired.find((row) => row.id === "vesslo-data-status").accessories[0].text,
    "Review only",
  );
  assert.ok(
    !collect(React.createElement(Command), "Action.Push").some(
      (action) => action.title === "Review Homebrew Update in Vesslo",
    ),
  );
});

test("bulk preserves a selection through unrelated failures but withdraws changed or expired selected proofs", () => {
  currentState = readinessFixture();
  const selectedSnapshot = structuredClone(currentState.data);
  const selectedApp = selectedSnapshot.apps[0];
  initialStates = ["", false, { data: selectedSnapshot, apps: [selectedApp] }];
  stateIndex = 0;
  currentState.data.homebrewReadiness[1].state = "failed";
  currentState.data.homebrewReadiness[1].reason = "sourceFailed";
  const Command = commands[3][1];
  const hasReview = (tree) =>
    collect(tree, "Action.Push").some(
      (action) => action.title === "Review 1 app in Vesslo",
    );
  assert.equal(hasReview(Command()), true);

  currentState.data.homebrewReadiness[0].evidenceId =
    uuid("new-selected-proof");
  stateIndex = 0;
  let tree = Command();
  assert.equal(hasReview(tree), false);
  assert.match(
    collect(tree, "List.Item").find(
      (row) => row.id === "vesslo-homebrew-review",
    ).subtitle,
    /proof changed/,
  );

  currentState.data.homebrewReadiness[0] = structuredClone(
    selectedSnapshot.homebrewReadiness[0],
  );
  currentState.data.homebrewReadiness[0].expiresAt = new Date(
    Date.now() - 1,
  ).toISOString();
  stateIndex = 0;
  tree = Command();
  assert.equal(hasReview(tree), false);
  initialStates = [];
  stateIndex = 0;
});

test("bulk summary only advertises confirmation for a valid selection or currently selectable visible targets", () => {
  const Command = commands[3][1];
  const dateNow = Date.now;
  const renderSummary = () => {
    stateIndex = 0;
    return collect(Command(), "List.Item").find(
      (row) => row.id === "vesslo-homebrew-review",
    );
  };
  try {
    initialStates = [];
    currentState = readinessFixture();
    assert.equal(renderSummary().accessories[0].text, "Review in Vesslo");
    currentState.data.homebrewReadiness =
      currentState.data.homebrewReadiness.map(
        ({ evidenceId, checkedAt, expiresAt, ...entry }) => ({
          ...entry,
          state: "unverified",
          reason: "sourceUnverified",
        }),
      );
    let summary = renderSummary();
    assert.equal(summary.title, "0 selected");
    assert.equal(summary.accessories[0].text, "Review only");
    assert.equal(summary.accessories[0].icon.tintColor, "Orange");
    assert.equal(summary.accessories[0].tag, undefined);
    assert.ok(
      !collect(summary.actions, "Action").some(
        (action) => action.title === "Select Matching Apps",
      ),
    );

    currentState = readinessFixture();
    currentState.pathAvailability = Object.fromEntries(
      currentState.data.apps.map((app) => [app.path, "permissionDenied"]),
    );
    assert.equal(renderSummary().accessories[0].text, "Review only");

    currentState = readinessFixture();
    initialStates = ["no matching target"];
    assert.equal(renderSummary().accessories[0].text, "Review only");
    const originalData = currentState.data;
    initialStates = [
      "no matching target",
      false,
      { data: originalData, apps: [originalData.apps[0]] },
    ];
    assert.equal(renderSummary().accessories[0].text, "Review in Vesslo");
    Date.now = () => Date.parse(originalData.homebrewReadiness[0].expiresAt);
    summary = renderSummary();
    assert.equal(currentState.data, originalData);
    assert.equal(summary.accessories[0].text, "Review only");
    assert.ok(
      !collect(summary.actions, "Action.Push").some(
        (action) => action.title === "Review 1 app in Vesslo",
      ),
    );
  } finally {
    Date.now = dateNow;
    initialStates = [];
    stateIndex = 0;
  }
});

test("compact app rows retain security and update meaning without repeated status or source pills", () => {
  initialStates = [];
  currentState = fixture({ sources: ["Brew", "Homebrew", "Sparkle"] });
  const rowFor = (Command) => {
    stateIndex = 0;
    return collect(React.createElement(Command), "List.Item").find(
      (row) => row.id === appID,
    );
  };
  const searchRow = rowFor(commands[0][1]);
  assert.ok(
    searchRow.accessories.some((item) => item.text === "Homebrew · Sparkle"),
  );
  assert.ok(
    searchRow.accessories.some((item) => item.tooltip === "Update available"),
  );
  assert.equal(
    searchRow.accessories.filter((item) => item.text === "Security").length,
    1,
  );
  assert.ok(searchRow.accessories.every((item) => !item.tag));

  const bulkRow = rowFor(commands[3][1]);
  assert.ok(bulkRow.accessories.some((item) => item.text === "1.0 → 2.0"));
  assert.equal(
    bulkRow.accessories.some((item) => item.tooltip === "Update available"),
    false,
  );
  assert.equal(
    bulkRow.accessories.some((item) =>
      /Homebrew|Sparkle/.test(item.text ?? ""),
    ),
    false,
  );
  assert.equal(
    bulkRow.accessories.filter((item) => item.text === "Security").length,
    1,
  );
  for (const source of ["Homebrew", "Sparkle"])
    assert.ok(bulkRow.detail.props.markdown.includes(source), source);

  currentState.status = "stale";
  const staleRow = rowFor(commands[0][1]);
  const warning = staleRow.accessories.find((item) => item.text === "Security");
  assert.match(warning.tooltip, /Unsigned app/);
  assert.match(warning.tooltip, /Action review:/);
  assert.equal(
    staleRow.accessories.some((item) => item.text === "Review"),
    false,
  );
  stateIndex = 0;
});

test("candidate totals stay distinct from currently checked Homebrew targets", () => {
  initialStates = [];
  stateIndex = 0;
  currentState = readinessFixture();
  currentState.data.homebrewReadiness[1].state = "failed";
  currentState.data.homebrewReadiness[1].reason = "sourceFailed";
  const tree = commands[3][1]();
  const notice = collect(tree, "List.Item").find(
    (row) => row.id === "vesslo-data-status",
  );
  assert.equal(notice.accessories[0].text, "1 Homebrew ready");
  const candidates = collect(tree, "List.Section").find(
    (section) => section.title === "Homebrew candidates",
  );
  assert.equal(candidates.subtitle, "2 apps");
  stateIndex = 0;
});

test("compact selected indicators preserve the 16-target limit and allow removing selected apps", async () => {
  currentState = fixture();
  const apps = Array.from({ length: 17 }, (_, index) => ({
    ...currentState.data.apps[0],
    id: uuid(`compact-limit-${index}`),
    name: `Example ${index}`,
    bundleId: `com.example.limit${index}`,
    path: `/Applications/Example${index}.app`,
    homebrewCask: `example-${index}`,
  }));
  currentState.data = schema2Data(apps);
  currentState.pathAvailability = Object.fromEntries(
    apps.map((app) => [app.path, "available"]),
  );
  initialStates = [
    "",
    false,
    { data: currentState.data, apps: apps.slice(0, 16) },
  ];
  stateIndex = 0;
  stateChanges = [];
  const tree = commands[3][1]();
  const rows = collect(tree, "List.Item", [], false);
  const selected = rows.find((row) => row.id === apps[0].id);
  assert.ok(
    selected.accessories.some(
      (item) =>
        item.icon?.source === "CheckCircle" &&
        item.tooltip === "Selected for review in Vesslo",
    ),
  );
  const summary = rows.find((row) => row.id === "vesslo-homebrew-review");
  assert.equal(summary.title, "16 selected");
  assert.ok(
    collect(summary.actions, "Action.Push").some(
      (action) => action.title === "Review 16 apps in Vesslo",
    ),
  );
  assert.equal(
    collect(summary.actions, "Action").some(
      (action) => action.title === "Select Matching Apps",
    ),
    false,
  );
  const last = rows.find((row) => row.id === apps[16].id);
  await collect(last.actions, "Action")
    .find((action) => action.title === "Select for Review")
    .onAction();
  assert.ok(
    stateChanges.some(
      ([index, value]) =>
        index === 3 &&
        value === "One review request can contain at most 16 apps.",
    ),
  );
  assert.equal(
    stateChanges.some(([index]) => index === 2),
    false,
  );
  await collect(selected.actions, "Action")
    .find((action) => action.title === "Remove from Selection")
    .onAction();
  const remaining = stateChanges.find(([index]) => index === 2)[1];
  assert.equal(remaining.apps.length, 15);
  assert.equal(
    remaining.apps.some((app) => app.id === apps[0].id),
    false,
  );
  initialStates = [];
  stateIndex = 0;
});

test("an empty Homebrew candidate list stays review-only without selectable or executable actions", () => {
  currentState = fixture();
  currentState.data = schema2Data([]);
  currentState.pathAvailability = {};
  initialStates = [];
  stateIndex = 0;
  const tree = commands[3][1]();
  const rows = collect(tree, "List.Item");
  const summary = rows.find((row) => row.id === "vesslo-homebrew-review");
  assert.equal(summary.title, "0 selected");
  assert.equal(summary.accessories[0].text, "Review only");
  assert.ok(rows.some((row) => row.id === "vesslo-homebrew-empty"));
  assert.equal(
    collect(tree, "AnyAction").some((action) =>
      /Select Matching|Review \d+ apps? in Vesslo|Update All|Install/.test(
        action.title,
      ),
    ),
    false,
  );
  stateIndex = 0;
});

test("receipt details preserve readiness evidence and mark V1 records as read-only history", () => {
  const {
    receiptMarkdown,
    receiptTechnicalMarkdown,
    requestIdentityMarkdown,
  } = require(
    join(process.env.VESSLO_TEST_BUILD, "components/HandoffRequestStatus.js"),
  );
  const receipt = receiptV2Fixture().receipts[0];
  const markdown = receiptMarkdown(receipt);
  const technical = receiptTechnicalMarkdown(receipt);
  assert.match(technical, /Request schema:\*\* 2/);
  for (const target of receipt.request.targets)
    assert.ok(technical.includes(target.readinessEvidenceId));
  assert.match(markdown, /Execution and completion are not confirmed/);
  const legacy = { ...receipt.request, schemaVersion: 1 };
  assert.match(
    requestIdentityMarkdown(legacy),
    /Legacy request record.*Read-only/,
  );
  assert.match(
    requestIdentityMarkdown(legacy),
    /cannot authorize a new target-readiness review/,
  );
});
