import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

const oldSession = {
  accessToken: "old-access",
  refreshToken: "old-refresh",
  isExpired: () => true,
};
const response = () =>
  new Response(
    JSON.stringify({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 3600,
    }),
  );

function setup() {
  let stored: unknown = oldSession;
  let writes = 0;
  let requests = 0;
  const tokenStore = {
    getTokens: async () => stored,
    setTokens: async (tokens: unknown) => {
      writes++;
      stored = tokens;
    },
    removeTokens: async () => {
      stored = undefined;
    },
    authorizationRequest: async () => ({
      redirectURI: "https://raycast.com/redirect",
      state: "state",
      codeChallenge: "challenge",
      codeVerifier: "verifier",
    }),
    authorize: async () => ({ authorizationCode: "code" }),
  };
  const network = { fetch: async () => response() };
  const exports = {} as typeof import("../src/lib/store-auth");
  const source = readFileSync(
    new URL("../src/lib/store-auth.ts", import.meta.url),
    "utf8",
  );
  // Exercise the actual auth module with isolated Raycast storage and network.
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
      },
    }).outputText,
    {
      exports,
      require(id: string) {
        if (id === "@raycast/api")
          return {
            OAuth: {
              PKCEClient: function () {
                return tokenStore;
              },
              RedirectMethod: { Web: "web" },
            },
          };
        if (id === "./auth-config")
          return {
            AUTH_URL: "https://auth.example",
            AUTH_PUBLIC_KEY: "public",
          };
        if (id === "./paths")
          return { TARGET_APP: { name: "Glaze", bundleId: "test.glaze" } };
        throw new Error(`Unexpected import: ${id}`);
      },
      fetch: () => {
        requests++;
        return network.fetch();
      },
      AbortSignal,
      URL,
      URLSearchParams,
    },
  );
  return {
    auth: exports,
    tokenStore,
    network,
    stored: () => stored,
    writes: () => writes,
    requests: () => requests,
  };
}

test("disconnect invalidates a token read that resumes after disconnect finishes", async () => {
  const h = setup();
  const read = deferred<typeof oldSession>();
  h.tokenStore.getTokens = () => read.promise;
  const token = h.auth.getStoreAccessToken();
  const rejected = assert.rejects(token, h.auth.StoreSignInRequired);
  await h.auth.disconnectStore();
  read.resolve(oldSession);
  await rejected;
  assert.equal(h.requests(), 0);
  assert.equal(h.writes(), 0);
  assert.equal(h.stored(), undefined);
});

test("disconnect blocks new token reads and coalesces repeated disconnects", async () => {
  const h = setup();
  const removing = deferred<void>();
  const started = deferred<void>();
  const remove = h.tokenStore.removeTokens;
  h.tokenStore.removeTokens = async () => {
    started.resolve();
    await removing.promise;
    await remove();
  };
  const disconnect = h.auth.disconnectStore();
  await started.promise;
  assert.equal(h.auth.disconnectStore(), disconnect);
  await assert.rejects(
    h.auth.getStoreAccessToken(),
    h.auth.StoreSignInRequired,
  );
  assert.equal(await h.auth.hasStoreSession(), false);
  assert.equal(h.requests(), 0);
  removing.resolve();
  await disconnect;
});

test("disconnect prevents an in-flight refresh response from saving tokens", async () => {
  const h = setup();
  const refresh = deferred<Response>();
  const started = deferred<void>();
  h.network.fetch = () => {
    started.resolve();
    return refresh.promise;
  };
  const rejected = assert.rejects(
    h.auth.getStoreAccessToken(),
    h.auth.StoreSignInRequired,
  );
  await started.promise;
  const disconnect = h.auth.disconnectStore();
  refresh.resolve(response());
  await Promise.all([rejected, disconnect]);
  assert.equal(h.writes(), 0);
  assert.equal(h.stored(), undefined);
});

test("disconnect waits for a token write already handed to Raycast before removal", async () => {
  const h = setup();
  const write = deferred<void>();
  const started = deferred<void>();
  const save = h.tokenStore.setTokens;
  h.tokenStore.setTokens = async (tokens) => {
    started.resolve();
    await write.promise;
    await save(tokens);
  };
  const rejected = assert.rejects(
    h.auth.signInToStore("google"),
    h.auth.StoreSignInRequired,
  );
  await started.promise;
  const disconnect = h.auth.disconnectStore();
  write.resolve();
  await Promise.all([rejected, disconnect]);
  assert.equal(h.writes(), 1);
  assert.equal(h.stored(), undefined);
});

test("a sign-in begun before disconnect cannot restore tokens, but a later sign-in can", async () => {
  const h = setup();
  const authorization = deferred<{ authorizationCode: string }>();
  h.tokenStore.authorize = () => authorization.promise;
  const rejected = assert.rejects(
    h.auth.signInToStore("google"),
    h.auth.StoreSignInRequired,
  );
  await h.auth.disconnectStore();
  authorization.resolve({ authorizationCode: "old-code" });
  await rejected;
  assert.equal(h.writes(), 0);
  assert.equal(h.stored(), undefined);
  await h.auth.signInToStore("apple");
  assert.equal(h.writes(), 1);
  assert.equal(await h.auth.hasStoreSession(), true);
});

test("concurrent expired-session requests share one successful refresh", async () => {
  const h = setup();
  assert.deepEqual(
    await Promise.all([
      h.auth.getStoreAccessToken(),
      h.auth.getStoreAccessToken(),
    ]),
    ["new-access", "new-access"],
  );
  assert.equal(h.requests(), 1);
  assert.equal(h.writes(), 1);
});
