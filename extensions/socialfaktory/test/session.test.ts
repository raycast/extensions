import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { McpUnauthorizedError, type CallOptions } from "../src/lib/mcp.ts";
import {
  CONNECTION_RENEWED,
  ConnectionRenewedError,
  SIGN_IN_REJECTED,
  TOKEN_REJECTED,
  createSession,
  type Credentials,
  type SessionDependencies,
} from "../src/lib/session.ts";

type Script = {
  credentials: Credentials[];
  renewed?: string;
  rejected: Set<string>;
};

function harness(script: Script) {
  const log: string[] = [];
  const dependencies: SessionDependencies = {
    credentials: async () => {
      const next = script.credentials.shift();
      if (!next) throw new Error("no more credentials");
      log.push(`credentials:${next.token}`);
      return next;
    },
    renew: async (stale) => {
      log.push(`renew:${stale}`);
      return script.renewed;
    },
    forget: async (stale) => {
      log.push(`forget:${stale}`);
    },
    connect: (token) => ({
      callTool: async <T>(name: string) => {
        log.push(`call:${name}:${token}`);
        if (script.rejected.has(token)) throw new McpUnauthorizedError();
        return { token } as T;
      },
    }),
  };
  return { session: createSession(dependencies), log };
}

describe("createSession", () => {
  it("reuses the session for later calls", async () => {
    const { session, log } = harness({ credentials: [{ token: "a", type: "oauth" }], rejected: new Set() });

    await session.call("list_brands");
    await session.call("get_wallet");

    assert.deepEqual(log, ["credentials:a", "call:list_brands:a", "call:get_wallet:a"]);
  });

  it("refreshes once after a 401 and retries with the new token", async () => {
    const { session, log } = harness({
      credentials: [{ token: "a", type: "oauth" }],
      renewed: "b",
      rejected: new Set(["a"]),
    });

    assert.deepEqual(await session.call("get_wallet"), { token: "b" });
    assert.deepEqual(log, ["credentials:a", "call:get_wallet:a", "renew:a", "call:get_wallet:b"]);
  });

  it("signs in again when the refreshed token is also refused", async () => {
    const { session, log } = harness({
      credentials: [
        { token: "a", type: "oauth" },
        { token: "c", type: "oauth" },
      ],
      renewed: "b",
      rejected: new Set(["a", "b"]),
    });

    assert.deepEqual(await session.call("get_wallet"), { token: "c" });
    assert.deepEqual(log.slice(3), ["call:get_wallet:b", "forget:b", "credentials:c", "call:get_wallet:c"]);
  });

  it("signs in again when there is nothing to refresh", async () => {
    const { session, log } = harness({
      credentials: [
        { token: "a", type: "oauth" },
        { token: "c", type: "oauth" },
      ],
      rejected: new Set(["a"]),
    });

    assert.deepEqual(await session.call("get_wallet"), { token: "c" });
    assert.deepEqual(log.slice(2), ["renew:a", "forget:a", "credentials:c", "call:get_wallet:c"]);
  });

  it("does not resend a spending call on a connection it had to sign in again for", async () => {
    const { session, log } = harness({
      credentials: [
        { token: "a", type: "oauth" },
        { token: "c", type: "oauth" },
      ],
      rejected: new Set(["a"]),
    });

    await assert.rejects(session.call("generate_text", {}, { resendAfterSignIn: false }), (error: unknown) => {
      assert.ok(error instanceof ConnectionRenewedError);
      assert.equal((error as Error).message, CONNECTION_RENEWED);
      return true;
    });
    assert.deepEqual(log, ["credentials:a", "call:generate_text:a", "renew:a", "forget:a", "credentials:c"]);
    assert.deepEqual(await session.call("get_wallet"), { token: "c" });
  });

  it("still resends it after a refresh, which keeps the same connection", async () => {
    const { session, log } = harness({
      credentials: [{ token: "a", type: "oauth" }],
      renewed: "b",
      rejected: new Set(["a"]),
    });

    assert.deepEqual(await session.call("generate_text", {}, { resendAfterSignIn: false }), { token: "b" });
    assert.deepEqual(log, ["credentials:a", "call:generate_text:a", "renew:a", "call:generate_text:b"]);
  });

  it("explains a sign in the server still refuses and does not keep that session", async () => {
    const { session, log } = harness({
      credentials: [
        { token: "a", type: "oauth" },
        { token: "c", type: "oauth" },
        { token: "d", type: "oauth" },
      ],
      rejected: new Set(["a", "c"]),
    });

    await assert.rejects(session.call("get_wallet"), { message: SIGN_IN_REJECTED });
    assert.deepEqual(await session.call("get_wallet"), { token: "d" });
    assert.equal(log.at(-2), "credentials:d");
  });

  it("asks for a new personal token instead of signing in", async () => {
    const { session, log } = harness({ credentials: [{ token: "p", type: "personal" }], rejected: new Set(["p"]) });

    await assert.rejects(session.call("get_wallet"), { message: TOKEN_REJECTED });
    assert.deepEqual(log, ["credentials:p", "call:get_wallet:p"]);
  });

  it("passes the call options to every attempt", async () => {
    const seen: (CallOptions | undefined)[] = [];
    const controller = new AbortController();
    const session = createSession({
      credentials: async () => ({ token: "a", type: "oauth" }),
      renew: async () => "b",
      forget: async () => {},
      connect: (token) => ({
        callTool: async <T>(_name: string, _args?: Record<string, unknown>, options?: CallOptions) => {
          seen.push(options);
          if (token === "a") throw new McpUnauthorizedError();
          return {} as T;
        },
      }),
    });

    await session.call("generate_text", {}, { signal: controller.signal, timeoutMs: 60_000 });

    assert.deepEqual(seen, [
      { signal: controller.signal, timeoutMs: 60_000 },
      { signal: controller.signal, timeoutMs: 60_000 },
    ]);
  });

  it("points to Sign in Again instead of the preferences", () => {
    assert.match(SIGN_IN_REJECTED, /Sign in Again/);
    assert.doesNotMatch(SIGN_IN_REJECTED, /preferences/);
    assert.doesNotMatch(CONNECTION_RENEWED, /preferences/);
  });

  it("drops the cached connection when asked to start over", async () => {
    const { session, log } = harness({
      credentials: [
        { token: "a", type: "oauth" },
        { token: "b", type: "oauth" },
      ],
      rejected: new Set(),
    });

    await session.call("get_wallet");
    session.reset();
    assert.deepEqual(await session.call("get_wallet"), { token: "b" });
    assert.deepEqual(log, ["credentials:a", "call:get_wallet:a", "credentials:b", "call:get_wallet:b"]);
  });

  it("passes other failures through untouched", async () => {
    const failure = new Error("boom");
    const session = createSession({
      credentials: async () => ({ token: "a", type: "oauth" }),
      renew: async () => assert.fail("renewed"),
      forget: async () => assert.fail("forgot"),
      connect: () => ({
        callTool: async () => {
          throw failure;
        },
      }),
    });

    await assert.rejects(session.call("get_wallet"), failure);
  });
});
