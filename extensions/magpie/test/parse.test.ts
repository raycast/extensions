import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  modelLabel,
  parseAccounts,
  parseAgents,
  parseConfirmation,
  matchingModelId,
  parseModels,
  parseProfiles,
  parseQuotas,
  parseSessions,
  parseUsage,
  sameModel,
} from "../src/lib/parse";

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

test("parseAgents reads installed agents from magpie ls", () => {
  const agents = parseAgents(fixture("ls.txt"));
  const byName = Object.fromEntries(agents.map((agent) => [agent.name, agent]));

  assert.equal(agents.length, 6);
  assert.equal(byName["Claude Code"].id, "claude");
  assert.equal(byName["Claude Code"].model, "");
  assert.equal(byName["Claude Code"].path, "~/.claude/settings.json");

  assert.equal(byName.Codex.id, "codex");
  assert.equal(byName.Codex.model, "");
  assert.deepEqual(byName.Codex.extras, [{ label: "effort", value: "medium" }]);

  assert.equal(byName["Gemini CLI"].id, "gemini");
  assert.equal(byName["Gemini CLI"].model, "gemini-3.8-flash");
  assert.deepEqual(byName["Gemini CLI"].extras, [
    { label: "auth", value: "google" },
  ]);

  assert.equal(byName.OpenCode.model, "magpie/autolink/gpt-6-sol");
  assert.deepEqual(byName.OpenCode.extras, [
    { label: "small", value: "deepseek/deepseek-flash" },
  ]);

  assert.equal(byName.Pi.model, "deepseek/deepseek-flash");
  assert.deepEqual(byName.Pi.extras, [{ label: "thinking", value: "medium" }]);
  assert.equal(byName.Cursor.id, "cursor");
});

test("parseAgents reads magpie 0.1.408 columns", () => {
  const agents = parseAgents(fixture("ls-0.1.408.txt"));
  const byName = Object.fromEntries(agents.map((agent) => [agent.name, agent]));

  assert.equal(agents.length, 10);
  assert.equal(byName["Claude Code"].model, "autolink/claude-opus-5-5[1m]");
  assert.equal(byName["Claude Code"].context, "1m");
  assert.deepEqual(byName["Claude Code"].extras, []);
  assert.equal(
    modelLabel(byName["Claude Code"].model),
    "autolink/claude-opus-5-5",
  );

  assert.equal(byName["Gemini CLI"].model, "gemini-3.8-flash");
  assert.deepEqual(byName["Gemini CLI"].extras, []);
  assert.equal(byName["Antigravity CLI"].id, "agy");
  assert.equal(byName["Antigravity CLI"].model, "Gemini 3.8 Flash (High)");
  assert.equal(byName["Grok Build"].id, "grok");
  assert.equal(byName.Cursor.model, "auto");

  assert.equal(byName["Claude Desktop"].id, "claude-desktop");
  assert.equal(byName["Claude Desktop"].model, "");
  assert.equal(
    byName["Claude Desktop"].path,
    "~/Library/Application Support/Claude/claude_desktop_config.json",
  );
  assert.equal(byName.Cindy.id, "cindy");
  assert.equal(byName.Cindy.model, "magpie cindy add  to add magpie");
  assert.equal(byName.Cindy.path, "~/Library/Application Support/Cindy");
});

test("parseAgents maps a hidden agent and leaves an unknown name unmapped", () => {
  const text = [
    "  Goose hidden  —                                                            ~/.config/goose/config.yaml",
    "  Brand New      custom/model                                                ~/.brand",
  ].join("\n");
  const [goose, brand] = parseAgents(text);
  assert.equal(goose.id, "goose");
  assert.equal(goose.hidden, true);
  assert.equal(goose.model, "");
  assert.equal(brand.id, undefined);
  assert.equal(brand.name, "Brand New");
  assert.equal(brand.model, "custom/model");
});

test("parseModels groups the catalog and keeps efforts off the id", () => {
  const catalog = parseModels(fixture("models.txt"));
  assert.equal(catalog.empty, false);

  const deepseek = catalog.sections.find(
    (section) => section.title === "DeepSeek",
  );
  const pro = deepseek?.models.find(
    (model) => model.id === "deepseek/deepseek-v4-pro",
  );
  assert.equal(pro?.name, "DeepSeek V4 Pro");
  assert.deepEqual(pro?.efforts, ["low", "high", "max"]);

  const flash = catalog.sections
    .find((section) => section.title === "AutoLink")
    ?.models.find((model) => model.id === "autolink/deepseek-v4-flash");
  assert.equal(flash?.name, undefined);
  assert.equal(flash?.efforts, undefined);

  const groups = catalog.sections.find(
    (section) => section.title === "Routing groups",
  );
  const grok = groups?.models.find(
    (model) => model.id === "group/auto-grok-4-7",
  );
  assert.equal(grok?.name, "Grok 4.7");
  assert.equal(
    groups?.models.some((model) => model.id.startsWith("http")),
    false,
  );
  assert.equal(
    catalog.sections.some((section) => section.title.includes("127.0.0.1")),
    false,
  );
});

test("parseModels treats a bare effort list as efforts", () => {
  const catalog = parseModels("  Demo\n  demo/chat  low/high/max\n");
  assert.deepEqual(catalog.sections[0].models[0], {
    id: "demo/chat",
    name: undefined,
    efforts: ["low", "high", "max"],
    section: "Demo",
  });
});

test("parseModels recognizes an empty catalog", () => {
  assert.deepEqual(parseModels(fixture("models-empty.txt")), {
    empty: true,
    sections: [],
  });
});

test("parseProfiles accepts the 0.1.408 empty hint", () => {
  assert.equal(
    parseProfiles("no profiles yet · magpie save <name>\n").empty,
    true,
  );
});

test("parseModels keeps none and ultra on the effort list", () => {
  const catalog = parseModels(
    "  AutoLink\n  autolink/gpt-6-sol  GPT-6 Sol  none/low/medium/high/xhigh/max/ultra\n",
  );
  assert.deepEqual(catalog.sections[0].models[0].efforts, [
    "none",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
    "ultra",
  ]);
  assert.equal(catalog.sections[0].models[0].name, "GPT-6 Sol");
});

test("parseProfiles reads names and summaries", () => {
  const parsed = parseProfiles(fixture("profiles.txt"));
  assert.equal(parsed.empty, false);
  assert.deepEqual(parsed.profiles, [
    {
      name: "work",
      summary: "claude deepseek/deepseek-v4-pro · codex group/auto-gpt-6-sol",
    },
    { name: "local", summary: "pi ollama/llama3" },
  ]);
  assert.equal(parseProfiles(fixture("profiles-empty.txt")).empty, true);
});

test("parseUsage reads the 7 day report", () => {
  const usage = parseUsage(fixture("usage-7d.txt"));
  assert.equal(usage.ok, true);
  if (!usage.ok || usage.empty) throw new Error("expected a usage report");
  assert.equal(usage.tokens, "421K");
  assert.equal(usage.period, "last 7 days");
  assert.equal(usage.calls, 19);
  assert.equal(usage.price, "no price");
  assert.match(usage.breakdown, /^in 417K/);
  assert.deepEqual(usage.agents[0], {
    name: "Codex",
    share: "97%",
    tokens: "409K",
    calls: "18",
    price: "no price",
  });
  assert.equal(usage.agents[1].name, "Pi");
  assert.equal(usage.agents[1].calls, "1");
  assert.equal(usage.models[1].name, "autolink/grok-4.7");
  assert.equal(usage.models[1].share, "3%");
  assert.equal(usage.sessions.length, 0);
  assert.equal(usage.path, "/Users/me/.config/magpie/usage.jsonl");
});

test("parseUsage keeps the sessions table out of the model rows", () => {
  const usage = parseUsage(fixture("usage-0.1.408.txt"));
  assert.equal(usage.ok, true);
  if (!usage.ok || usage.empty) throw new Error("expected a usage report");
  assert.equal(usage.tokens, "50M");
  assert.equal(usage.calls, 1879);
  assert.match(usage.breakdown, /212 errors$/);
  assert.deepEqual(
    usage.models.map((row) => row.name),
    ["autolink/gpt-6-sol", "autolink/claude-opus-5-5"],
  );
  assert.equal(usage.sessionNote, "top 10 of 18");
  assert.equal(usage.sessions.length, 2);
  assert.equal(usage.sessions[0].name, "Pi  sess-pi-1");
  assert.equal(usage.sessions[0].calls, "47");
  assert.equal(usage.sessions[1].calls, "1");
  assert.equal(usage.path, "/Users/me/.config/magpie/usage.jsonl");
});

test("parseUsage accepts a priced headline and an empty report", () => {
  const priced = parseUsage(
    "12 tokens last 7 days · 2 calls · ≈$1.20\n  agents\n  Codex  10% 1.2K    2 calls   ≈$0.003+\n",
  );
  assert.equal(priced.ok && !priced.empty && priced.price, "≈$1.20");
  assert.equal(
    priced.ok && !priced.empty && priced.agents[0].price,
    "≈$0.003+",
  );

  const empty = parseUsage(fixture("usage-empty.txt"));
  assert.equal(empty.ok && empty.empty, true);
  if (empty.ok && empty.empty) assert.match(empty.path ?? "", /usage\.jsonl$/);
});

test("parseUsage keeps provider-key and account sections", () => {
  const usage = parseUsage(fixture("usage-0.1.671.txt"));
  assert.equal(usage.ok, true);
  if (!usage.ok || usage.empty) throw new Error("expected a usage report");
  assert.equal(usage.price, "≈$1.20");
  assert.equal(usage.agents[0].price, "≈$0.80 ttft 1.2 s · 10 tok/s");
  assert.equal(usage.agents[1].price, "≈$0.40");
  assert.equal(usage.models[0].name, "openai/gpt-5.6-luna @ chatgpt.com");
  assert.deepEqual(
    usage.models.map((row) => row.name),
    ["openai/gpt-5.6-luna @ chatgpt.com", "autolink/grok-4.7"],
  );
  assert.deepEqual(
    usage.extras.map((section) => section.title),
    ["upstream provider keys", "accounts"],
  );
  assert.equal(usage.extras[0].rows[0].name, "autolink / key not recorded");
  assert.equal(usage.extras[1].rows[0].name, "codex / ada@example.com · Team");
  assert.equal(usage.sessions[0].name, "Codex  sess-example");
});

test("parseUsage falls back when a row is not a table line", () => {
  const broken = parseUsage(
    "1 token today · 1 call · no price\n  agents\n  Codex  no%  1 call\n",
  );
  assert.equal(broken.ok, false);
});

test("parseUsage reads local session usage when the gateway has no calls", () => {
  const usage = parseUsage(fixture("usage-0.1.1088.txt"));
  assert.ok(usage.ok && !usage.empty);
  assert.equal(usage.source, "local");
  assert.equal(usage.tokens, "39.7K");
  assert.equal(usage.calls, 4);
  assert.equal(usage.price, "≈$0.095");
  assert.equal(usage.agents[0].name, "Codex");
  assert.equal(usage.models[0].name, "local session/gpt-6.1-sol");
  assert.equal(usage.sessions[0].name, "Codex  sess-local-example");
  assert.equal(usage.path, "/Users/me/.config/magpie/usage.jsonl");
  assert.equal(usage.local, undefined);
});

test("parseUsage separates gateway and local totals, rows and breakdowns", () => {
  const local = fixture("usage-0.1.1088.txt").split("\n").slice(1).join("\n");
  const usage = parseUsage(fixture("usage-0.1.671.txt") + local);
  assert.ok(usage.ok && !usage.empty);
  assert.equal(usage.source, "gateway");
  assert.equal(usage.tokens, "2");
  assert.equal(usage.calls, 3);
  assert.equal(usage.agents.length, 2);
  assert.equal(usage.models.length, 2);
  assert.equal(usage.extras.length, 2);
  assert.equal(usage.sessions.length, 1);
  assert.equal(usage.local?.source, "local");
  assert.equal(usage.local?.tokens, "39.7K");
  assert.equal(usage.local?.calls, 4);
  assert.equal(usage.local?.models.length, 1);
  assert.equal(usage.local?.sessions.length, 1);
  assert.match(usage.breakdown, /^in 2 /);
  assert.match(usage.local?.breakdown ?? "", /^in 38.8K /);
});

test("parseUsage accepts the new gateway-only empty output", () => {
  const usage = parseUsage(
    "no calls through magpie today\n  /Users/me/.config/magpie/usage.jsonl\n",
  );
  assert.ok(usage.ok && usage.empty);
  assert.equal(usage.path, "/Users/me/.config/magpie/usage.jsonl");
});

test("parseUsage rejects malformed rows and local reports", () => {
  for (const line of [
    "  Codex  1K  1 call  no price",
    "  unexpected heading",
    "Codex 100% 1K 1 call no price",
  ]) {
    const usage = parseUsage(
      `1 token today · 1 call · no price\n  agents\n${line}\n`,
    );
    assert.equal(usage.ok, false, line);
  }
  const broken = fixture("usage-0.1.1088.txt").replace(
    "39.7K tokens",
    "unknown total",
  );
  assert.equal(parseUsage(broken).ok, false);
});

test("parseAccounts reads 0.1.1088 plugin quotas, reset counters and vendor errors", () => {
  const accounts = parseAccounts(fixture("accounts-0.1.1088.json"));
  assert.equal(accounts.length, 4);
  assert.deepEqual(accounts[0].windows[0], {
    name: "5 hours",
    used: 2,
    remaining: 98,
    resetsAt: "2026-10-07T02:52:28+08:00",
    display: undefined,
  });
  assert.equal(accounts[0].plan, "team");
  assert.equal(accounts[0].active, true);
  assert.equal(accounts[0].on, true);
  assert.deepEqual(accounts[0].resets, {
    count: 2,
    until: "2026-10-22T20:45:36.116738Z",
  });
  assert.match(accounts[2].error ?? "", /This client is no longer supported/);
  assert.deepEqual(accounts[2].windows, []);
  assert.equal(accounts[3].agent, "grok-plugin");
  assert.equal(accounts[3].windows[0].remaining, 99);
});

test("parseQuotas reads the 0.1.1088 subscription shape", () => {
  const quotas = parseQuotas(fixture("quota-0.1.1088.json"));
  assert.equal(quotas.length, 2);
  assert.equal(quotas[0].provider, "codex");
  assert.equal(quotas[0].kind, "subscription");
  assert.equal(quotas[0].windows[1].used, 11);
  assert.equal(quotas[0].windows[1].remaining, 89);
  assert.deepEqual(quotas[0].resets, {
    count: 2,
    until: "2026-10-22T20:45:36.116738Z",
  });
  assert.equal(quotas[1].provider, "grok-plugin");
  assert.equal(quotas[1].windows[0].resetsAt, "2026-10-09T01:43:44.099Z");
});

test("parseAccounts reads the quota JSON", () => {
  const accounts = parseAccounts(fixture("accounts.json"));
  assert.equal(accounts.length, 3);
  assert.equal(accounts[0].agent, "codex");
  assert.equal(accounts[0].active, true);
  assert.equal(accounts[0].windows[1].used, 23);
  assert.equal(accounts[0].windows[1].resetsAt, "2026-09-27T07:31:04+08:00");
  assert.equal(accounts[2].error, "quota unavailable");
  assert.deepEqual(accounts[2].windows, []);
  assert.equal(accounts[0].resets, undefined);
});

test("parseAccounts keeps the reset counter added after 0.1.58", () => {
  const accounts = parseAccounts(
    JSON.stringify([
      {
        agent: "codex",
        user: "ada@example.com",
        active: true,
        on: true,
        windows: [],
        resets: { count: 2, until: "2026-10-04T22:30:02Z" },
      },
    ]),
  );
  assert.deepEqual(accounts[0].resets, {
    count: 2,
    until: "2026-10-04T22:30:02Z",
  });
});

test("parseQuotas reads subscription windows and key balances", () => {
  const quotas = parseQuotas(fixture("quota.json"));
  assert.equal(quotas[0].kind, "subscription");
  assert.equal(quotas[0].windows[0].used, 0);
  assert.deepEqual(quotas[0].resets, {
    count: 2,
    until: "2026-10-04T22:30:02.754094Z",
  });
  assert.equal(quotas[1].kind, "balance");
  assert.equal(quotas[1].balance, "¥1363.67");
  assert.deepEqual(quotas[1].windows, []);
});

test("parseSessions reads the session JSON", () => {
  const sessions = parseSessions(fixture("sessions.json"));
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].agent, "pi");
  assert.equal(sessions[0].id, "sess-pi-1");
  assert.deepEqual(sessions[0].models, ["deepseek/deepseek-flash"]);
  assert.equal(sessions[0].input, 1000);
  assert.equal(sessions[0].cost, 0.01);
  assert.equal(sessions[0].unpriced, false);
  assert.match(sessions[0].resume ?? "", /pi --resume sess-pi-1$/);
});

test("sameModel treats the magpie gateway prefix as the catalog id", () => {
  assert.equal(
    sameModel("magpie/autolink/gpt-6-sol", "autolink/gpt-6-sol"),
    true,
  );
  assert.equal(
    sameModel("deepseek/deepseek-flash", "deepseek/deepseek-flash"),
    true,
  );
  assert.equal(sameModel("magpie/autolink/gpt-6-sol", "autolink/other"), false);
  assert.equal(sameModel("", "autolink/gpt-6-sol"), false);
  assert.equal(
    sameModel("autolink/claude-opus-5-5[1m]", "autolink/claude-opus-5-5"),
    true,
  );
  assert.equal(
    sameModel(
      "magpie/autolink/claude-opus-5-5[1m]",
      "autolink/claude-opus-5-5",
    ),
    true,
  );
  assert.equal(
    sameModel("autolink/other[1m]", "autolink/claude-opus-5-5"),
    false,
  );
});

test("matchingModelId accepts a bare slug only when it is unique", () => {
  assert.equal(
    matchingModelId("grok-4.7", ["grok/grok-4.7", "grok/grok-4.6"]),
    "grok/grok-4.7",
  );
  assert.equal(
    matchingModelId("gpt-6-sol", ["autolink/gpt-6-sol", "openai/gpt-6-sol"]),
    undefined,
  );
  assert.equal(
    matchingModelId("autolink/claude-opus-5-5[1m]", [
      "autolink/claude-opus-5-5",
    ]),
    "autolink/claude-opus-5-5",
  );
  assert.equal(
    matchingModelId("magpie/autolink/gpt-6-sol", [
      "autolink/gpt-6-sol",
      "openai/gpt-6-sol",
    ]),
    "autolink/gpt-6-sol",
  );
});

test("parseConfirmation keeps the restart notice", () => {
  const note = parseConfirmation(
    "✓ Claude Code model deepseek/deepseek-v4-pro\n  ↻ restart Codex to refresh its model list\n",
  );
  assert.equal(note.summary, "Claude Code model deepseek/deepseek-v4-pro");
  assert.equal(note.notice, "restart Codex to refresh its model list");
});
