import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  parseAccounts,
  parseAgents,
  parseConfirmation,
  parseModels,
  parseProfiles,
  parseUsage,
} from "../src/lib/parse";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

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
  assert.deepEqual(byName["Gemini CLI"].extras, [{ label: "auth", value: "google" }]);

  assert.equal(byName.OpenCode.model, "magpie/autolink/gpt-6-sol");
  assert.deepEqual(byName.OpenCode.extras, [{ label: "small", value: "deepseek/deepseek-flash" }]);

  assert.equal(byName.Pi.model, "deepseek/deepseek-flash");
  assert.deepEqual(byName.Pi.extras, [{ label: "thinking", value: "medium" }]);
  assert.equal(byName.Cursor.id, "cursor");
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

  const deepseek = catalog.sections.find((section) => section.title === "DeepSeek");
  const pro = deepseek?.models.find((model) => model.id === "deepseek/deepseek-v4-pro");
  assert.equal(pro?.name, "DeepSeek V4 Pro");
  assert.deepEqual(pro?.efforts, ["low", "high", "max"]);

  const flash = catalog.sections
    .find((section) => section.title === "AutoLink")
    ?.models.find((model) => model.id === "autolink/deepseek-v4-flash");
  assert.equal(flash?.name, undefined);
  assert.equal(flash?.efforts, undefined);

  const groups = catalog.sections.find((section) => section.title === "Routing groups");
  const grok = groups?.models.find((model) => model.id === "group/auto-grok-4-7");
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
  assert.deepEqual(parseModels(fixture("models-empty.txt")), { empty: true, sections: [] });
});

test("parseProfiles reads names and summaries", () => {
  const parsed = parseProfiles(fixture("profiles.txt"));
  assert.equal(parsed.empty, false);
  assert.deepEqual(parsed.profiles, [
    { name: "work", summary: "claude deepseek/deepseek-v4-pro · codex group/auto-gpt-6-sol" },
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
  assert.deepEqual(usage.agents[0], { name: "Codex", share: "97%", tokens: "409K", calls: "18", price: "no price" });
  assert.equal(usage.agents[1].name, "Pi");
  assert.equal(usage.agents[1].calls, "1");
  assert.equal(usage.models[1].name, "autolink/grok-4.7");
  assert.equal(usage.models[1].share, "3%");
  assert.equal(usage.path, "/Users/me/.config/magpie/usage.jsonl");
});

test("parseUsage accepts a priced headline and an empty report", () => {
  const priced = parseUsage("12 tokens last 7 days · 2 calls · ≈$1.20\n  agents\n  Codex  10% 1.2K    2 calls   ≈$0.003+\n");
  assert.equal(priced.ok && !priced.empty && priced.price, "≈$1.20");
  assert.equal(priced.ok && !priced.empty && priced.agents[0].price, "≈$0.003+");

  const empty = parseUsage(fixture("usage-empty.txt"));
  assert.equal(empty.ok && empty.empty, true);
  if (empty.ok && empty.empty) assert.match(empty.path ?? "", /usage\.jsonl$/);
});

test("parseUsage falls back when a row is not a table line", () => {
  const broken = parseUsage("1 token today · 1 call · no price\n  agents\n  not a row\n");
  assert.equal(broken.ok, false);
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
});

test("parseConfirmation keeps the restart notice", () => {
  const note = parseConfirmation("✓ Claude Code model deepseek/deepseek-v4-pro\n  ↻ restart Codex to refresh its model list\n");
  assert.equal(note.summary, "Claude Code model deepseek/deepseek-v4-pro");
  assert.equal(note.notice, "restart Codex to refresh its model list");
});
