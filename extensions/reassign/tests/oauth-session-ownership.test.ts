import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const shared = vi.hoisted(() => ({
  path: "",
  storage: new Map<string, string>(),
  tokens: undefined as { accessToken: string; refreshToken?: string; isExpired: () => boolean } | undefined,
  beforeCommit: async (_operation: string) => {},
}));
vi.mock("@raycast/api", () => ({
  environment: {
    get supportPath() {
      return shared.path;
    },
  },
  LocalStorage: {
    getItem: async (key: string) => shared.storage.get(key),
    setItem: async (key: string, value: string) => {
      await shared.beforeCommit("setItem");
      shared.storage.set(key, value);
    },
  },
  OAuth: {
    RedirectMethod: { Web: "web" },
    PKCEClient: class {
      getTokens = async () => shared.tokens;
      setTokens = async (value: { access_token: string; refresh_token?: string }) => {
        await shared.beforeCommit("setTokens");
        shared.tokens = { accessToken: value.access_token, refreshToken: value.refresh_token, isExpired: () => false };
      };
      removeTokens = async () => {
        await shared.beforeCommit("removeTokens");
        shared.tokens = undefined;
      };
      authorizationRequest = async () => ({ redirectURI: "https://raycast.com/redirect", codeVerifier: "verifier" });
      authorize = async () => ({ authorizationCode: "code" });
    },
  },
}));

describe.skipIf(process.platform !== "darwin")("credential write ownership (real macOS lock)", () => {
  beforeEach(async () => {
    vi.resetModules();
    shared.path = await mkdtemp(join(tmpdir(), "reassign-write-ownership-"));
    shared.storage.clear();
    shared.tokens = { accessToken: "expired", refreshToken: "refresh", isExpired: () => true };
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(shared.path, { recursive: true, force: true });
  });

  // Every shared session write is paused BEFORE its mutation commits. An abort
  // check after the await cannot undo that mutation, so the next command must wait.
  const writes = [
    { flow: "login", operation: "setTokens" },
    { flow: "login", operation: "setItem" },
    { flow: "logout", operation: "setItem" },
    { flow: "logout", operation: "removeTokens" },
    { flow: "refresh", operation: "setTokens" },
    { flow: "invalid_grant", operation: "removeTokens" },
  ];
  it.each(writes.flatMap((write) => [false, true].map((fails) => ({ ...write, fails }))))(
    "holds ownership through pending $flow $operation (fails: $fails)",
    async ({ flow, operation, fails }) => {
      let finish!: () => void;
      let started!: () => void;
      const pendingWrite = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const entered = new Promise<void>((resolve) => {
        started = resolve;
      });
      let gated = false;
      shared.beforeCommit = async (name) => {
        if (name !== operation || gated) return;
        gated = true;
        started();
        await pendingWrite;
        if (fails) throw new Error("write rejected");
      };
      let request = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          request++;
          if (flow === "invalid_grant" && request === 1) {
            return Response.json({ error: "invalid_grant" }, { status: 400 });
          }
          return Response.json({ access_token: flow === "logout" || request > 1 ? "new-session" : "old-flow" });
        }),
      );
      const first = await import("../src/lib/oauth");
      vi.resetModules();
      const next = await import("../src/lib/oauth");
      const old = (
        flow === "login" ? first.signIn() : flow === "logout" ? first.signOut() : first.getAccessToken()
      ).then(
        () => null,
        (error: unknown) => error,
      );
      await entered;
      // An old heartbeat/mtime must never permit takeover of a pending IPC write.
      for (const file of await readdir(shared.path)) {
        await utimes(join(shared.path, file), new Date(0), new Date(0));
      }
      let newSettled = false;
      const newer = next.signIn().finally(() => {
        newSettled = true;
      });
      try {
        await delay(250);
        expect(newSettled).toBe(false);
      } finally {
        finish();
        await Promise.all([old, newer]);
      }
      expect(shared.tokens?.accessToken).toBe("new-session");
      expect(JSON.parse(shared.storage.get("reassign-session")!).signedOut).toBe(false);
      if (fails) expect(await old).toMatchObject({ message: "write rejected" });
    },
  );
});
