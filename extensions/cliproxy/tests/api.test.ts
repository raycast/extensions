import { canUseReset, fetchQuota, loadQuota } from "../src/quota";
import { observations } from "../src/history";
import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionId, listAuthFiles, upstream, pluginQuota, ConnectionChangedError } from "../src/api";

const globals = globalThis as unknown as { __quotaTestPreferences: { baseUrl: string; managementKey: string } };
const file = {
  id: "custom.json",
  name: "custom.json",
  auth_index: "1",
  provider: "Custom-Provider",
  status: "ready",
  disabled: false,
  unavailable: false,
  project_id: "project-a",
  supports_quota: true,
  quota_provider: "custom-provider",
  quota_plugin_id: "quota-service",
  api_key: "must-not-cache",
  id_token: {chatgpt_account_id:"account-a",plan_type:"plus",raw_token:"must-not-cache"},
  metadata: { access_token: "must-not-cache" },
  quota_probe: { header: { Authorization: "must-not-cache" } },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("v8 discovery retains provider capabilities and only caches safe account fields", async () => {
  const original = globalThis.fetch;
  globals.__quotaTestPreferences = { baseUrl: "http://v8.example.invalid", managementKey: "example-key" };
  const paths: string[] = [];
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    paths.push(path);
    if (path === "/v8/management/credentials") return json({ files: [file] });
    if (path === "/v8/management/plugins/quota-service/quota") {
      assert.equal(init?.method, "POST");
      assert.equal(JSON.parse(String(init?.body)).auth_index, "1");
      return json({ groups: [] });
    }
    throw new Error("Unexpected route");
  };
  try {
    const connection = connectionId();
    const [account] = await listAuthFiles(connection);
    assert.equal(account.provider, "custom-provider");
    assert.equal(account.quota_plugin_id, "quota-service");
    assert.equal(account.project_id, "project-a");
    assert.ok(!JSON.stringify(account).includes("must-not-cache"));
    await pluginQuota(connection, account);
    assert.deepEqual(paths, ["/v8/management/credentials", "/v8/management/plugins/quota-service/quota"]);
  } finally {
    globalThis.fetch = original;
  }
});

test("older CPA falls back after route 404 and uses its legacy quota proxy", async () => {
  const original = globalThis.fetch;
  globals.__quotaTestPreferences = { baseUrl: "http://legacy.example.invalid", managementKey: "example-key" };
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    paths.push(path);
    if (path === "/v8/management/credentials") return json({ error: "not found" }, 404);
    if (path === "/v0/management/auth-files") return json({ files: [file] });
    if (path === "/v0/management/api-call") return json({ status_code: 200, body: JSON.stringify({ remaining: 50 }) });
    throw new Error("Unexpected route");
  };
  try {
    const connection = connectionId();
    await listAuthFiles(connection);
    const response = await upstream(connection, "1", "GET", "https://provider.example.invalid/quota", {
      Authorization: "Bearer $TOKEN$",
    });
    assert.deepEqual(response.body, { remaining: 50 });
    assert.deepEqual(paths, ["/v8/management/credentials", "/v0/management/auth-files", "/v0/management/api-call"]);
  } finally {
    globalThis.fetch = original;
  }
});

test("authentication failures never retry another API version; stale connection cannot issue quota calls", async () => {
  const original = globalThis.fetch;
  globals.__quotaTestPreferences = { baseUrl: "http://auth.example.invalid", managementKey: "first-key" };
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return json({ error: "unauthorized" }, 401);
  };
  try {
    const connection = connectionId();
    await assert.rejects(listAuthFiles(connection), /unauthorized/);
    assert.equal(requests, 1);
    globals.__quotaTestPreferences.managementKey = "second-key";
    await assert.rejects(
      pluginQuota(connection, { provider: "meta", auth_index: "1", quota_plugin_id: "quota-service" }),
      ConnectionChangedError,
    );
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("a removed Codex quota plugin falls back to the built-in collector", async () => {
  const original = globalThis.fetch;
  globals.__quotaTestPreferences = { baseUrl: "http://removed-plugin.example.invalid", managementKey: "example-key" };
  globalThis.fetch = async (input, init) => {
    if (new URL(String(input)).pathname.includes("/plugins/")) return json({ error: "plugin_not_found" }, 404);
    const request = JSON.parse(String(init?.body));
    return json({
      status_code: 200,
      body: JSON.stringify(
        request.url.endsWith("/usage")
          ? {
              plan_type: "plus",
              rate_limit: { primary_window: { used_percent: 10, limit_window_seconds: 18000, reset_at: 1793491200 } },
            }
          : { available_count: 0 },
      ),
    });
  };
  try {
    const quota = await fetchQuota(connectionId(), {
      provider: "codex",
      auth_index: "1",
      supports_quota: true,
      quota_plugin_id: "removed",
    });
    assert.equal(quota.windows[0].usedPercent, 10);
  } finally {
    globalThis.fetch = original;
  }
});

/**
 * Serves plugin quota and /api-call upstream responses. `upstream` returns the proxied status and body for a URL,
 * or null to fail the CPA request like a network error.
 */
function mockCpa(upstream: (url: string) => { status: number; body: unknown } | null) {
  const urls: string[] = [];
  globalThis.fetch = async (input, init) => {
    if (new URL(String(input)).pathname.includes("/plugins/"))
      return json({ groups: [{ displayName: "Plan", buckets: [{ window: "weekly", remainingFraction: 0.4 }] }] });
    const request = JSON.parse(String(init?.body));
    urls.push(request.url);
    const response = upstream(request.url);
    if (!response) throw new TypeError("fetch failed");
    return json({ status_code: response.status, body: JSON.stringify(response.body) });
  };
  return urls;
}

test("plugin quota keeps its windows and adds a read-only reset status, unknown when that read fails", async () => {
  const original = globalThis.fetch;
  globals.__quotaTestPreferences = { baseUrl: "http://plugin-reset.example.invalid", managementKey: "example-key" };
  const plugin = { auth_index: "1", supports_quota: true, quota_plugin_id: "quota-service" };
  try {
    let urls = mockCpa(() => ({ status: 200, body: { available_count: 2 } }));
    const codex = await fetchQuota(connectionId(), { ...plugin, provider: "codex" });
    assert.equal(codex.windows[0].usedPercent, 60);
    assert.deepEqual(codex.reset, { kind: "codex", available: 2 });
    assert.deepEqual(urls, ["https://chatgpt.com/backend-api/wham/rate-limit-reset-credits"]);

    const grants = {
      eligible: true,
      grants: [{ id: "g1", usable_now: true, resets_left: 1, use_requires_limit: false }],
    };
    urls = mockCpa(() => ({ status: 200, body: { five_hour: { utilization: 99 }, cedar_ember: grants } }));
    const claude = await fetchQuota(connectionId(), { ...plugin, provider: "claude" });
    assert.deepEqual(
      claude.windows.map((w) => w.label),
      ["Plan / weekly"],
    );
    assert.equal(claude.reset?.kind === "claude" && claude.reset.grantId, "g1");
    assert.ok(canUseReset(claude.reset));
    assert.equal(urls.length, 1);
    assert.match(urls[0], /cedar_ember=1&skip_spend=1/);

    for (const provider of ["codex", "claude"]) {
      mockCpa(() => ({ status: 429, body: { error: "rate limited" } }));
      const quota = await fetchQuota(connectionId(), { ...plugin, provider });
      assert.equal(quota.windows.length, 1);
      assert.equal(quota.reset, null);
      assert.ok(!canUseReset(quota.reset));
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("failed xAI billing reads keep the last complete quota stale and out of usage history", async () => {
  const original = globalThis.fetch;
  globals.__quotaTestPreferences = { baseUrl: "http://xai-cache.example.invalid", managementKey: "example-key" };
  const account = { provider: "xai", auth_index: "x1" };
  const end = "2026-11-01T00:00:00Z";
  const weekly = { config: { creditUsagePercent: 30, currentPeriod: { type: "weekly", end } } };
  const monthly = { config: { monthlyLimit: { val: 100 }, used: { val: 40 }, billingPeriodEnd: end } };
  // A status of 0 fails the CPA request itself, like a network error.
  const billing = (creditsStatus: number, monthlyStatus: number) =>
    mockCpa((url) => {
      if (url.endsWith("/me")) return { status: 200, body: { plan: "paid" } };
      const [status, body] = url.includes("format=credits") ? [creditsStatus, weekly] : [monthlyStatus, monthly];
      return status ? { status, body } : null;
    });
  const failures = [401, 403, 404, 429, 503, 0].flatMap((status) => [
    [200, status],
    [status, status],
  ]);
  try {
    for (const [credits, monthly] of failures) {
      const urls = billing(credits, monthly);
      const first = await loadQuota(connectionId(), { ...account, auth_index: `first-${credits}-${monthly}` });
      assert.equal(first.quota, null);
      assert.equal(first.fetchedAt, null);
      assert.ok(first.error);
      assert.ok(!urls.some((url) => url.endsWith("/me")));
    }

    const connection = connectionId();
    billing(200, 200);
    const good = await loadQuota(connection, account);
    assert.deepEqual(
      good.quota?.windows.map((w) => w.label),
      ["Weekly", "Monthly"],
    );

    for (const [credits, monthly] of failures) {
      const urls = billing(credits, monthly);
      const stale = await loadQuota(connection, account);
      assert.deepEqual(stale.quota, good.quota);
      assert.equal(stale.fetchedAt, good.fetchedAt);
      assert.match(stale.error!, monthly === 0 ? /not reachable/ : new RegExp(`HTTP ${monthly}`));
      assert.deepEqual(observations([account], { x1: stale }), []);
      assert.ok(!urls.some((url) => url.endsWith("/me")));
    }
  } finally {
    globalThis.fetch = original;
  }
});
