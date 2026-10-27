import { providerOverviewMarkdown } from "../src/quotaChart";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchProviderQuota,
  kimiQuotaUrl,
  parseGroups,
  parseMeta,
  parseXai,
  parseKimi,
  parseDevin,
  type QuotaClient,
} from "../src/providerQuota";
import { chartChoices } from "../src/chartChoices";
import { chartTitle, usageChartSvg } from "../src/usageChart";
import { ApiError } from "../src/api";
import { accountRates, forecast, HOUR, DAY, type Observation } from "../src/usageModel";

const end = "2026-11-01T00:00:00Z",
  endMs = Date.parse(end);
const groupPayload = {
  groups: [
    {
      displayName: "Gemini Pro",
      buckets: [
        { window: "5h", remainingFraction: 0.6, resetTime: end },
        { window: "weekly", remaining_fraction: "0.25", reset_time: end },
      ],
    },
  ],
};
function client(override: Partial<QuotaClient> = {}): QuotaClient {
  return {
    call: async () => {
      throw new Error("Unexpected upstream call");
    },
    credential: async () => {
      throw new Error("Unexpected credential download");
    },
    plugin: async () => null,
    ...override,
  };
}

test("Antigravity collects grouped windows through CPA using the credential project ID", async () => {
  const quota = await fetchProviderQuota(
    { provider: "antigravity", auth_index: "ag", project_id: "project-a" },
    client({
      call: async (method, url, headers, body) => {
        assert.equal(method, "POST");
        assert.equal(url, "https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary");
        assert.equal(headers.Authorization, "Bearer $TOKEN$");
        assert.deepEqual(body, { project: "project-a" });
        return groupPayload;
      },
    }),
  );
  assert.equal(quota.windows[0].usedPercent, 40);
  assert.equal(quota.windows[0].periodMs, 5 * HOUR);
  assert.equal(quota.windows[1].usedPercent, 75);
  assert.equal(quota.windows[1].resetsAt, endMs);
});

test("Meta uses its request-local DCA token and strips keys and PII from quota output and errors", async () => {
  const make = (response: unknown) =>
    client({
      credential: async () => ({ dca_token: "dca:test-secret", api_key: "llm-secret" }),
      call: async (method, url, headers, body) => {
        assert.equal(method, "POST");
        assert.equal(url, "https://api.meta.ai/muse-code/key");
        assert.equal(headers.Authorization, "Bearer dca:test-secret");
        assert.deepEqual(body, {});
        return response;
      },
    });
  const quota = await fetchProviderQuota(
    { provider: "meta", auth_index: "meta", name: "meta.json" },
    make({
      api_key: "private-key",
      email: "private-email",
      subs_tier_name: "Pro",
      subs_usage: {
        window: { used_percent: 20, resets_at: endMs / 1000, window_duration_mins: 300 },
        weekly: { used_percent: 42, resets_at: endMs / 1000 },
      },
    }),
  );
  assert.equal(quota.windows[0].periodMs, 5 * HOUR);
  assert.equal(quota.windows[1].usedPercent, 42);
  assert.equal(quota.windows[0].resetsAt, endMs);
  assert.ok(!/secret|private/.test(JSON.stringify(quota)));
  await assert.rejects(
    fetchProviderQuota(
      { provider: "meta", auth_index: "meta", name: "meta.json" },
      client({
        credential: async () => {
          throw new Error("dca:do-not-echo");
        },
      }),
    ),
    (error) => error instanceof Error && !error.message.includes("do-not-echo"),
  );
  assert.equal(parseMeta({}).windows[0].usedPercent, null);
});

test("xAI preserves weekly percentages with their weekly reset and monthly spending with its own reset", async () => {
  const monthlyEnd = "2026-11-15T00:00:00Z";
  const quota = await fetchProviderQuota(
    { provider: "xai", auth_index: "xai" },
    client({
      call: async (method, url) => {
        assert.equal(method, "GET");
        assert.ok(url.includes("/v1/billing"));
        return url.includes("format=credits")
          ? { config: { creditUsagePercent: 30, currentPeriod: { type: "weekly", end } } }
          : {
              config: {
                creditUsagePercent: 80,
                currentPeriod: { type: "monthly", end: monthlyEnd },
                monthlyLimit: { val: 10000 },
                used: { val: 4500 },
                billingPeriodEnd: monthlyEnd,
              },
            };
      },
    }),
  );
  assert.equal(quota.windows.find((w) => w.label === "Weekly")?.usedPercent, 30);
  assert.equal(quota.windows.find((w) => w.label === "Weekly")?.resetsAt, endMs);
  assert.equal(quota.windows.find((w) => w.label === "Monthly")?.usedPercent, 45);
  assert.equal(quota.windows.find((w) => w.label === "Monthly")?.resetsAt, Date.parse(monthlyEnd));
  assert.ok(
    parseXai({ config: { currentPeriod: { type: "monthly", end: monthlyEnd }, creditUsagePercent: 80 } }).windows.every(
      (w) => w.label !== "Weekly",
    ),
  );
});

test("paid xAI fallback never runs an inference or invents a remaining percentage", async () => {
  const calls: string[] = [];
  const result = await fetchProviderQuota(
    { provider: "xai", auth_index: "paid" },
    client({
      call: async (method, url) => {
        calls.push(url);
        assert.equal(method, "GET");
        return url.endsWith("/me") ? { plan: "paid" } : {};
      },
    }),
  );
  assert.equal(result.windows.length, 0);
  assert.equal(result.plan, "paid");
  assert.match(result.note!, /no numeric quota/);
  assert.ok(!calls.some((url) => url.includes("chat/completions")));
});

test("any failed xAI billing read rejects the whole quota without falling back to the profile", async () => {
  const xai = (billing: (url: string) => unknown) => {
    const calls: string[] = [];
    const quota = fetchProviderQuota(
      { provider: "xai", auth_index: "xai" },
      client({
        call: async (_method, url) => {
          calls.push(url);
          return url.endsWith("/me") ? { plan: "paid" } : billing(url);
        },
      }),
    );
    return { quota, calls };
  };
  const weekly = { config: { creditUsagePercent: 30, currentPeriod: { type: "weekly", end } } };
  const fail = (status: number) => {
    throw new ApiError(`Quota endpoint returned HTTP ${status}`, status);
  };
  // 403/404 don't prove an account has no billing, so they fail like any other status.
  for (const status of [401, 403, 404, 429, 503]) {
    // One failure must not report the surviving window as a complete quota.
    const partial = xai((url) => (url.includes("format=credits") ? weekly : fail(status)));
    await assert.rejects(partial.quota, new RegExp(`HTTP ${status}`));
    // Total failure must not fall through to the profile and report "no numeric quota".
    const total = xai(() => fail(status));
    await assert.rejects(total.quota, new RegExp(`HTTP ${status}`));
    assert.ok(![...partial.calls, ...total.calls].some((url) => url.endsWith("/me")));
  }
  await assert.rejects(xai(() => Promise.reject(new Error("socket hang up"))).quota, /socket hang up/);
});

test("chart titles drop the quota group unless another window of the provider shares its suffix", () => {
  assert.equal(chartTitle("antigravity", "Gemini Pro / Weekly", ["Gemini Pro / Weekly"]), "Antigravity / Weekly");
  assert.equal(
    chartTitle("antigravity", "Gemini Pro / 5h", ["Gemini Pro / 5h", "Gemini Pro / Weekly"]),
    "Antigravity / 5h",
  );
  assert.equal(
    chartTitle("antigravity", "Gemini Flash / 5h", ["Gemini Pro / 5h", "Gemini Flash / 5h"]),
    "Antigravity / Gemini Flash / 5h",
  );
  assert.equal(chartTitle("codex", "Weekly", ["5-Hour", "Weekly"]), "Codex / Weekly");
});

test("Kimi selects only official quota hosts with canonical credential fields taking precedence", () => {
  assert.equal(kimiQuotaUrl({ domain: "ai" }, { provider: "kimi" }), "https://api.kimi.ai/coding/v1/usages");
  assert.equal(
    kimiQuotaUrl({ base_url: "https://api.kimi.ai" }, { provider: "kimi" }),
    "https://api.kimi.ai/coding/v1/usages",
  );
  assert.equal(
    kimiQuotaUrl({ base_url: "https://attacker.invalid", type: "kimi" }, { provider: "kimi-ai" }),
    "https://api.kimi.com/coding/v1/usages",
  );
  assert.equal(
    kimiQuotaUrl({ domain: "unknown", base_url: "https://api.kimi.ai" }, { provider: "kimi-ai" }),
    "https://api.kimi.com/coding/v1/usages",
  );
  assert.equal(
    kimiQuotaUrl({ base_url: null, "base-url": "https://api.kimi.ai" }, { provider: "kimi" }),
    "https://api.kimi.com/coding/v1/usages",
  );
});

test("Kimi parses counts, remaining counts, relative resets and explicit window durations", async () => {
  const now = Date.UTC(2026, 9, 27);
  const quota = parseKimi(
    {
      limits: [
        {
          window: { duration: 5, timeUnit: "TIME_UNIT_HOUR" },
          detail: { limit: "100", remaining: "25", reset_in: 3600 },
        },
      ],
      usage: { limit: 200, used: 50, reset_time: end },
      usages: { limit_month_total: { used_ratio: 0.2, reset_time: end } },
    },
    now,
  );
  assert.deepEqual(
    quota.windows.map((w) => w.usedPercent),
    [75, 25, 20],
  );
  assert.equal(quota.windows[0].periodMs, 5 * HOUR);
  assert.equal(quota.windows[0].resetsAt, now + HOUR);
  const result = await fetchProviderQuota(
    { provider: "kimi-ai", auth_index: "kimi", runtime_only: true },
    client({
      call: async (method, url) => {
        assert.equal(method, "GET");
        assert.ok(url.startsWith("https://api.kimi.ai/"));
        return { usage: { limit: 100, used: 10 } };
      },
    }),
  );
  assert.equal(result.windows[0].usedPercent, 10);
});

test("Devin converts reported remaining daily/weekly quota and keeps missing quota unknown", async () => {
  const payload = {
    userStatus: {
      planStatus: {
        dailyQuotaRemainingPercent: 70,
        weeklyQuotaRemainingPercent: "40",
        dailyQuotaResetAtUnix: endMs / 1000,
        planInfo: { planName: "Pro" },
      },
    },
  };
  const quota = await fetchProviderQuota(
    { provider: "devin", auth_index: "devin" },
    client({
      call: async (method, url, headers, body) => {
        assert.equal(method, "POST");
        assert.ok(url.endsWith("/GetUserStatus"));
        assert.equal((body as { metadata: { apiKey: string } }).metadata.apiKey, "$TOKEN$");
        assert.equal(headers["Connect-Protocol-Version"], "1");
        return payload;
      },
    }),
  );
  assert.deepEqual(
    quota.windows.map((w) => w.usedPercent),
    [30, 60],
  );
  assert.equal(quota.windows[0].resetsAt, endMs);
  assert.equal(quota.windows[0].periodMs, DAY);
  assert.equal(parseDevin({}).windows[0].usedPercent, null);
});

test("custom provider quota is discovered through CPA, including plugin balance-only responses", async () => {
  let pluginCalls = 0;
  const quota = await fetchProviderQuota(
    { provider: "future-provider", auth_index: "future" },
    client({
      plugin: async () => {
        pluginCalls++;
        return { ...groupPayload, summary: [{ label: "Balance", value: 12, unit: "credits" }] };
      },
    }),
  );
  assert.equal(pluginCalls, 1);
  assert.equal(quota.windows[0].usedPercent, 40);
  assert.deepEqual(quota.metrics, [{ label: "Balance", value: "12 credits" }]);
  const missing = await fetchProviderQuota({ provider: "future-provider", auth_index: "future" }, client());
  assert.equal(missing.windows.length, 0);
  assert.match(missing.note!, /does not expose/);
  const override = await fetchProviderQuota(
    { provider: "meta", auth_index: "meta", quota_plugin_id: "custom" },
    client({ plugin: async () => groupPayload }),
  );
  assert.equal(override.windows.length, 2);
});

test("unknown and model-specific providers get their own chart identities and native menu entries", () => {
  const choices = chartChoices(
    ["antigravity", "meta", "xai", "kimi-ai", "devin", "custom-provider"],
    ["Gemini Pro / 5h"],
  );
  assert.equal(choices.find((c) => c.value === "provider:meta")?.title, "Meta");
  assert.equal(choices.find((c) => c.value === "provider:xai")?.title, "xAI");
  assert.equal(choices.find((c) => c.value === "provider:custom-provider")?.title, "Custom Provider");
  const svg = usageChartSvg({
    mode: "forecast",
    provider: "antigravity",
    title: chartTitle("antigravity", "Gemini Pro / 5h", ["Gemini Pro / 5h", "Gemini Pro / Weekly"]),
    accounts: 1,
    left: 60,
    rate: null,
    observedHours: 0,
    history: [],
    projection: null,
    now: endMs,
    since: endMs - DAY,
    dark: true,
  });
  assert.match(svg, /Antigravity \/ 5h/);
  assert.ok(!svg.includes("Codex"));
  assert.equal(
    parseGroups({ groups: [{ buckets: [{ remainingFraction: null }, { remainingFraction: 2 }] }] }).windows.length,
    0,
  );
});

test("new provider history uses its explicit quota period instead of guessing from the display label", () => {
  const now = endMs;
  const samples: Observation[] = [0, 0.25, 0.5, 1].map((h) => ({
    account: "ag",
    provider: "antigravity",
    label: "Gemini Pro / 5h",
    at: now - HOUR + h * HOUR,
    left: 70 - h * 10,
    resetsAt: now + HOUR,
    periodMs: 5 * HOUR,
  }));
  const rates = accountRates(samples, now - DAY, now);
  const projected = forecast([samples.at(-1)!], rates, now, 1)!;
  assert.ok(projected.some((p, i) => i > 0 && p.at === now + 6 * HOUR && p.value === 100));
});

test("provider Overview distinguishes unreported quota from a measured zero", () => {
  const decode = (markdown: string) => Buffer.from(markdown.match(/base64,([^)]*)/)![1], "base64").toString();
  const unknown = decode(
    providerOverviewMarkdown([{ windows: [{ label: "Weekly", usedPercent: null, resetsAt: null }] }], []),
  );
  assert.match(unknown, /quota not reported/);
  assert.ok(!unknown.includes("left of 0%"));
  const exhausted = decode(
    providerOverviewMarkdown([{ windows: [{ label: "Weekly", usedPercent: 100, resetsAt: null }] }], []),
  );
  assert.match(exhausted, /left of 100%/);
  assert.ok(!exhausted.includes("quota not reported"));
});
