import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ACTIONS, RECEIPT_STATUSES, type Receipt } from "../src/lib/contract";
import { IntegrationError } from "../src/lib/errors";
import {
  reconcilePendingRequests,
  requestPresentation,
} from "../src/lib/request-tracking";
import { readReceipt, type PendingRequest } from "../src/lib/transport";
import {
  epoch,
  fixtureRoot,
  instance,
  jsonFile,
  randomUUID,
  receipt,
} from "./fixtures";

async function fixture(t: TestContext): Promise<string> {
  const root = await fixtureRoot();
  t.after(() => rm(root, { recursive: true }));
  return root;
}

function pending(overrides: Partial<PendingRequest> = {}): PendingRequest {
  return {
    requestID: randomUUID(),
    namespaceEpoch: epoch,
    producerInstanceID: instance,
    action: "reviewAddURL",
    createdAt: Date.now() / 1000,
    ...overrides,
  };
}

async function saveReceipt(
  root: string,
  request: PendingRequest,
  status: Receipt["status"],
  overrides: Partial<Receipt> = {},
): Promise<void> {
  await jsonFile(root, `receipts/${request.requestID}.json`, {
    ...receipt(request.requestID, status),
    ...overrides,
  });
}

async function receiptBytes(root: string): Promise<Record<string, string>> {
  const names = await readdir(join(root, "receipts"));
  return Object.fromEntries(
    await Promise.all(
      names.map(async (name) => [
        name,
        await readFile(join(root, "receipts", name), "utf8"),
      ]),
    ),
  );
}

test("reconciliation retires only successful or cancelled local references and preserves app files", async (t) => {
  const root = await fixture(t);
  const requests = RECEIPT_STATUSES.map(() => pending());
  const original = structuredClone(requests);
  for (const [index, request] of requests.entries())
    await saveReceipt(root, request, RECEIPT_STATUSES[index]);
  const before = await receiptBytes(root);
  const stored = new Map(
    requests.map((request) => [request.requestID, request]),
  );
  const result = await reconcilePendingRequests(requests, {
    readReceipt: (request) => readReceipt(request, root),
    forgetPending: async (request) => {
      stored.delete(request.requestID);
    },
  });
  const expected = requests.filter(
    (_, index) => !["succeeded", "cancelled"].includes(RECEIPT_STATUSES[index]),
  );

  assert.deepEqual(
    [...stored.keys()],
    expected.map((value) => value.requestID),
  );
  assert.deepEqual(
    result.map((value) => value.requestID),
    [...stored.keys()],
  );
  assert.deepEqual(
    result.map((value) => value.status),
    [
      "accepted",
      "awaitingUser",
      "executing",
      "rejected",
      "expired",
      "failed",
      "reconciliationRequired",
    ],
  );
  assert.ok(result.every((value) => value.payloadHash === "a".repeat(64)));
  assert.ok(result.every((value) => value.receiptRevision === 3));
  assert.deepEqual(requests, original);
  assert.deepEqual(await receiptBytes(root), before);
  assert.deepEqual(await readdir(join(root, "requests")), []);
});

test("missing or invalid receipts remain visible while an independent success is cleaned up", async (t) => {
  const root = await fixture(t);
  const missing = pending();
  const malformed = pending();
  const wrongEpoch = pending();
  const wrongID = pending();
  const wrongHash = pending({ payloadHash: "b".repeat(64) });
  const rollback = pending({ receiptRevision: 4 });
  const success = pending();
  const requests = [
    missing,
    malformed,
    wrongEpoch,
    wrongID,
    wrongHash,
    rollback,
    success,
  ];
  await writeFile(join(root, "receipts", `${malformed.requestID}.json`), "{", {
    mode: 0o600,
  });
  await saveReceipt(root, wrongEpoch, "succeeded", {
    namespaceEpoch: randomUUID(),
  });
  await saveReceipt(root, wrongID, "succeeded", { requestID: randomUUID() });
  await saveReceipt(root, wrongHash, "succeeded");
  await saveReceipt(root, rollback, "succeeded");
  await saveReceipt(root, success, "succeeded");
  const before = await receiptBytes(root);
  const forgotten: string[] = [];
  const result = await reconcilePendingRequests(requests, {
    readReceipt: (request) => readReceipt(request, root),
    forgetPending: async (request) => {
      forgotten.push(request.requestID);
    },
  });

  assert.deepEqual(forgotten, [success.requestID]);
  assert.deepEqual(
    result.map((value) => value.requestID),
    requests.slice(0, -1).map((value) => value.requestID),
  );
  assert.deepEqual(
    result.map((value) => value.status),
    [
      "unconfirmed",
      "unavailable",
      "unavailable",
      "unavailable",
      "unavailable",
      "unavailable",
    ],
  );
  assert.deepEqual(await receiptBytes(root), before);
  assert.deepEqual(await readdir(join(root, "requests")), []);
});

test("local storage cleanup failure keeps the request and does not block later cleanup", async (t) => {
  const root = await fixture(t);
  const first = pending();
  const second = pending();
  await saveReceipt(root, first, "succeeded");
  await saveReceipt(root, second, "cancelled");
  const stored = new Set([first.requestID, second.requestID]);
  const result = await reconcilePendingRequests([first, second], {
    readReceipt: (request) => readReceipt(request, root),
    forgetPending: async (request) => {
      if (request.requestID === first.requestID)
        throw new Error("storage unavailable");
      stored.delete(request.requestID);
    },
  });

  assert.deepEqual([...stored], [first.requestID]);
  assert.equal(result.length, 1);
  assert.equal(result[0].requestID, first.requestID);
  assert.equal(result[0].status, "unavailable");
  assert.match(requestPresentation(result[0]).subtitle, /Unable|Try Again/);
  assert.equal((await readReceipt(first, root))?.status, "succeeded");
  assert.deepEqual(await readdir(join(root, "requests")), []);
});

test("an already aborted reconciliation does not read or delete any request", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    reconcilePendingRequests([pending()], {
      signal: controller.signal,
      readReceipt: async () => {
        assert.fail("must not read after cancellation");
      },
      forgetPending: async () => {
        assert.fail("must not clean up after cancellation");
      },
    }),
    { code: "cancelled" },
  );
});

test("cancellation during a receipt read prevents its cleanup and subsequent reads", async (t) => {
  const root = await fixture(t);
  const first = pending();
  const second = pending();
  await saveReceipt(root, first, "succeeded");
  await saveReceipt(root, second, "succeeded");
  const before = await receiptBytes(root);
  const controller = new AbortController();
  const read: string[] = [];
  await assert.rejects(
    reconcilePendingRequests([first, second], {
      signal: controller.signal,
      readReceipt: async (request) => {
        read.push(request.requestID);
        const value = await readReceipt(request, root);
        controller.abort();
        return value;
      },
      forgetPending: async () => {
        assert.fail("must not clean up after cancellation");
      },
    }),
    { code: "cancelled" },
  );

  assert.deepEqual(read, [first.requestID]);
  assert.deepEqual(await receiptBytes(root), before);
  assert.deepEqual(await readdir(join(root, "requests")), []);
});

test("cancellation while cleanup is in flight prevents any further operation", async (t) => {
  const root = await fixture(t);
  const first = pending();
  const second = pending();
  await saveReceipt(root, first, "succeeded");
  await saveReceipt(root, second, "succeeded");
  const controller = new AbortController();
  const read: string[] = [];
  const forgotten: string[] = [];
  await assert.rejects(
    reconcilePendingRequests([first, second], {
      signal: controller.signal,
      readReceipt: async (request) => {
        read.push(request.requestID);
        return readReceipt(request, root);
      },
      forgetPending: async (request) => {
        forgotten.push(request.requestID);
        controller.abort();
      },
    }),
    { code: "cancelled" },
  );

  assert.deepEqual(read, [first.requestID]);
  assert.deepEqual(forgotten, [first.requestID]);
  assert.deepEqual(await readdir(join(root, "requests")), []);
});

test("a transient read failure is shown without hiding the other pending requests", async () => {
  const first = pending();
  const second = pending();
  const result = await reconcilePendingRequests([first, second], {
    readReceipt: async (request) => {
      if (request.requestID === first.requestID)
        throw new IntegrationError("permissionDenied");
      return undefined;
    },
    forgetPending: async () => {
      assert.fail("unconfirmed requests must remain");
    },
  });
  assert.deepEqual(
    result.map((value) => value.status),
    ["unavailable", "unconfirmed"],
  );
});

test("presentation uses recognizable action names and review status without exposing identifiers", () => {
  const expectedTitles = [
    "Refresh Shared State",
    "Add Download",
    "Show in HarborDrop",
    "Reveal in Finder",
  ];
  for (const [index, action] of ACTIONS.entries()) {
    const request = {
      ...pending({ action }),
      status: "reconciliationRequired" as const,
    };
    const presentation = requestPresentation(request);
    assert.equal(presentation.title, expectedTitles[index]);
    assert.equal(presentation.subtitle, "Needs Review in HarborDrop");
    assert.equal(
      JSON.stringify(presentation).includes(request.requestID),
      false,
    );
  }
  for (const status of [
    ...RECEIPT_STATUSES,
    "unconfirmed",
    "unavailable",
  ] as const)
    assert.ok(
      requestPresentation({ ...pending(), status }).subtitle.length > 0,
    );
});
