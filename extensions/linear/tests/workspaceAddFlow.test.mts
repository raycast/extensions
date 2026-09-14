import assert from "node:assert/strict";
import test from "node:test";

import type { OAuth } from "@raycast/api";

import { createWorkspaceAddFlow } from "../src/api/workspaceAddFlow.ts";

type Dependencies = Parameters<typeof createWorkspaceAddFlow>[0];
type Identity = Awaited<ReturnType<Dependencies["identify"]>>;
type Tokens = NonNullable<Awaited<ReturnType<Dependencies["staging"]["getTokens"]>>>;

const identity: Identity = {
  orgId: "workspace-b",
  userId: "account-b",
  orgName: "Workspace B",
  userEmail: "account@example.invalid",
  urlKey: "workspace-b",
};

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

function fixture() {
  const grant: Tokens = {
    accessToken: "fake-access-token",
    refreshToken: "fake-refresh-token",
    idToken: "fake-id-token",
    scope: "read write",
    expiresIn: 3600,
    updatedAt: new Date(),
    isExpired: () => false,
  };
  const state = {
    staged: undefined as Tokens | undefined,
    destination: undefined as OAuth.TokenSetOptions | undefined,
    registered: false,
    publishedWithoutCredentials: false,
    pending: false,
    authorizeCalls: 0,
    destinationWrites: 0,
    identityCalls: 0,
    failStage: "",
    authorizationGate: undefined as ReturnType<typeof deferred> | undefined,
    recoveryGate: undefined as ReturnType<typeof deferred> | undefined,
  };
  const fail = (stage: string) => {
    if (state.failStage === stage) throw new Error(`Injected ${stage} failure`);
  };
  const dependencies: Dependencies = {
    staging: {
      getTokens: async () => state.staged,
      removeTokens: async () => {
        fail("cleanup");
        state.staged = undefined;
      },
    },
    hasPendingAdd: async () => {
      if (state.recoveryGate) await state.recoveryGate.promise;
      return state.pending;
    },
    markPendingAdd: async () => {
      state.pending = true;
    },
    clearPendingAdd: async () => {
      state.pending = false;
    },
    authorize: async () => {
      state.authorizeCalls++;
      if (state.authorizationGate) await state.authorizationGate.promise;
      state.staged = grant;
      return grant.accessToken;
    },
    identify: async () => {
      state.identityCalls++;
      fail("identity");
      if (state.failStage === "permanent") throw new Error("Linear identity query failed: HTTP 401");
      return identity;
    },
    verify: async () => {
      fail("verification");
    },
    getDestination: async () => ({
      setTokens: async (tokens) => {
        state.destinationWrites++;
        fail("destination");
        assert.ok("accessToken" in tokens);
        state.destination = tokens;
      },
    }),
    register: async () => {
      fail("registry");
      state.publishedWithoutCredentials ||= !state.destination;
      const isNew = !state.registered;
      state.registered = true;
      return { isNew };
    },
    trace: async (_stage, operation) => operation(),
  };
  return { state, grant, flow: createWorkspaceAddFlow(dependencies) };
}

test("a workspace becomes visible only after its credentials are saved", async () => {
  const { state, flow } = fixture();
  assert.deepEqual(await flow.add(), { identity, isNew: true });
  assert.equal(state.publishedWithoutCredentials, false);
  assert.equal(state.registered, true);
  assert.equal(state.pending, false);
  assert.equal(state.staged, undefined);
  assert.equal(state.destination?.accessToken, "fake-access-token");
  assert.equal(state.destination?.refreshToken, "fake-refresh-token");
  assert.equal(state.destination?.idToken, "fake-id-token");
});

test("a failed credential save preserves recovery and publishes no workspace", async () => {
  const { state, flow } = fixture();
  state.failStage = "destination";
  await assert.rejects(flow.add(), /Injected destination failure/);
  assert.equal(state.registered, false);
  assert.equal(state.pending, true);
  assert.ok(state.staged);
  state.failStage = "";
  assert.deepEqual(await flow.recover(), { identity, isNew: true });
  assert.equal(state.registered, true);
  assert.equal(state.authorizeCalls, 1);
});

test("a failed registry write preserves credentials and retries without another browser grant", async () => {
  const { state, flow } = fixture();
  state.failStage = "registry";
  await assert.rejects(flow.add(), /Injected registry failure/);
  assert.ok(state.destination);
  assert.ok(state.staged);
  assert.equal(state.pending, true);
  state.failStage = "";
  await flow.recover();
  assert.equal(state.registered, true);
  assert.equal(state.authorizeCalls, 1);
});

for (const stage of ["identity", "verification"]) {
  test(`a transient ${stage} failure can be recovered on reopening`, async () => {
    const { state, flow } = fixture();
    state.failStage = stage;
    await assert.rejects(flow.add(), new RegExp(`Injected ${stage} failure`));
    assert.equal(state.registered, false);
    assert.equal(state.pending, true);
    assert.ok(state.staged);
    state.failStage = "";
    await flow.recover();
    assert.equal(state.registered, true);
  });
}

test("a rejected credential is discarded rather than retried on every open", async () => {
  const { state, flow } = fixture();
  state.failStage = "permanent";
  await assert.rejects(flow.add(), /HTTP 401/);
  assert.equal(state.staged, undefined);
  assert.equal(state.pending, false);
  assert.equal(state.registered, false);
});

test("an empty staging slot does not cancel an unfinished authorization", async () => {
  const { state, grant, flow } = fixture();
  state.pending = true;
  assert.equal(await flow.recover(), null);
  assert.equal(state.pending, true);
  state.staged = grant;
  assert.deepEqual(await flow.recover(), { identity, isNew: true });
});

test("a stray staging credential without an add marker is never registered", async () => {
  const { state, grant, flow } = fixture();
  state.staged = grant;
  assert.equal(await flow.recover(), null);
  assert.equal(state.registered, false);
  assert.equal(state.identityCalls, 0);
});

test("recovery during a live authorization waits for the same operation", async () => {
  const { state, flow } = fixture();
  state.authorizationGate = deferred();
  const adding = flow.add();
  await new Promise((resolve) => setImmediate(resolve));
  const recovering = flow.recover();
  state.authorizationGate.resolve();
  const [added, recovered] = await Promise.all([adding, recovering]);
  assert.deepEqual(recovered, added);
  assert.equal(state.authorizeCalls, 1);
  assert.equal(state.destinationWrites, 1);
});

test("repeated Add actions share one authorization", async () => {
  const { state, flow } = fixture();
  state.authorizationGate = deferred();
  const first = flow.add();
  const second = flow.add();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.authorizeCalls, 1);
  state.authorizationGate.resolve();
  assert.deepEqual(await first, await second);
  assert.equal(state.destinationWrites, 1);
});

test("an Add action during initial recovery starts after recovery finishes", async () => {
  const { state, flow } = fixture();
  state.recoveryGate = deferred();
  const recovering = flow.recover();
  const adding = flow.add();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.authorizeCalls, 0);
  state.recoveryGate.resolve();
  await recovering;
  assert.deepEqual(await adding, { identity, isNew: true });
  assert.equal(state.authorizeCalls, 1);
});

test("token copying preserves the remaining lifetime and optional expiry", async () => {
  const { state, grant, flow } = fixture();
  state.pending = true;
  state.staged = { ...grant, updatedAt: new Date(Date.now() - 120_000) };
  await flow.recover();
  assert.ok(state.destination?.expiresIn && state.destination.expiresIn <= 3480);
  state.pending = true;
  state.staged = { ...grant, expiresIn: undefined };
  await flow.recover();
  assert.equal(Object.hasOwn(state.destination!, "expiresIn"), false);
});
