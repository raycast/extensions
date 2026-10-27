import { fetchQuota } from "../src/quota";
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
