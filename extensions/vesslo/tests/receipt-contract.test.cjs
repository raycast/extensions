const assert = require("node:assert/strict");
const test = require("node:test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  parseReceiptEnvelope,
  receiptTransitionReason,
  isExpiredReceipt,
  bindReceipt,
  requestFingerprint,
  initialReceiptState,
  MAX_RECEIPT_BYTES,
} = require(join(process.env.VESSLO_TEST_BUILD, "utils/receipt-contract.js"));
const fixtures = join(__dirname, "fixtures/app-integration");
const read = (name) => readFileSync(join(fixtures, name), "utf8");
const json = (name) => JSON.parse(read(name));
const now = Date.parse("2026-09-10T12:00:30Z");
const manifest = json("manifest.json");
const parse = (name) => parseReceiptEnvelope(read(name), now)[0];
const mutate = (callback, file = "receipt-accepted.json") => {
  const value = json(file);
  callback(value.receipts[0], value);
  return JSON.stringify(value);
};

test("app's normal receipt sequence advances without promoting accepted, terminal waiting or verification pending", () => {
  let previous;
  const phases = [];
  for (const file of manifest.normalReceiptSequence) {
    const current = parse(file);
    if (previous)
      assert.equal(receiptTransitionReason(previous, current), null, file);
    previous = current;
    phases.push(current.phase);
  }
  assert.deepEqual(phases, [
    "accepted",
    "running",
    "running",
    "verificationPending",
    "completed",
  ]);
  assert.ok(previous.targets.every((target) => target.phase === "completed"));
});

test("alternative partial results, rejection, cancellation and restart remain isolated validated histories", () => {
  for (const entry of manifest.entries.filter(
    (entry) => entry.kind === "receiptEnvelope",
  )) {
    const receipt = parse(entry.file);
    assert.ok(receipt.targets.length, entry.file);
    assert.equal(
      requestFingerprint(receipt.request),
      requestFingerprint(json(entry.lineageRequest)),
      entry.file,
    );
  }
  const partial = parse("receipt-partial-failure.json");
  assert.equal(partial.phase, "failed");
  assert.deepEqual(
    partial.targets.map((target) => target.phase),
    ["completed", "failed"],
  );
  assert.equal(parse("receipt-restarted.json").phase, "verificationPending");
  assert.match(
    receiptTransitionReason(parse("receipt-completed.json"), partial),
    /terminal|revision/i,
  );
});

test("receipt identity is original and ordered; UUID casing and equivalent dates survive Swift reencoding", () => {
  const request = json("request-valid.json");
  const original = parse("receipt-accepted.json");
  const changed = structuredClone(request);
  changed.requestId = changed.requestId.toUpperCase();
  changed.publisherSessionId = changed.publisherSessionId.toUpperCase();
  changed.targets.forEach((target) => {
    target.appId = target.appId.toUpperCase();
  });
  changed.createdAt = "2026-09-10T12:00:00Z";
  assert.equal(requestFingerprint(changed), requestFingerprint(request));
  const ready = {
    ...initialReceiptState(),
    status: "ready",
    receipts: [original],
  };
  assert.equal(bindReceipt(ready, changed).status, "current");
  for (const update of [
    (r) => r.request.targets.reverse(),
    (r) => {
      r.targets[0].target.canonicalPath = "/Applications/Other.app";
    },
    (r) => {
      r.targets[0].target.bundleId = "com.example.other";
    },
    (r) => {
      r.targets[0].target.expectedTargetVersion = "3.0";
    },
    (r) => {
      r.targets.pop();
    },
  ])
    assert.throws(
      () => parseReceiptEnvelope(mutate(update), now),
      /identity|request|phase/i,
    );
  changed.targets[0].installedVersion = "99";
  assert.equal(bindReceipt(ready, changed).status, "conflict");
});

test("unknown phase, unsafe revisions, malformed dates and aggregate contradiction fail closed", () => {
  for (const update of [
    (r) => {
      r.phase = "apparentlyCompleted";
    },
    (r) => {
      r.targets[0].phase = "processExited";
    },
    (r) => {
      r.phase = "completed";
    },
    (r) => {
      r.revision = Number.MAX_SAFE_INTEGER + 1;
    },
    (r) => {
      r.revision = 0;
    },
    (r) => {
      r.revision = 1.5;
    },
    (r) => {
      r.request.inventoryRevision = -1;
    },
    (r) => {
      r.updatedAt = "2026-02-30T12:00:00Z";
    },
    (r) => {
      r.updatedAt = "2026-09-10T11:59:59Z";
    },
    (r) => {
      r.updatedAt = "2026-09-10T12:02:00Z";
    },
    (r) => {
      r.expiresAt = "2026-09-12T12:00:00Z";
    },
    (r) => {
      r.targets[0].verificationRecordId = "not-a-uuid";
    },
    (r) => {
      r.reason = "x".repeat(4097);
    },
    (_r, envelope) => {
      envelope.schemaVersion = 3;
    },
    (r, envelope) => {
      envelope.receipts.push(structuredClone(r));
    },
  ])
    assert.throws(() => parseReceiptEnvelope(mutate(update), now));
  assert.throws(() => parseReceiptEnvelope("{"));
  assert.throws(
    () => parseReceiptEnvelope(" ".repeat(MAX_RECEIPT_BYTES + 1)),
    /4 MiB/,
  );
  assert.throws(
    () =>
      parseReceiptEnvelope(
        JSON.stringify({ schemaVersion: 1, receipts: Array(129).fill({}) }),
      ),
    /envelope/,
  );
});

test("unknown reason is data, never a successful phase or executable action", () => {
  const value = mutate((r) => {
    r.reason = "completed; [link](https://example.invalid) \u202ehidden";
  }, "receipt-partial-failure.json");
  const receipt = parseReceiptEnvelope(value, now)[0];
  assert.equal(receipt.phase, "failed");
  assert.match(receipt.reason, /example.invalid/);
});

test("per-request revision, immutable terminal targets and original request withstand forged updates", () => {
  const before = parse("receipt-running.json");
  const lower = { ...before, revision: before.revision - 1 };
  assert.match(receiptTransitionReason(before, lower), /backwards/);
  assert.match(
    receiptTransitionReason(before, { ...before, reason: "changed" }),
    /without increasing/,
  );
  const changedRequest = structuredClone(before);
  changedRequest.request.targets[0].canonicalPath = "/Applications/Forged.app";
  assert.match(
    receiptTransitionReason(before, changedRequest),
    /different original/,
  );
  const partiallyDone = parse("receipt-partial-failure.json");
  partiallyDone.phase = "running";
  partiallyDone.targets[1].phase = "running";
  const next = structuredClone(partiallyDone);
  next.revision++;
  next.targets[0].phase = "running";
  assert.match(receiptTransitionReason(partiallyDone, next), /terminal target/);
});

test("expired terminal results are history while unresolved requests survive 24 hours", () => {
  const completed = parse("receipt-completed.json");
  const pending = parse("receipt-verification-pending.json");
  const later = Date.parse(completed.expiresAt);
  assert.equal(isExpiredReceipt(completed, later), true);
  assert.equal(isExpiredReceipt(pending, later + 86400000), false);
  const state = {
    ...initialReceiptState(),
    status: "ready",
    expiredReceipts: [completed],
  };
  assert.equal(bindReceipt(state, completed.request).status, "expired");
  assert.equal(
    bindReceipt({ ...state, expiredReceipts: [] }, completed.request).status,
    "awaitingReceipt",
  );
  assert.equal(
    bindReceipt(
      { ...state, receipts: [completed], status: "permissionDenied" },
      completed.request,
    ).receipt,
    null,
  );
});

const {
  receiptV2Fixture,
  requestV2Fixture,
} = require("./helpers/readiness-fixture.cjs");

test("v2 envelope retains both historical v1 and evidence-bound v2 receipts", () => {
  const envelope = receiptV2Fixture();
  const historical = json("receipt-accepted.json").receipts[0];
  historical.request.requestId = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  envelope.receipts.unshift(historical);
  const receipts = parseReceiptEnvelope(JSON.stringify(envelope), now);
  assert.deepEqual(
    receipts.map((receipt) => [
      receipt.schemaVersion,
      receipt.request.schemaVersion,
    ]),
    [
      [1, 1],
      [2, 2],
    ],
  );
  assert.deepEqual(receipts[1].request, requestV2Fixture());
  assert.deepEqual(
    receipts[1].targets.map((entry) => entry.target),
    receipts[1].request.targets,
  );
});

test("legacy envelope cannot advertise v2 request or receipt authority", () => {
  const envelope = receiptV2Fixture();
  envelope.schemaVersion = 1;
  assert.throws(
    () => parseReceiptEnvelope(JSON.stringify(envelope), now),
    /request/,
  );
  const historical = json("receipt-accepted.json");
  assert.equal(
    parseReceiptEnvelope(JSON.stringify(historical), now)[0].schemaVersion,
    1,
  );
});

test("v2 receipt binds proof UUID, request schema and ordered results without authority downgrade", () => {
  const envelope = receiptV2Fixture();
  const original = parseReceiptEnvelope(JSON.stringify(envelope), now)[0];
  const differentlyCased = structuredClone(original.request);
  differentlyCased.targets.forEach((target) => {
    target.readinessEvidenceId = target.readinessEvidenceId.toUpperCase();
  });
  assert.equal(
    requestFingerprint(differentlyCased),
    requestFingerprint(original.request),
  );
  const ready = {
    ...initialReceiptState(),
    status: "ready",
    receipts: [original],
  };
  assert.equal(bindReceipt(ready, differentlyCased).status, "current");
  differentlyCased.targets[0].readinessEvidenceId =
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  assert.equal(bindReceipt(ready, differentlyCased).status, "conflict");
  for (const mutate of [
    (receipt) => {
      receipt.schemaVersion = 1;
    },
    (receipt) => {
      receipt.request.schemaVersion = 1;
    },
    (receipt) => {
      delete receipt.request.targets[0].readinessEvidenceId;
    },
    (receipt) => {
      delete receipt.targets[0].target.readinessEvidenceId;
    },
    (receipt) => {
      receipt.targets[0].target.readinessEvidenceId =
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    },
    (receipt) => {
      receipt.targets.reverse();
    },
    (receipt) => {
      receipt.request.targets[1].readinessEvidenceId =
        receipt.request.targets[0].readinessEvidenceId;
      receipt.targets[1].target.readinessEvidenceId =
        receipt.request.targets[0].readinessEvidenceId;
    },
  ]) {
    const changed = receiptV2Fixture();
    mutate(changed.receipts[0]);
    assert.throws(() => parseReceiptEnvelope(JSON.stringify(changed), now));
  }
  const changed = structuredClone(original);
  changed.revision++;
  changed.request.targets[0].readinessEvidenceId =
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  assert.match(
    receiptTransitionReason(original, changed),
    /different original/,
  );
});

const appFixtures = require("./helpers/app-readiness-fixture.cjs");
for (const entry of appFixtures.manifest.entries.filter(
  (entry) => entry.kind === "receiptEnvelope",
)) {
  test(`app-owned receipt fixture preserves original target evidence and result phase: ${entry.file}`, () => {
    const receipts = parseReceiptEnvelope(
      appFixtures.read(entry.file),
      appFixtures.fixtureClock,
    );
    assert.ok(receipts.length > 0);
    for (const receipt of receipts) {
      assert.equal(receipt.schemaVersion, receipt.request.schemaVersion);
      assert.deepEqual(
        receipt.targets.map((target) => target.target),
        receipt.request.targets,
      );
    }
    if (entry.requestFile)
      assert.equal(
        requestFingerprint(receipts[0].request),
        requestFingerprint(appFixtures.fixture(entry.requestFile)),
      );
    if (entry.expected.aggregate) {
      assert.equal(receipts[0].phase, entry.expected.aggregate);
      assert.deepEqual(
        receipts[0].targets.map((target) => target.phase),
        entry.expected.targetPhases,
      );
    }
    if (entry.expected.decode === "preserveInnerVersions2And1")
      assert.deepEqual(
        receipts.map((receipt) => receipt.schemaVersion),
        [2, 1],
      );
    if (entry.expected.decode === "preserveSchema1History")
      assert.equal(receipts[0].schemaVersion, 1);
  });
}
