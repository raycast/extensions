const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, overrides = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src/utils", file), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    require: (id) =>
      overrides[id] ??
      (id === "./diagnostics"
        ? { diagnostic: () => {} }
        : id === "./granolaFetch"
          ? { granolaFetch: (...args) => globals.fetch(...args) }
          : require(id)),
    Buffer,
    URL,
    URLSearchParams,
    AbortSignal,
    ...globals,
  });
  return exports;
}
const protocol = load("granolaAuthProtocol.ts");
test("empty document nodes never emit literal undefined", () => {
  const converter = load("convertJsonNodes.ts");
  for (const type of ["paragraph", "heading", "bulletList", "listItem"]) {
    assert.equal(converter.convertNodeToMarkdown({ type }).includes("undefined"), false);
  }
});
test("document listing uses POST, matching Granola's current endpoint", async () => {
  let request;
  const data = load(
    "fetchData.ts",
    {
      "@raycast/utils": { showFailureToast: () => {} },
      react: {},
      "./getAccessToken": { __esModule: true, default: async () => "test-access" },
      "./errorUtils": { isAbortError: () => false, toError: (e) => e },
    },
    {
      fetch: async (url, options) => {
        request = { url, ...options };
        return new Response(JSON.stringify({ docs: [{ id: "note" }] }));
      },
    },
  );
  const docs = await data.getDocumentsList();
  assert.equal(docs.length, 1);
  assert.equal(request.url, "https://api.granola.ai/v2/get-documents");
  assert.equal(request.method, "POST");
  assert.equal(request.body, "{}");
});
const jwt = (exp) => "header." + Buffer.from(JSON.stringify({ exp })).toString("base64url") + ".signature";

test("JWT expiry is used when WorkOS omits expires_in, with a refresh margin", () => {
  const parsed = protocol.parseTokens({ access_token: jwt(Date.now() / 1000 + 3600), refresh_token: "test-refresh" });
  assert.ok(parsed.expiresIn >= 3538 && parsed.expiresIn <= 3540);
});
test("incomplete, expired and malformed sessions are rejected without disclosing credentials", () => {
  for (const body of [
    { access_token: "secret" },
    { access_token: "secret", refresh_token: "secret" },
    { access_token: jwt(1), refresh_token: "secret" },
  ]) {
    assert.throws(
      () => protocol.parseTokens(body),
      (e) => !e.message.includes("secret"),
    );
  }
});
test("device polling follows pending and slow_down and stops on denial/expiry", () => {
  assert.equal(protocol.nextPoll("authorization_pending", 5), 5);
  assert.equal(protocol.nextPoll("slow_down", 5), 10);
  assert.throws(() => protocol.nextPoll("access_denied", 5), /declined/);
  assert.throws(() => protocol.nextPoll("expired_token", 5), /expired/);
});
test("device URL must belong to Granola", async () => {
  const p = load(
    "granolaAuthProtocol.ts",
    {},
    {
      fetch: async () =>
        new Response(
          JSON.stringify({
            device_code: "device",
            user_code: "CODE",
            verification_uri_complete: "https://example.com/device",
            expires_in: 300,
          }),
        ),
    },
  );
  await assert.rejects(p.requestDeviceGrant(), /unexpected/);
});
test("malformed server responses do not expose their body", async () => {
  const p = load("granolaAuthProtocol.ts", {}, { fetch: async () => new Response("secret-token", { status: 502 }) });
  await assert.rejects(p.requestDeviceGrant(), (e) => /502/.test(e.message) && !e.message.includes("secret"));
});
test("cancellation reaches the network request", async () => {
  const p = load(
    "granolaAuthProtocol.ts",
    {},
    {
      fetch: async (_url, options) => {
        options.signal.throwIfAborted();
      },
    },
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(p.requestDeviceGrant(controller.signal), { name: "AbortError" });
});

function harness(exchange) {
  const supportPath = fs.mkdtempSync(path.join(os.tmpdir(), "granola-auth-test-"));
  let saved = { accessToken: "old-access", refreshToken: "old-refresh", isExpired: () => true };
  let failSave = false;
  const api = {
    environment: { supportPath },
    OAuth: {
      RedirectMethod: { Web: "web" },
      PKCEClient: class {
        async getTokens() {
          return saved;
        }
        async setTokens(tokens) {
          if (failSave) throw new Error("Storage unavailable");
          saved = { ...tokens, isExpired: () => false };
        }
        async removeTokens() {
          saved = undefined;
        }
      },
    },
  };
  const overrides = {
    "@raycast/api": api,
    "./granolaAuthProtocol": { exchangeToken: exchange, parseTokens: protocol.parseTokens },
  };
  return {
    instance: () => load("getAccessToken.ts", overrides),
    get: () => saved,
    locks: () => fs.readdirSync(supportPath),
    failSave: () => {
      failSave = true;
    },
    set: (v) => {
      saved = v;
    },
    cleanup: () => fs.rmSync(supportPath, { recursive: true, force: true }),
  };
}
test("separate command processes share one rotating refresh; new token is persisted", async () => {
  let calls = 0;
  const h = harness(async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 40));
    return {
      response: { ok: true },
      body: { access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 },
    };
  });
  try {
    const a = h.instance(),
      b = h.instance();
    assert.deepEqual(await Promise.all([a.default(), a.default(), b.default()]), [
      "new-access",
      "new-access",
      "new-access",
    ]);
    assert.equal(calls, 1);
    assert.equal(h.get().refreshToken, "new-refresh");
  } finally {
    h.cleanup();
  }
});
test("revoked session becomes sign-in required", async () => {
  const h = harness(async () => ({ response: { ok: false, status: 400 }, body: { error: "invalid_grant" } }));
  try {
    await assert.rejects(h.instance().default(), { name: "SignInRequired" });
    assert.equal(h.get(), undefined);
  } finally {
    h.cleanup();
  }
});
test("temporary HTTP error keeps the session for retry", async () => {
  const h = harness(async () => ({ response: { ok: false, status: 503 }, body: {} }));
  try {
    await assert.rejects(h.instance().default(), /503/);
    assert.equal(h.get().refreshToken, "old-refresh");
  } finally {
    h.cleanup();
  }
});
test("ambiguous refresh outcome retains its lock to prevent token replay", async () => {
  const h = harness(async () => {
    throw new Error("Connection lost");
  });
  try {
    await assert.rejects(h.instance().default(), /Connection lost/);
    assert.equal(h.locks().length, 1);
  } finally {
    h.cleanup();
  }
});
test("failed persistence does not allow replaying the old refresh token", async () => {
  const h = harness(async () => ({
    response: { ok: true },
    body: { access_token: "new", refresh_token: "new", expires_in: 3600 },
  }));
  h.failSave();
  try {
    await assert.rejects(h.instance().default(), /Storage unavailable/);
    assert.equal(h.locks().length, 1);
    assert.equal(h.get().refreshToken, "old-refresh");
  } finally {
    h.cleanup();
  }
});
test("forced refresh rotates even a currently valid session", async () => {
  const h = harness(async () => ({
    response: { ok: true },
    body: { access_token: "new", refresh_token: "new", expires_in: 3600 },
  }));
  h.set({ accessToken: "valid", refreshToken: "old-refresh", isExpired: () => false });
  try {
    assert.equal(await h.instance().default(true), "new");
    assert.equal(h.get().refreshToken, "new");
  } finally {
    h.cleanup();
  }
});
test("logout during refresh cannot resurrect the signed-out session", async () => {
  let h;
  h = harness(async () => {
    h.set(undefined);
    return { response: { ok: true }, body: { access_token: "new", refresh_token: "new", expires_in: 3600 } };
  });
  try {
    await assert.rejects(h.instance().default(), { name: "SignInRequired" });
    assert.equal(h.get(), undefined);
  } finally {
    h.cleanup();
  }
});
test("concurrent 401s recover a locally unexpired token once across processes", async () => {
  let calls = 0;
  const h = harness(async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 40));
    return {
      response: { ok: true },
      body: { access_token: "replacement", refresh_token: "rotated", expires_in: 3600 },
    };
  });
  h.set({ accessToken: "rejected", refreshToken: "old-refresh", isExpired: () => false });
  try {
    const a = h.instance(),
      b = h.instance();
    const lookup = a.default();
    const results = await Promise.all([
      a.refreshRejectedAccessToken("rejected"),
      a.refreshRejectedAccessToken("rejected"),
      b.refreshRejectedAccessToken("rejected"),
    ]);
    assert.equal(await lookup, "rejected");
    assert.deepEqual(results, ["replacement", "replacement", "replacement"]);
    assert.equal(calls, 1);
    assert.equal(h.get().refreshToken, "rotated");
  } finally {
    h.cleanup();
  }
});
test("a delayed 401 for an old token reuses the already-refreshed session", async () => {
  const h = harness(async () => {
    throw new Error("Should not refresh again");
  });
  h.set({ accessToken: "replacement", refreshToken: "rotated", isExpired: () => false });
  try {
    assert.equal(await h.instance().refreshRejectedAccessToken("rejected"), "replacement");
  } finally {
    h.cleanup();
  }
});
