const assert = require("node:assert/strict");
const { test } = require("node:test");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Unit-only Raycast storage/network adapters. These exercise real extension modules,
// without accessing Raycast, the clipboard, credentials, or a WebCull API.
function harness() {
  const storage = new Map();
  const calls = [];
  const modules = new Map();
  let onMetadata = async () => {};
  let onFetch = async () => undefined;
  let onSetItem = async () => {};
  const opened = [];
  const toasts = [];
  const errors = [];
  const navigation = [];
  const timers = new Map();
  const hooks = [];
  const effects = new Map();
  const pendingEffects = [];
  let hookIndex = 0;
  let timerId = 0;
  const react = {
    useState(initial) {
      const index = hookIndex++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], (value) => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
    },
    useRef(initial) {
      const index = hookIndex++;
      if (!(index in hooks)) hooks[index] = { current: initial };
      return hooks[index];
    },
    useEffect(effect, deps) {
      const index = hookIndex++;
      if (!(index in hooks) || deps.some((value, i) => !Object.is(value, hooks[index][i]))) {
        hooks[index] = deps;
        pendingEffects.push(() => {
          effects.get(index)?.();
          effects.set(index, effect());
        });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const sdk = {
    LocalStorage: {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => { await onSetItem(key, value); storage.set(key, value); },
      removeItem: async (key) => storage.delete(key),
    },
    environment: { isDevelopment: false },
    open: async (url) => { opened.push(url); },
    useNavigation: () => ({ pop: () => navigation.push("pop"), push: (view) => navigation.push(view) }),
    showToast: async (toast) => { toasts.push(toast); },
    Toast: { Style: { Success: "success", Failure: "failure" } },
    Icon: {},
    List: { Item: "List.Item", EmptyView: "List.EmptyView" },
    Form: { TextField: "Form.TextField", Description: "Form.Description", Dropdown: { Item: "Form.Dropdown.Item" } },
    Clipboard: { readText: async () => "https://example.com/clipboard" },
    ActionPanel: "ActionPanel",
    Action: { Style: { Destructive: "destructive" }, SubmitForm: "Action.SubmitForm", Push: "Action.Push" },
  };
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const context = {
      module, exports: module.exports, URL, URLSearchParams, AbortSignal, process, Error,
      console: { error: (...args) => errors.push(args) },
      setTimeout: (callback) => { const id = ++timerId; timers.set(id, callback); return id; },
      clearTimeout: (id) => timers.delete(id),
      require: (name) => name === "@raycast/api" ? sdk : name === "react" ? react
        : name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name.startsWith(".")
        ? load(path.resolve(path.dirname(filename), name + (existsSync(path.resolve(path.dirname(filename), name + ".ts")) ? ".ts" : ".tsx"))) : require(name),
      fetch: async (url, options) => {
        calls.push({ path: url.pathname, token: options.headers.Authorization, body: options.body });
        const response = await onFetch(url, options);
        if (url.pathname === "/raycast/metadata") await onMetadata();
        return {
          ok: response?.httpOk !== false,
          text: async () => JSON.stringify(response || {
            success: "true", e2ee: { e2ee_enabled: "false", conversion_in_progress: "false" }, items: [],
          }),
        };
      },
    };
    vm.runInNewContext(compiled, context, { filename });
    return module.exports;
  }
  const auth = load(path.resolve(__dirname, "../src/lib/auth.ts"));
  const client = load(path.resolve(__dirname, "../src/lib/webcullClient.ts"));
  const accounts = [1, 2].map((id) => ({
    accountId: `user:${id}`, token: `unit-test-token-${id}`,
    expires: Math.floor(Date.now() / 1000) + 3600, scopes: [],
    user: { id, hash: `unit-test-account-${id}` }, connectedAt: 1,
  }));
  function saveAccounts() {
    storage.set("webcull_auth_accounts", JSON.stringify(accounts));
  }
  saveAccounts();
  storage.set("webcull_active_account_id", accounts[0].accountId);
  function renderCommand(name, props) {
    hookIndex = 0;
    const tree = load(path.resolve(__dirname, `../src/${name}.tsx`)).default(props);
    for (const run of pendingEffects.splice(0)) run();
    return tree;
  }
  return {
    auth, client, storage, calls, accounts, saveAccounts, opened, toasts, errors, timers, sdk, navigation,
    setOnMetadata(fn) { onMetadata = fn; },
    setOnFetch(fn) { onFetch = fn; },
    setOnSetItem(fn) { onSetItem = fn; },
    http: load(path.resolve(__dirname, "../src/lib/http.ts")),
    renderCommand,
    renderConnect() { return renderCommand("connect-account"); },
    mountView(view) {
      hooks.length = 0;
      hookIndex = 0;
      effects.clear();
      pendingEffects.length = 0;
      return view.type(view.props);
    },
    unmount() { for (const cleanup of effects.values()) cleanup?.(); },
  };
}

const preferences = { apiBaseUrl: "https://api.invalid", appBaseUrl: "https://app.invalid" };
const payload = { accountId: "user:1", parentStackId: "0", url: "https://example.com/private", title: "Saved page" };

test("expired active account does not fall back to a saved account or write Root", async () => {
  const h = harness();
  h.accounts[0].expires = 1;
  h.saveAccounts();
  assert.equal((await h.auth.getAuthState()).connected, false);
  assert.equal((await h.auth.getSavedAuthAccounts()).accounts.length, 1);
  await assert.rejects(h.client.saveBookmark(preferences, payload), h.http.WebCullAuthError);
  assert.equal(h.calls.length, 0);
  await h.auth.setActiveAuthAccount("user:2");
  assert.equal((await h.auth.getAuthState()).accountId, "user:2");
});

test("removing the active account requires explicit selection of the remaining account", async () => {
  const h = harness();
  await h.auth.removeAuthAccount("user:1");
  assert.equal((await h.auth.getSavedAuthAccounts()).activeAccountId, null);
  assert.equal((await h.auth.getAuthState()).connected, false);
});

test("a form or result belonging to another account cannot load folders or save", async () => {
  const h = harness();
  await h.auth.setActiveAuthAccount("user:2");
  await assert.rejects(h.client.getStacks(preferences, "user:1"), /account changed/);
  await assert.rejects(h.client.saveBookmark(preferences, payload), /account changed/);
  assert.equal(h.calls.length, 0);
});

test("account switch or expiry during metadata cannot submit a bookmark", async () => {
  for (const change of ["switch", "expire"]) {
    const h = harness();
    h.setOnMetadata(async () => {
      if (change === "switch") await h.auth.setActiveAuthAccount("user:2");
      else { h.accounts[0].expires = 1; h.saveAccounts(); }
    });
    await assert.rejects(h.client.saveBookmark(preferences, payload));
    assert.deepEqual(h.calls.map((call) => call.path), ["/raycast/metadata"]);
  }
});

test("non-URL clipboard text and unsupported URLs never reach the network", async () => {
  const h = harness();
  for (const url of ["", "private clipboard text", "unit-test-secret", "example.com", "javascript:alert(1)",
    "file:///private/document", "https://user:password@example.com", "https://example.com/\nsecret", "https://example.com\\secret"]) {
    await assert.rejects(h.client.saveBookmark(preferences, { ...payload, url, title: url }), /full http/);
  }
  assert.equal(h.calls.length, 0);
});

test("valid URLs save once with the pinned account credential", async () => {
  for (const url of ["https://example.com/path?q=one%20two#section", "http://example.com/"]) {
    const h = harness();
    assert.equal((await h.client.getCapabilityState()).accountId, "user:1");
    h.calls.length = 0;
    await h.client.saveBookmark(preferences, { ...payload, url });
    assert.deepEqual(h.calls.map((call) => call.path), ["/raycast/metadata", "/raycast/bookmarks-create"]);
    assert.equal(h.calls[1].token, "Bearer unit-test-token-1");
    assert.equal(h.calls[1].body.get("url"), url);
    assert.equal(h.calls[1].body.get("parent_id"), "0");
  }
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function tokenResponse(id, token = `unit-test-new-token-${id}`) {
  return { success: "true", token, expires: Math.floor(Date.now() / 1000) + 3600, user: { id, hash: `unit-test-account-${id}` } };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

function findAction(tree, title) {
  return findNode(tree, (node) => node.props?.title === title && node.props.onAction)?.props.onAction;
}

function findNode(tree, predicate) {
  if (!tree || typeof tree !== "object") return;
  if (predicate(tree)) return tree;
  for (const value of Object.values(tree)) {
    const found = Array.isArray(value)
      ? value.map((child) => findNode(child, predicate)).find(Boolean)
      : findNode(value, predicate);
    if (found) return found;
  }
}

test("partial logout forgets revoked accounts and retains failed accounts for retry", async () => {
  const h = harness();
  h.setOnFetch(async (url, options) => {
    if (url.pathname === "/raycast/auth-logout" && options.headers.Authorization.endsWith("-2")) {
      throw new Error("Network unavailable");
    }
  });
  await assert.rejects(h.auth.revokeAllAuthAccounts(), /Network unavailable/);
  const saved = await h.auth.getSavedAuthAccounts();
  assert.deepEqual(Array.from(saved.accounts, (account) => account.accountId), ["user:2"]);
  assert.equal(saved.activeAccountId, null);
  assert.equal((await h.auth.getAuthState()).connected, false);
  h.setOnFetch(async () => undefined);
  h.calls.length = 0;
  await h.auth.revokeAllAuthAccounts();
  assert.deepEqual(h.calls.map((call) => call.token), ["Bearer unit-test-token-2"]);
  assert.equal(h.storage.size, 0);
});

test("partial logout refreshes the visible saved-account list without claiming success", async () => {
  const h = harness();
  h.renderConnect();
  await flush();
  h.setOnFetch(async (_url, options) => {
    if (options.headers.Authorization?.endsWith("-2")) throw new Error("Network unavailable");
  });
  await findAction(h.renderConnect(), "Log Out All Accounts")();
  const rendered = JSON.stringify(h.renderConnect());
  assert.match(rendered, /No active account/);
  assert.doesNotMatch(rendered, /Log Out All Accounts/);
  assert.equal(h.toasts.at(-1).style, "failure");
});

test("a late approved login revokes only its unused token and preserves the new active account", async () => {
  const h = harness();
  const oldReply = deferred();
  let current = true;
  h.setOnFetch(async (url, options) => {
    if (url.pathname === "/raycast/auth-redeem") {
      return options.body.get("request") === "old" ? oldReply.promise : tokenResponse(3);
    }
  });
  const old = h.auth.redeemAuthHandoff("old", "verifier", () => current);
  current = false;
  await h.auth.redeemAuthHandoff("new", "verifier", () => true);
  const rejected = assert.rejects(old, /cancelled or replaced/);
  oldReply.resolve(tokenResponse(1));
  await rejected;
  assert.equal((await h.auth.getAuthState()).accountId, "user:3");
  assert.equal((await h.auth.getSavedAuthAccounts()).accounts.find((a) => a.accountId === "user:1").token,
    "unit-test-token-1");
  assert.deepEqual(h.calls.filter((c) => c.path === "/raycast/auth-logout").map((c) => c.token),
    ["Bearer unit-test-new-token-1"]);
});

test("cancellation during storage cleans up before the next login commits", async () => {
  for (const key of ["webcull_auth_accounts", "webcull_active_account_id"]) {
    const h = harness();
    const entered = deferred();
    const release = deferred();
    let current = true;
    let blocked = false;
    h.setOnSetItem(async (name) => {
      if (name === key && !blocked) { blocked = true; entered.resolve(); await release.promise; }
    });
    h.setOnFetch(async (url, options) => url.pathname === "/raycast/auth-redeem"
      ? tokenResponse(options.body.get("request") === "old" ? 3 : 4) : undefined);
    const old = h.auth.redeemAuthHandoff("old", "verifier", () => current);
    const rejected = assert.rejects(old, /cancelled or replaced/);
    await entered.promise;
    current = false;
    const next = h.auth.redeemAuthHandoff("new", "verifier", () => true);
    release.resolve();
    await Promise.all([rejected, next]);
    const saved = await h.auth.getSavedAuthAccounts();
    assert.equal(saved.activeAccountId, "user:4");
    assert.equal(saved.accounts.some((a) => a.accountId === "user:3"), false);
  }
});

test("cancellation during replacement revocation does not retain either revoked token", async () => {
  const h = harness();
  let current = true;
  h.setOnFetch(async (url, options) => {
    if (url.pathname === "/raycast/auth-redeem") return tokenResponse(1);
    if (options.headers.Authorization === "Bearer unit-test-token-1") current = false;
  });
  await assert.rejects(h.auth.redeemAuthHandoff("request", "verifier", () => current), /cancelled or replaced/);
  const saved = await h.auth.getSavedAuthAccounts();
  assert.equal(saved.accounts.some((a) => a.accountId === "user:1"), false);
  assert.equal(saved.activeAccountId, null);
});

test("stale-token cleanup failures remain reported and do not block a later login", async () => {
  const h = harness();
  h.setOnFetch(async (url) => {
    if (url.pathname === "/raycast/auth-redeem") return tokenResponse(3);
    throw new Error("Network unavailable");
  });
  await assert.rejects(h.auth.redeemAuthHandoff("old", "verifier", () => false), /connected applications/);
  assert.equal((await h.auth.getAuthState()).accountId, "user:1");
  h.setOnFetch(async (url) => url.pathname === "/raycast/auth-redeem" ? tokenResponse(3) : undefined);
  await h.auth.redeemAuthHandoff("new", "verifier", () => true);
  assert.equal((await h.auth.getAuthState()).accountId, "user:3");
});

// Hook/timer adapters exercise command callbacks, not Raycast rendering or React scheduling.
test("restarting login discards late pending and failed polls without scheduling another timer", async () => {
  for (const fail of [false, true]) {
    const h = harness();
    h.storage.clear();
    const oldReply = deferred();
    let polls = 0;
    h.setOnFetch(async (url) => {
      if (url.pathname === "/raycast/auth-redeem") {
        return ++polls === 1 ? oldReply.promise : { pending: "true" };
      }
    });
    h.renderConnect();
    await flush();
    await findAction(h.renderConnect(), "Open WebCull Login")();
    await findAction(h.renderConnect(), "Open WebCull Login")();
    await flush();
    assert.equal(h.timers.size, 1);
    if (fail) oldReply.reject(new Error("Old request failed"));
    else oldReply.resolve({ pending: "true" });
    await flush();
    assert.equal(h.timers.size, 1);
    assert.equal(h.toasts.length, 0);
    assert.equal(h.errors.length, fail ? 1 : 0);
    h.unmount();
    assert.equal(h.timers.size, 0);
  }
});

test("unmounting during redemption discards an issued token without a success toast", async () => {
  const h = harness();
  h.storage.clear();
  const reply = deferred();
  h.setOnFetch(async (url) => url.pathname === "/raycast/auth-redeem" ? reply.promise : undefined);
  h.renderConnect();
  await flush();
  await findAction(h.renderConnect(), "Open WebCull Login")();
  h.unmount();
  reply.resolve(tokenResponse(3));
  await flush();
  assert.equal((await h.auth.getAuthState()).connected, false);
  assert.equal(h.toasts.length, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.calls.at(-1).path, "/raycast/auth-logout");
});

test("out-of-order login starts only open and poll the current approval", async () => {
  const h = harness();
  h.storage.clear();
  const first = deferred();
  let starts = 0;
  h.setOnFetch(async (url) => {
    if (url.pathname === "/raycast/auth-start" && ++starts === 1) return first.promise;
    if (url.pathname === "/raycast/auth-redeem") return { pending: "true" };
  });
  h.renderConnect();
  await flush();
  const old = findAction(h.renderConnect(), "Open WebCull Login")();
  await findAction(h.renderConnect(), "Open WebCull Login")();
  first.resolve({ success: "true" });
  await old;
  await flush();
  assert.equal(h.opened.length, 1);
  assert.equal(h.calls.filter((c) => c.path === "/raycast/auth-redeem").length, 1);
  assert.equal(h.timers.size, 1);
  h.unmount();
});

test("development and production requests preserve process TLS verification", async () => {
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  try {
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    for (const development of [true, false]) {
      const h = harness();
      h.sdk.environment.isDevelopment = development;
      for (const origin of ["https://xapi.testwebcull.test:8008", "https://localhost", "https://xapi.webcull.com"]) {
        await h.http.postWebCull(origin, "/raycast/metadata", {});
        assert.equal(process.env.NODE_TLS_REJECT_UNAUTHORIZED, undefined);
      }
      h.setOnFetch(async () => { throw new Error("certificate verification failed"); });
      await assert.rejects(h.http.postWebCull("https://localhost", "/raycast/metadata", {}), /certificate verification failed/);
      assert.equal(process.env.NODE_TLS_REJECT_UNAUTHORIZED, undefined);
    }
  } finally {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
  }
});

test("search setup can retry repeated metadata failures and run the retained query", async () => {
  const h = harness();
  let offline = true;
  h.setOnMetadata(async () => { if (offline) throw new Error("Offline during setup"); });
  let tree = h.renderCommand("search-bookmarks");
  tree.props.onSearchTextChange("saved query");
  await flush();
  tree = h.renderCommand("search-bookmarks");
  assert.match(JSON.stringify(tree), /Offline during setup/);
  await findAction(tree, "Retry")();
  h.renderCommand("search-bookmarks");
  await flush();
  tree = h.renderCommand("search-bookmarks");
  assert.ok(findAction(tree, "Retry"));
  assert.equal(h.calls.some((c) => c.path === "/raycast/bookmarks-search"), false);
  offline = false;
  await findAction(tree, "Retry")();
  h.renderCommand("search-bookmarks");
  await flush();
  h.renderCommand("search-bookmarks");
  await flush();
  tree = h.renderCommand("search-bookmarks");
  assert.equal(findAction(tree, "Retry"), undefined);
  assert.equal(tree.props.searchText, "saved query");
  assert.match(h.calls.find((c) => c.path === "/raycast/bookmarks-search").body.get("query"), /saved query/);
});

test("save setup retries metadata or folder failures, preserves edits, and never submits on retry", async () => {
  for (const failedPath of ["/raycast/metadata", "/raycast/bookmarks-search"]) {
    const h = harness();
    let offline = true;
    let clipboardReads = 0;
    h.sdk.Clipboard.readText = async () => { clipboardReads++; return "https://example.com/clipboard"; };
    h.setOnFetch(async (url) => {
      if (offline && url.pathname === failedPath) throw new Error("Setup unavailable");
    });
    let tree = h.renderCommand("save-url-to-stack");
    const title = findNode(tree, (node) => node.props?.id === "title");
    findNode(tree, (node) => node.props?.id === "url").props.onChange("https://example.com/edited");
    await flush();
    tree = h.renderCommand("save-url-to-stack");
    assert.match(JSON.stringify(tree), /Setup unavailable/);
    assert.equal(findNode(tree, (node) => node.props?.onSubmit), undefined);
    offline = false;
    const metadata = deferred();
    h.setOnMetadata(() => metadata.promise);
    await findAction(tree, "Retry")();
    h.renderCommand("save-url-to-stack");
    tree = h.renderCommand("save-url-to-stack");
    assert.equal(tree.props.isLoading, true);
    assert.equal(findNode(tree, (node) => node.props?.onSubmit), undefined);
    metadata.resolve();
    await flush();
    tree = h.renderCommand("save-url-to-stack");
    assert.equal(findAction(tree, "Retry"), undefined);
    assert.equal(findNode(tree, (node) => node.props?.id === "url").props.value, "https://example.com/edited");
    assert.deepEqual(findNode(tree, (node) => node.props?.id === "title"), title);
    assert.equal(clipboardReads, 1);
    assert.equal(h.calls.some((c) => c.path === "/raycast/bookmarks-create"), false);
    const submit = findNode(tree, (node) => node.props?.onSubmit).props.onSubmit;
    h.setOnFetch(async (url) => {
      if (url.pathname === "/raycast/bookmarks-create") throw new Error("Save response uncertain");
    });
    await submit({ url: "https://example.com/edited", title: "Typed title", parentStackId: "0" });
    tree = h.renderCommand("save-url-to-stack");
    assert.equal(findAction(tree, "Retry"), undefined);
    assert.equal(h.calls.filter((c) => c.path === "/raycast/bookmarks-create").length, 1);
    assert.equal(h.toasts.at(-1).title, "Could not save to WebCull");
  }
});

test("retry still respects unsupported account status without loading folders or saving", async () => {
  const h = harness();
  h.setOnMetadata(async () => { throw new Error("Offline"); });
  h.renderCommand("save-url-to-stack");
  await flush();
  const retry = findAction(h.renderCommand("save-url-to-stack"), "Retry");
  h.setOnMetadata(async () => {});
  h.setOnFetch(async () => ({ success: "true", e2ee: { e2ee_enabled: "true", conversion_in_progress: "false" } }));
  await retry();
  h.renderCommand("save-url-to-stack");
  await flush();
  const tree = h.renderCommand("save-url-to-stack");
  assert.match(JSON.stringify(tree), /Encrypted accounts are not supported/);
  assert.equal(findNode(tree, (node) => node.props?.onSubmit), undefined);
  assert.equal(h.calls.every((c) => c.path === "/raycast/metadata"), true);
});

test("closing a command ignores a late setup failure", async () => {
  for (const command of ["search-bookmarks", "save-url-to-stack"]) {
    const h = harness();
    const metadata = deferred();
    h.setOnMetadata(() => metadata.promise);
    h.renderCommand(command);
    await flush();
    h.unmount();
    metadata.reject(new Error("Late setup failure"));
    await flush();
    assert.equal(h.toasts.length, 0);
  }
});

const rejectedToken = { success: "false", failure: "WebCull access token expired or revoked", code: "token_expired_or_revoked" };

function reconnectTarget(tree) {
  return findNode(tree, (node) => node.type === "Action.Push" && node.props.title === "Reconnect WebCull")?.props.target;
}

test("API token rejection is typed on both success-status and error-status responses", async () => {
  for (const code of ["token_required", "invalid_token", "token_expired_or_revoked"]) {
    for (const httpOk of [true, false]) {
      const h = harness();
      h.setOnFetch(async () => ({ ...rejectedToken, code, httpOk }));
      await assert.rejects(h.client.getCapabilityState(), h.http.WebCullAuthError);
      const saved = await h.auth.getSavedAuthAccounts();
      assert.deepEqual(Array.from(saved.accounts, (a) => a.accountId), ["user:2"]);
      assert.equal(saved.activeAccountId, null);
    }
  }
});

test("network and subscription failures do not discard saved authorization", async () => {
  for (const failure of ["network", "subscription_required"]) {
    const h = harness();
    h.setOnFetch(async () => {
      if (failure === "network") throw new Error("Offline");
      return { success: "false", code: failure, failure: "Subscription required", httpOk: false };
    });
    await assert.rejects(h.client.getCapabilityState(), (error) => !(error instanceof h.http.WebCullAuthError));
    assert.equal((await h.auth.getAuthState()).token, h.accounts[0].token);
    assert.equal((await h.auth.getSavedAuthAccounts()).accounts.length, 2);
  }
});

test("late rejection cannot discard a replacement token or switch away from another account", async () => {
  for (const replacement of [true, false]) {
    const h = harness();
    const pending = deferred();
    h.setOnFetch(async (url) => {
      if (url.pathname === "/raycast/metadata") return pending.promise;
      if (url.pathname === "/raycast/auth-redeem") return tokenResponse(1);
    });
    const request = h.client.getCapabilityState();
    await flush();
    if (replacement) await h.auth.redeemAuthHandoff("request", "verifier", () => true);
    else await h.auth.setActiveAuthAccount("user:2");
    pending.resolve(rejectedToken);
    await assert.rejects(request, h.http.WebCullAuthError);
    const auth = await h.auth.getAuthState();
    assert.equal(auth.token, replacement ? "unit-test-new-token-1" : "unit-test-token-2");
  }
});

test("Search offers reauthorization after setup, query, and local-expiry failures", async () => {
  for (const failure of ["setup", "query", "local-expiry"]) {
    const h = harness();
    if (failure === "local-expiry") { h.accounts[0].expires = 1; h.saveAccounts(); }
    h.setOnFetch(async (url) => {
      if (failure === "setup" && url.pathname === "/raycast/metadata") return rejectedToken;
      if (failure === "query" && url.pathname === "/raycast/bookmarks-search") return rejectedToken;
    });
    h.renderCommand("search-bookmarks").props.onSearchTextChange("retained query");
    await flush();
    h.renderCommand("search-bookmarks");
    await flush();
    let tree = h.renderCommand("search-bookmarks");
    assert.equal(tree.props.searchText, "retained query");
    const target = reconnectTarget(tree);
    assert.equal(target.props.reauthorize, true);
    assert.equal(findAction(tree, "Retry"), undefined);
    h.setOnFetch(async (url) => url.pathname === "/raycast/auth-redeem" ? tokenResponse(1) : undefined);
    await h.auth.redeemAuthHandoff("request", "verifier", () => true);
    await target.props.onConnected();
    h.renderCommand("search-bookmarks");
    await flush();
    h.renderCommand("search-bookmarks");
    await flush();
    tree = h.renderCommand("search-bookmarks");
    assert.equal(reconnectTarget(tree), undefined);
    assert.equal(tree.props.searchText, "retained query");
    assert.ok(h.calls.some((c) => c.path === "/raycast/bookmarks-search" && c.token === "Bearer unit-test-new-token-1"));
  }
});

test("Save reauthorization retains fields and never repeats a rejected write", async () => {
  for (const failedPath of ["/raycast/metadata", "/raycast/bookmarks-search", "/raycast/bookmarks-create"]) {
    const h = harness();
    h.setOnFetch(async (url) => url.pathname === failedPath ? rejectedToken : undefined);
    let tree = h.renderCommand("save-url-to-stack");
    findNode(tree, (node) => node.props?.id === "url").props.onChange("https://example.com/retained");
    const title = findNode(tree, (node) => node.props?.id === "title");
    await flush();
    tree = h.renderCommand("save-url-to-stack");
    if (failedPath === "/raycast/bookmarks-create") {
      await findNode(tree, (node) => node.props?.onSubmit).props.onSubmit({ ...payload, title: "Retained title" });
      tree = h.renderCommand("save-url-to-stack");
    }
    const target = reconnectTarget(tree);
    assert.equal(target.props.reauthorize, true);
    assert.equal(findNode(tree, (node) => node.props?.onSubmit), undefined);
    const writes = h.calls.filter((c) => c.path === "/raycast/bookmarks-create").length;
    h.setOnFetch(async (url) => url.pathname === "/raycast/auth-redeem" ? tokenResponse(1) : undefined);
    await h.auth.redeemAuthHandoff("request", "verifier", () => true);
    await target.props.onConnected();
    h.renderCommand("save-url-to-stack");
    await flush();
    tree = h.renderCommand("save-url-to-stack");
    assert.equal(reconnectTarget(tree), undefined);
    assert.equal(findNode(tree, (node) => node.props?.id === "url").props.value, "https://example.com/retained");
    assert.deepEqual(findNode(tree, (node) => node.props?.id === "title"), title);
    assert.ok(findNode(tree, (node) => node.props?.onSubmit));
    assert.equal(h.calls.filter((c) => c.path === "/raycast/bookmarks-create").length, writes);
  }
});

test("Reconnect starts a fresh approval handoff and returns only after token storage", async () => {
  const h = harness();
  let connected = 0;
  h.setOnFetch(async (url) => url.pathname === "/raycast/auth-redeem" ? tokenResponse(1) : undefined);
  h.renderCommand("connect-account", { reauthorize: true, onConnected: async () => {
    assert.equal((await h.auth.getAuthState()).token, "unit-test-new-token-1");
    connected++;
  } });
  await flush();
  assert.equal(connected, 1);
  assert.deepEqual(h.navigation, ["pop"]);
  assert.equal(h.opened.length, 1);
  assert.match(h.opened[0], /\/accounts#raycast-auth\//);
  assert.ok(h.calls.some((c) => c.path === "/raycast/auth-start"));
});

test("selecting a rejected saved account offers fresh approval instead of claiming connection", async () => {
  const h = harness();
  h.renderConnect();
  await flush();
  const tree = h.renderConnect();
  assert.ok(reconnectTarget(tree));
  const savedTarget = findNode(tree, (node) => node.props?.title === "Open Saved Accounts").props.target;
  const savedTree = h.mountView(savedTarget);
  h.setOnFetch(async () => rejectedToken);
  await findAction(savedTree, "Keep as Active Account")();
  assert.equal(h.navigation.at(-1).props.reauthorize, true);
  assert.equal(h.toasts.at(-1).style, "failure");
  assert.equal((await h.auth.getAuthState()).connected, false);
});
