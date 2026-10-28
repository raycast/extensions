import assert from "node:assert/strict";
import test from "node:test";
import {
  AppVerificationSession,
  isFresh,
  parseDescriptor,
  parseSnapshot,
  requireReady,
  retainVisibleState,
  safeURLPreview,
  validateURL,
} from "../src/lib/contract";
import { makeRequest, wakeURL } from "../src/lib/transport";
import {
  IntegrationError,
  openWithVerificationFailure,
  receiptReasonMessage,
} from "../src/lib/errors";
import { descriptor, snapshot } from "./fixtures";

test("version mismatch and incomplete state fail closed", () => {
  assert.throws(() => parseDescriptor({ ...descriptor(), schemaVersion: 2 }), {
    code: "incompatibleSchema",
  });
  assert.throws(() => parseSnapshot({ ...snapshot(), tasks: undefined }), {
    code: "malformed",
  });
  assert.throws(
    () => requireReady({ ...descriptor(), enabled: false }, snapshot()),
    { code: "integrationDisabled" },
  );
  for (const dataHealth of ["loading", "unreadable", "reconciling"] as const)
    assert.throws(
      () => requireReady(descriptor(), { ...snapshot(), dataHealth }),
      { code: "notReady" },
    );
});
test("timestamps, instance rotation, and stale state deny requests", () => {
  const now = 1000;
  assert.equal(isFresh(snapshot(now), now), true);
  assert.equal(isFresh(snapshot(now - 31), now), false);
  assert.equal(isFresh(snapshot(now + 1), now), false);
  assert.throws(
    () =>
      requireReady(
        descriptor(),
        { ...snapshot(now), producerInstanceID: "changed" },
        now,
      ),
    { code: "stale" },
  );
  assert.throws(
    () =>
      makeRequest(
        { descriptor: descriptor(), snapshot: snapshot(now - 31) },
        "reviewAddURL",
        { url: "https://example.com/a", now },
      ),
    { code: "stale" },
  );
});
test("task identity, duplicate IDs, and unknown actions are handled defensively", () => {
  const value = snapshot();
  assert.throws(
    () =>
      parseSnapshot({
        ...value,
        totalTaskCount: 2,
        tasks: [...value.tasks, ...value.tasks],
      }),
    { code: "malformed" },
  );
  const unknown = parseSnapshot({
    ...value,
    tasks: [
      {
        ...value.tasks[0],
        state: "futureState",
        availableActions: ["remove", "showTask"],
      },
    ],
  });
  assert.deepEqual(unknown.tasks[0].availableActions, ["showTask"]);
  assert.throws(
    () =>
      makeRequest({ descriptor: descriptor(), snapshot: unknown }, "showTask", {
        task: unknown.tasks[0],
      }),
    { code: "unsupportedAction" },
  );
  assert.throws(
    () =>
      makeRequest({ descriptor: descriptor(), snapshot: value }, "showTask", {
        task: { ...value.tasks[0], taskRevision: 1 },
      }),
    { code: "unsupportedAction" },
  );
  const request = makeRequest(
    { descriptor: descriptor(), snapshot: value },
    "showTask",
    { task: value.tasks[0] },
  );
  assert.equal(request.taskID, value.tasks[0].taskID);
  assert.equal(request.observedSnapshotRevision, value.snapshotRevision);
  assert.equal("url" in request, false);
});
test("URL validation allows one explicit HTTP URL without credentials", () => {
  assert.equal(
    validateURL(" https://example.com/a?token=private "),
    "https://example.com/a?token=private",
  );
  for (const value of [
    "file:///tmp/a",
    "https://user:pass@example.com/a",
    "javascript:alert(1)",
    "https://example.com/a\nhttps://example.com/b",
    "https://example.com/" + "x".repeat(8192),
  ])
    assert.throws(() => validateURL(value), { code: "invalidURL" });
  assert.equal(
    safeURLPreview("https://example.com/a?token=private#secret").includes(
      "private",
    ),
    false,
  );
});
test("no raw request data is leaked into errors or wake URLs", () => {
  try {
    validateURL("https://secret:password@example.com");
  } catch (error) {
    assert.ok(error instanceof IntegrationError);
    assert.equal(error.message.includes("secret"), false);
  }
  const request = makeRequest(
    { descriptor: descriptor(), snapshot: snapshot() },
    "reviewAddURL",
    { url: "https://example.com/a?token=private" },
  );
  assert.equal(wakeURL(request.requestID).includes("private"), false);
  assert.throws(() => wakeURL("../../file"), { code: "malformed" });
});
test("partial and invalid number snapshots are rejected", () => {
  const value = snapshot();
  assert.throws(() => parseSnapshot({ ...value, totalTaskCount: 0 }), {
    code: "malformed",
  });
  assert.throws(
    () =>
      parseSnapshot({
        ...value,
        tasks: [{ ...value.tasks[0], completedBytes: -1 }],
      }),
    { code: "malformed" },
  );
  assert.throws(
    () =>
      parseSnapshot({ ...value, tasks: [{ ...value.tasks[0], progress: 2 }] }),
    { code: "malformed" },
  );
  assert.equal(
    parseSnapshot({ ...value, truncated: true, totalTaskCount: 5 })
      .totalTaskCount,
    5,
  );
});

test("additive access policy rejects legacy or unknown producers without changing schema 1", () => {
  assert.throws(
    () => parseDescriptor({ ...descriptor(), accessPolicyVersion: undefined }),
    { code: "upgradeRequired" },
  );
  assert.throws(
    () => parseDescriptor({ ...descriptor(), accessPolicyVersion: 2 }),
    { code: "incompatibleSchema" },
  );
  assert.throws(() => parseSnapshot({ ...snapshot(), access: undefined }), {
    code: "upgradeRequired",
  });
  assert.throws(
    () => parseSnapshot({ ...snapshot(), accessPolicyVersion: undefined }),
    { code: "upgradeRequired" },
  );
  assert.equal(parseDescriptor(descriptor()).schemaVersion, 1);
});

test("licensed and trial access require an explicit finite future deadline", () => {
  const now = 1000;
  for (const state of ["licensed", "trial"] as const) {
    requireReady(
      descriptor(),
      { ...snapshot(now), access: { state, validUntil: now + 1 } },
      now,
    );
    assert.throws(
      () =>
        requireReady(
          descriptor(),
          { ...snapshot(now), access: { state, validUntil: now } },
          now,
        ),
      { code: "accessExpired" },
    );
    assert.throws(
      () =>
        requireReady(
          descriptor(),
          { ...snapshot(now), access: { state, validUntil: now - 1 } },
          now,
        ),
      { code: "accessExpired" },
    );
    for (const validUntil of [undefined, null, Infinity, NaN, "tomorrow"])
      assert.throws(
        () =>
          parseSnapshot({ ...snapshot(now), access: { state, validUntil } }),
        { code: "incompatibleSchema" },
      );
  }
});

test("checking and blocked access are never interpreted as an empty download list", () => {
  for (const [state, code] of [
    ["checking", "accessChecking"],
    ["licenseRequired", "licenseRequired"],
    ["verificationRequired", "verificationRequired"],
    ["integrityBlocked", "integrityBlocked"],
  ] as const) {
    const blocked = parseSnapshot({
      ...snapshot(),
      access: { state },
      tasks: [],
      totalTaskCount: 0,
      capabilities: [],
    });
    assert.throws(() => requireReady(descriptor(), blocked), { code });
    assert.throws(
      () =>
        makeRequest(
          { descriptor: descriptor(), snapshot: blocked },
          "reviewAddURL",
          { url: "https://example.invalid/file" },
        ),
      { code },
    );
    assert.throws(
      () =>
        parseSnapshot({
          ...blocked,
          access: { state, validUntil: Date.now() / 1000 + 100 },
        }),
      { code: "incompatibleSchema" },
    );
  }
  assert.throws(
    () => parseSnapshot({ ...snapshot(), access: { state: "futurePolicy" } }),
    { code: "incompatibleSchema" },
  );
});

test("explicit access or compatibility failures purge last-good data while ordinary stale remains read-only", () => {
  const previous = { descriptor: descriptor(), snapshot: snapshot(1000) };
  for (const code of [
    "accessChecking",
    "licenseRequired",
    "verificationRequired",
    "integrityBlocked",
    "accessExpired",
    "upgradeRequired",
    "incompatibleSchema",
    "appSignatureInvalid",
    "appVerificationFailed",
    "appChanged",
    "integrationDisabled",
  ] as const)
    assert.equal(
      retainVisibleState(previous, new IntegrationError(code), 1001),
      undefined,
    );
  assert.equal(
    retainVisibleState(previous, new IntegrationError("stale"), 1031),
    previous,
  );
  assert.equal(
    retainVisibleState(previous, new IntegrationError("unreadable"), 1001),
    previous,
  );
  assert.equal(
    retainVisibleState(previous, new IntegrationError("stale"), 4600),
    undefined,
  );
  assert.equal(
    retainVisibleState(
      {
        ...previous,
        snapshot: {
          ...previous.snapshot,
          access: { state: "licenseRequired" },
        },
      },
      undefined,
      1001,
    ),
    undefined,
  );
});

test("request reason UI never echoes an unknown server or credential string", () => {
  const privateReason = "token=secret-device-value";
  assert.equal(
    receiptReasonMessage(privateReason)?.includes(privateReason),
    false,
  );
  assert.match(
    receiptReasonMessage("licenseBlocked") ?? "",
    /license or trial/i,
  );
  assert.equal(receiptReasonMessage(undefined), undefined);
});

test("first app verification failure is latched and polling never starts another verification", async () => {
  const session = new AppVerificationSession();
  let calls = 0;
  assert.equal(session.state, "unattempted");
  assert.equal(session.canPoll(), false);
  await assert.rejects(
    session.verify(async () => {
      calls += 1;
      throw new IntegrationError("appVerificationFailed");
    }),
    { code: "appVerificationFailed" },
  );
  assert.equal(session.state, "failed");
  for (let poll = 0; poll < 5; poll += 1)
    assert.equal(session.canPoll(), false);
  assert.equal(calls, 1);
  await session.verify(async () => {
    calls += 1;
    return "verified";
  });
  assert.equal(session.canPoll(), true);
  assert.equal(calls, 2);
});

test("a failed refresh revokes previous verification and prevents an in-flight poll from restoring cached downloads", async () => {
  const session = new AppVerificationSession();
  await session.verify(async () => true);
  const pollGeneration = session.generation;
  const oldState = { descriptor: descriptor(), snapshot: snapshot(1000) };
  let cache: typeof oldState | undefined = oldState;
  const failure = new IntegrationError("appChanged");
  await assert.rejects(
    session.verify(async () => {
      throw failure;
    }),
    { code: "appChanged" },
  );
  cache = retainVisibleState(cache, failure, 1001);
  if (session.accepts(pollGeneration)) cache = oldState;
  assert.equal(cache, undefined);
  assert.equal(session.state, "failed");
  assert.equal(session.canPoll(), false);
  await session.verify(async () => true);
  assert.equal(session.accepts(pollGeneration), false);
  assert.equal(session.accepts(session.generation), true);
});

test("late verification success cannot undo a newer explicit failure", async () => {
  const session = new AppVerificationSession();
  let finish: (() => void) | undefined;
  const old = session.verify(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  assert.equal(session.state, "verifying");
  assert.equal(session.canPoll(), false);
  await assert.rejects(
    session.verify(async () => {
      throw new IntegrationError("appSignatureInvalid");
    }),
    { code: "appSignatureInvalid" },
  );
  finish?.();
  await assert.rejects(old, { code: "cancelled" });
  assert.equal(session.state, "failed");
});

test("a stale failure cannot revoke a newer successful verification", async () => {
  const session = new AppVerificationSession();
  let fail: ((error: Error) => void) | undefined;
  const old = session.verify(
    () =>
      new Promise<void>((_, reject) => {
        fail = reject;
      }),
  );
  await session.verify(async () => true);
  fail?.(new IntegrationError("appVerificationFailed"));
  await assert.rejects(old, { code: "cancelled" });
  assert.equal(session.state, "verified");
  const generation = session.generation;
  session.invalidate();
  assert.equal(session.accepts(generation), false);
  assert.equal(session.canPoll(), false);
});

test("common recovery and request-detail opens invalidate the parent session before reporting a verification failure", async () => {
  for (const target of ["app", "same-request"]) {
    const session = new AppVerificationSession();
    await session.verify(async () => true);
    const pollGeneration = session.generation;
    const previous = { descriptor: descriptor(), snapshot: snapshot(1000) };
    let cached: typeof previous | undefined = previous;
    const trackedRequest = {
      requestID: "10000000-0000-4000-8000-000000000001",
    };
    const error = new IntegrationError("appChanged");
    let notified = false;
    await assert.rejects(
      openWithVerificationFailure(
        async () => {
          throw error;
        },
        (failure) => {
          notified = true;
          session.invalidate();
          cached = retainVisibleState(cached, failure, 1001);
        },
      ),
      error,
    );
    assert.equal(notified, true, target);
    if (session.accepts(pollGeneration)) cached = previous;
    assert.equal(cached, undefined, target);
    assert.equal(session.canPoll(), false, target);
    assert.equal(
      trackedRequest.requestID,
      "10000000-0000-4000-8000-000000000001",
    );
  }
});

test("a common app-open error preserves verification and remains visible without destroying request tracking", async () => {
  const session = new AppVerificationSession();
  await session.verify(async () => true);
  let invalidated = false;
  const fail = () => {
    invalidated = true;
    session.invalidate();
  };
  await assert.rejects(
    openWithVerificationFailure(async () => {
      throw new IntegrationError("appOpenFailed");
    }, fail),
    { code: "appOpenFailed" },
  );
  assert.equal(invalidated, false);
  assert.equal(session.canPoll(), true);
  assert.equal(
    await openWithVerificationFailure(async () => "opened", fail),
    "opened",
  );
});
