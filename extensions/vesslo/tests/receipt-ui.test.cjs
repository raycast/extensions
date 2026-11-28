const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");
const { join } = require("node:path");
const { readFileSync } = require("node:fs");
const React = require("react");
const { parseReceiptEnvelope, initialReceiptState } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/receipt-contract.js"),
);
const { parseVessloData } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/data.js"),
);
const {
  schema3Fixture,
  receiptV2Fixture,
} = require("./helpers/readiness-fixture.cjs");
const now = Date.parse("2026-09-10T12:00:30Z");
const parse = (file) =>
  parseReceiptEnvelope(
    readFileSync(join(__dirname, "fixtures/app-integration", file), "utf8"),
    now,
  )[0];
let state, session;
let exportData;
let exportStatus = "ready";
let reloads = 0;
const api = { Icon: new Proxy({}, { get: (_, key) => key }), Detail: "Detail" };
api.Action = Object.assign((props) => React.createElement("Action", props), {
  CopyToClipboard: "Action.CopyToClipboard",
  Push: "Action.Push",
});
api.ActionPanel = (props) => props.children;
api.List = Object.assign((props) => React.createElement("List", props), {
  Section: "List.Section",
  EmptyView: "List.EmptyView",
  Item: Object.assign((props) => React.createElement("List.Item", props), {
    Detail: "List.Item.Detail",
  }),
});
const realLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@raycast/api") return api;
  if (request === "react")
    return { ...React, useState: (initial) => [initial, () => {}] };
  if (request.endsWith("/utils/useHandoffReceipts"))
    return {
      useHandoffReceipts: () => ({
        state,
        isLoading: false,
        refresh: async () => {
          reloads++;
        },
      }),
    };
  if (request.endsWith("/utils/useVessloData"))
    return {
      useVessloData: () => ({
        state: { status: exportStatus },
        data: exportData ?? { schemaVersion: 2, publisherSessionId: session },
      }),
    };
  return realLoad.call(this, request, parent, isMain);
};
const {
  HandoffRequestStatus,
  receiptMarkdown,
  receiptTechnicalMarkdown,
} = require(
  join(process.env.VESSLO_TEST_BUILD, "components/HandoffRequestStatus.js"),
);
const Command = require(
  join(process.env.VESSLO_TEST_BUILD, "handoff-requests.js"),
).default;
Module._load = realLoad;
function collect(node, type, found = []) {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, type, found));
    return found;
  }
  if (typeof node.type === "function")
    return collect(node.type(node.props), type, found);
  if (node.type === type) found.push(node.props);
  collect(node.props?.children, type, found);
  collect(node.props?.actions, type, found);
  collect(node.props?.detail, type, found);
  return found;
}

test("request status distinguishes waiting, accepted and unavailable without a resend or execute action", async () => {
  const receipt = parse("receipt-accepted.json");
  state = { ...initialReceiptState(), status: "ready" };
  let tree = React.createElement(HandoffRequestStatus, {
    request: receipt.request,
  });
  assert.match(collect(tree, "Detail")[0].markdown, /Awaiting Receipt/);
  state.receipts = [receipt];
  assert.match(collect(tree, "Detail")[0].markdown, /### Awaiting Review/);
  assert.match(
    collect(tree, "Detail")[0].markdown,
    /Execution and completion are not confirmed/,
  );
  const action = collect(tree, "Action");
  assert.deepEqual(
    action.map((entry) => entry.title),
    ["Reload Receipts"],
  );
  await action[0].onAction();
  assert.equal(reloads, 1);
  state.status = "permissionDenied";
  assert.match(collect(tree, "Detail")[0].markdown, /Receipt Unavailable/);
  assert.doesNotMatch(
    collect(tree, "Detail")[0].markdown,
    /^#{1,3} Completed/m,
  );
});

test("partial failure details preserve both exact targets and render arbitrary reasons as literal text", () => {
  const receipt = parse("receipt-partial-failure.json");
  receipt.targets[1].reason =
    "[literal](https://example.invalid) `escape` \u202econtrol";
  const text = receiptMarkdown(receipt);
  assert.match(text, /^### Failed/);
  assert.match(text, /results are mixed/);
  assert.match(text, /Completed · Verified by Vesslo/);
  assert.doesNotMatch(text, /Verified by Vesslo for every target/);
  assert.match(text, /example-editor/);
  assert.match(text, /example-viewer/);
  assert.match(
    text,
    /``\[literal\]\(https:\/\/example.invalid\) `escape` control``/,
  );
  assert.doesNotMatch(text, /\u202e/);
});

test("read-only command separates older publisher history and marks cached or expired rows unconfirmed", () => {
  const current = parse("receipt-completed.json");
  const old = parse("receipt-restarted.json");
  old.request.requestId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  old.request.publisherSessionId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  session = current.request.publisherSessionId;
  state = {
    ...initialReceiptState(),
    status: "ready",
    receipts: [current, old],
  };
  const tree = React.createElement(Command);
  assert.deepEqual(
    collect(tree, "List.Section").map((section) => section.title),
    ["Current Session", "Earlier Sessions"],
  );
  assert.ok(
    collect(tree, "List.Item.Detail").some((detail) =>
      /different or unverified export session/.test(detail.markdown),
    ),
  );
  assert.ok(
    collect(tree, "Action").every(
      (action) => action.title === "Reload Receipts",
    ),
  );
  state.status = "malformed";
  state.reason = "Malformed receipt";
  assert.ok(
    collect(tree, "List.Item")
      .filter((item) => item.id !== "receipt-read-state")
      .every((item) => item.accessories[0].text === "Cached · Unconfirmed"),
  );
  assert.ok(
    collect(tree, "List.Item.Detail").every(
      (detail) => !/^#{1,3} Completed/m.test(detail.markdown),
    ),
  );
  state = {
    ...initialReceiptState(),
    status: "ready",
    expiredReceipts: [current],
  };
  assert.equal(
    collect(tree, "List.Item")[0].accessories[0].text,
    "Expired history",
  );
});

test("schema 3 export keeps its V2 receipt in the current session with original readiness evidence", () => {
  const raw = schema3Fixture();
  raw.checkPhase = "failed";
  raw.checkReason = "sourceFailure";
  delete raw.checkedInventoryRevision;
  exportData = parseVessloData(JSON.stringify(raw));
  const current = parseReceiptEnvelope(
    JSON.stringify(receiptV2Fixture("receipt-completed.json")),
    now,
  )[0];
  state = { ...initialReceiptState(), status: "ready", receipts: [current] };
  try {
    const tree = React.createElement(Command);
    const sections = collect(tree, "List.Section");
    assert.equal(sections[0].title, "Current Session");
    assert.deepEqual(
      collect(sections[0].children, "List.Item").map((item) => item.id),
      [current.request.requestId],
    );
    assert.equal(collect(sections[1].children, "List.Item").length, 0);
    const detail = collect(tree, "List.Item.Detail")[0].markdown;
    assert.doesNotMatch(detail, /different or unverified export session/);
    assert.match(detail, /^### Completed/);
    const technical = collect(
      collect(tree, "Action.Push")[0].target,
      "Detail",
    )[0].markdown;
    for (const target of current.request.targets)
      assert.ok(technical.includes(target.readinessEvidenceId));
    assert.deepEqual(
      collect(tree, "Action").map((item) => item.title),
      ["Reload Receipts"],
    );

    exportStatus = "permissionDenied";
    assert.equal(collect(tree, "List.Section")[0].title, "Session Unverified");
    assert.match(
      collect(tree, "List.Item.Detail")[0].markdown,
      /different or unverified export session/,
    );
  } finally {
    exportData = undefined;
    exportStatus = "ready";
  }
});

test("compact completed receipt shows requested versions and the exact installation before its timestamp", () => {
  const receipt = parse("receipt-completed.json");
  const summary = receiptMarkdown(receipt);
  assert.match(summary, /^### Completed\n/);
  assert.doesNotMatch(summary, /^#{1,2} /m);
  assert.match(summary, /Verified by Vesslo for every target/);
  assert.match(summary, /recorded result, not a live version check/);
  assert.doesNotMatch(
    summary,
    /Request schema|Publisher session|Receipt revision|App ID|Verification record/,
  );
  for (const entry of receipt.targets) {
    const target = entry.target;
    assert.ok(summary.includes(target.caskToken));
    assert.ok(
      summary.includes(
        `Requested: \`${target.installedVersion}\` → \`${target.expectedTargetVersion}\``,
      ),
    );
    assert.ok(
      summary.indexOf(target.canonicalPath) < summary.indexOf("Updated "),
    );
  }
});

test("technical details retain every original identity, schema, timestamp, revision and verification field", () => {
  const receipt = parseReceiptEnvelope(
    JSON.stringify(receiptV2Fixture("receipt-completed.json")),
    now,
  )[0];
  const technical = receiptTechnicalMarkdown(receipt);
  for (const field of [
    receipt.request.requestId,
    receipt.request.publisherSessionId,
    receipt.request.createdAt,
    receipt.receivedAt,
    receipt.updatedAt,
    receipt.expiresAt,
    ...receipt.targets.flatMap((entry) => [
      ...Object.values(entry.target),
      entry.reason,
      entry.verificationRecordId,
    ]),
  ].filter(Boolean)) {
    assert.ok(
      technical.includes(field),
      `missing exact diagnostic field: ${field}`,
    );
  }
  assert.ok(
    technical.includes(`**Request schema:** ${receipt.request.schemaVersion}`),
  );
  assert.ok(technical.includes(`**Receipt schema:** ${receipt.schemaVersion}`));
  assert.ok(technical.includes(`**Receipt revision:** ${receipt.revision}`));
  assert.ok(
    technical.includes(
      `**Inventory / completed check revision:** ${receipt.request.inventoryRevision} / ${receipt.request.completedCheckRevision}`,
    ),
  );
  state = { ...initialReceiptState(), status: "ready", receipts: [receipt] };
  const tree = React.createElement(HandoffRequestStatus, {
    request: receipt.request,
  });
  const action = collect(tree, "Action.Push")[0];
  assert.equal(action.title, "View Technical Details");
  const copied = collect(action.target, "Action.CopyToClipboard");
  assert.equal(
    copied.find((item) => item.title === "Copy Request ID").content,
    receipt.request.requestId,
  );
  assert.deepEqual(
    JSON.parse(
      copied.find((item) => item.title === "Copy Request JSON").content,
    ),
    receipt.request,
  );
  assert.deepEqual(
    JSON.parse(
      copied.find((item) => item.title === "Copy Receipt JSON").content,
    ),
    receipt,
  );
  assert.match(
    collect(action.target, "Detail")[0].markdown,
    /never resends or executes/,
  );
});

test("awaiting, unavailable and conflicting receipts keep original target diagnostics available without execution", () => {
  const receipt = parse("receipt-accepted.json");
  for (const status of ["ready", "permissionDenied", "conflict"]) {
    const conflicting = structuredClone(receipt);
    conflicting.request.targets[0].canonicalPath =
      "/Applications/Different.app";
    state = {
      ...initialReceiptState(),
      status: status === "conflict" ? "ready" : status,
      receipts: status === "conflict" ? [conflicting] : [],
      reason: status === "permissionDenied" ? "Permission denied" : null,
    };
    const tree = React.createElement(HandoffRequestStatus, {
      request: receipt.request,
    });
    const summary = collect(tree, "Detail")[0].markdown;
    assert.match(
      summary,
      /Awaiting Receipt|Receipt Unavailable|Request Conflict/,
    );
    assert.doesNotMatch(summary, /Verified by Vesslo/);
    assert.ok(summary.includes(receipt.request.targets[0].canonicalPath));
    assert.doesNotMatch(summary, /Request schema/);
    const action = collect(tree, "Action.Push")[0];
    const technical = collect(action.target, "Detail")[0].markdown;
    assert.ok(technical.includes(receipt.request.requestId));
    assert.ok(technical.includes(receipt.request.targets[0].appId));
    assert.doesNotMatch(technical, /Different.app/);
    assert.deepEqual(
      collect(tree, "Action").map((item) => item.title),
      ["Reload Receipts"],
    );
    assert.equal(collect(action.target, "Action").length, 0);
  }
});

test("history keeps both compact and technical views explicitly unconfirmed", () => {
  const receipt = parse("receipt-completed.json");
  for (const status of ["malformed", "expired"]) {
    state = {
      ...initialReceiptState(),
      status: status === "expired" ? "ready" : status,
      receipts: status === "expired" ? [] : [receipt],
      expiredReceipts: status === "expired" ? [receipt] : [],
      reason: status === "malformed" ? "Malformed receipt" : null,
    };
    session = receipt.request.publisherSessionId;
    const tree = React.createElement(Command);
    const row = collect(tree, "List.Item").find(
      (item) => item.id === receipt.request.requestId,
    );
    assert.notEqual(row.icon, "CheckCircle");
    const summary = collect(row.detail, "List.Item.Detail")[0].markdown;
    const technical = collect(
      collect(row.actions, "Action.Push")[0].target,
      "Detail",
    )[0].markdown;
    for (const text of [summary, technical]) {
      assert.match(text, /Current result unconfirmed/);
      assert.match(text, /Last recorded result/);
      assert.doesNotMatch(text, /Verified by Vesslo/);
      assert.match(text, /never .*executes/);
    }
  }
});

test("receipt list replaces full UUIDs with a short time and handles one request", () => {
  const receipt = parse("receipt-completed.json");
  state = { ...initialReceiptState(), status: "ready", receipts: [receipt] };
  session = receipt.request.publisherSessionId;
  const tree = React.createElement(Command);
  const row = collect(tree, "List.Item")[0];
  assert.equal(
    row.title,
    receipt.targets.map((entry) => entry.target.caskToken).join(", "),
  );
  assert.notEqual(row.subtitle, receipt.request.requestId);
  assert.ok(row.subtitle.length < 15);
  assert.equal(row.accessories[0].text, "Completed");
  assert.match(row.accessories[0].tooltip, /2026-09-10/);
  assert.equal(
    collect(tree, "List.Section")[0].subtitle,
    "1 request · Read-only",
  );
  assert.equal(
    collect(tree, "List")[0].searchBarPlaceholder,
    "Search requests",
  );
});

test("pending verification never uses verified completion language in compact or technical content", () => {
  const receipt = parse("receipt-verification-pending.json");
  for (const text of [
    receiptMarkdown(receipt),
    receiptTechnicalMarkdown(receipt),
  ]) {
    assert.match(text, /Verification Pending/);
    assert.match(text, /Completion is unconfirmed/);
    assert.doesNotMatch(text, /Verified by Vesslo/);
  }
});
