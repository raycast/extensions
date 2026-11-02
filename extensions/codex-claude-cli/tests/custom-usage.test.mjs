import assert from "node:assert/strict";
import { test } from "node:test";
import * as fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/lib/custom-usage.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const adapter = { exports: {} };
new Function("require", "module", "exports", compiled.outputText)(require, adapter, adapter.exports);
const { parseCustomUsage, fetchCustomUsage } = adapter.exports;
const now = Date.parse("2026-10-07T12:00:00Z");
const provider = (overrides = {}) => ({
  id: "example",
  name: "Example",
  updatedAt: new Date(now).toISOString(),
  windows: [{ label: "Session", usedPercent: 28, resetAt: "2026-10-07T15:00:00Z" }],
  ...overrides,
});
const parse = (...providers) => parseCustomUsage({ version: 1, providers }, now);

test("maps measured quotas and preserves observation time", () => {
  const [state] = parse(provider({ plan: "Pro", dashboardUrl: "https://example.com/usage" }));
  assert.equal(state.name, "Example");
  assert.equal(state.source, "live");
  assert.equal(state.data.fetchedAt, now);
  assert.equal(state.data.windows[0].remainingPercent, 72);
  assert.equal(state.data.windows[0].resetsAt, Date.parse("2026-10-07T15:00:00Z"));
  assert.equal(state.data.dashboardUrl, "https://example.com/usage");
  assert.equal(parse(provider({ name: "Renamed" }))[0].provider, state.provider);
});

test("rejects malformed documents and excessive providers", () => {
  for (const value of [
    null,
    [],
    {},
    { version: 2, providers: [] },
    { version: 1, providers: Array(31).fill(provider()) },
  ]) {
    assert.throws(() => parseCustomUsage(value, now));
  }
  assert.deepEqual(parse(), []);
});

test("isolates invalid providers and duplicate identities", () => {
  const states = parse(provider(), provider(), provider({ id: "other", name: "Other" }));
  assert.equal(states[0].source, "live");
  assert.equal(states[1].source, "unavailable");
  assert.match(states[1].error, /Duplicate/);
  assert.equal(states[2].source, "live");
  assert.equal(new Set(states.map((state) => state.provider)).size, 3);
});

test("validates percentages, timestamps, labels and URLs", () => {
  const invalid = [
    ...[-1, 101, NaN, Infinity, "28"].map((usedPercent) => ({ windows: [{ label: "Session", usedPercent }] })),
    { updatedAt: "yesterday" },
    { updatedAt: "2026-10-07T12:00:00" },
    { updatedAt: new Date(now + 61_000).toISOString() },
    { windows: [] },
    { windows: Array(21).fill({ label: "Session", usedPercent: 2 }) },
    { windows: [{ label: "Session", usedPercent: 2, resetAt: "invalid" }] },
    { name: "" },
    { name: "a\nb" },
    { name: "a".repeat(101) },
    { dashboardUrl: "javascript:alert(1)" },
    { dashboardUrl: "http://example.com" },
    { dashboardUrl: "https://user:password@example.com" },
  ];
  for (const overrides of invalid) {
    const [state, healthy] = parse(provider(overrides), provider({ id: "healthy" }));
    assert.equal(state.source, "unavailable", JSON.stringify(overrides));
    assert.equal(state.data, undefined);
    assert.equal(healthy.source, "live");
  }
});

test("old observations stay stale without changing their observation time", () => {
  const [old] = parse(provider({ updatedAt: new Date(now - 300_000).toISOString() }));
  assert.equal(old.source, "stale");
  assert.equal(old.data.fetchedAt, now - 300_000);
});

test("an expired session window does not mark a current weekly observation stale", () => {
  const [state] = parse(
    provider({
      windows: [
        { label: "5-hour", usedPercent: 98, resetAt: new Date(now).toISOString() },
        { label: "Weekly", usedPercent: 28, resetAt: new Date(now + 86_400_000).toISOString() },
      ],
    }),
  );
  assert.equal(state.source, "live");
  assert.equal(state.data.fetchedAt, now);
  assert.equal(state.data.windows[0].remainingPercent, 2);
  assert.equal(state.data.windows[0].resetsAt, now);
  assert.equal(state.data.windows[1].remainingPercent, 72);
  assert.equal(state.data.windows[1].resetsAt, now + 86_400_000);
});

test("reads bounded regular files and rejects invalid JSON", async () => {
  const directory = await fs.mkdtemp(path.join(tmpdir(), "promptcast-custom-test-"));
  const file = path.join(directory, "usage.json");
  try {
    await fs.writeFile(file, JSON.stringify({ version: 1, providers: [provider()] }));
    const [state] = await fetchCustomUsage(file);
    assert.equal(state.data.fetchedAt, now);
    await assert.rejects(fetchCustomUsage(directory), /regular JSON file/);
    await fs.writeFile(file, "broken");
    await assert.rejects(fetchCustomUsage(file), /invalid JSON/);
    await fs.writeFile(file, " ".repeat(1_048_577));
    await assert.rejects(fetchCustomUsage(file), /1 MB/);
    await assert.rejects(fetchCustomUsage(path.join(directory, "missing")), /Cannot open/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
