import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";
import {
  INDEX_VERSION,
  aggregateCodexIndex,
  compactNumber,
  money,
  parseCostOutput,
  parseRolloutHead,
  parseRolloutTail,
  readRolloutUsage,
  refreshCodexIndex,
  accountLabel,
  aggregateAccounts,
  aggregateModels,
  lifetimeSummary,
  refreshStats,
} from "../lib/stats";

const fixture = (name: string) => fs.readFile(path.join(__dirname, "fixtures", name), "utf8");
const tokens = { input: 120, cachedInput: 30, output: 20, reasoning: 5, total: 140 };
const context = {
  managed: [
    {
      id: "synthetic-managed",
      email: "synthetic@example.invalid",
      managedHomePath: "/synthetic/home",
      workspaceAccountID: "workspace-synthetic",
      providerAccountID: "provider-synthetic",
      workspaceLabel: "Synthetic lab",
    },
  ],
  workspaceLabels: { "workspace-fallback": "Synthetic workspace" },
  live: { accountId: "live-synthetic", email: "live@example.invalid", authMode: "chatgpt", isSymlink: false },
};

async function withTemp(run: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(tmpdir(), "synthetic-stats-test-"));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("stats formatting keeps billion-scale token counts and compact dollars", () => {
  assert.equal(compactNumber(0), "0");
  assert.equal(compactNumber(1234), "1.2K");
  assert.equal(compactNumber(17050420913), "17.05B");
  assert.equal(money(12800), "$12.8k");
});

test("cost parser rejects empty, malformed, and error-only output without leaking it", () => {
  for (const output of ["", "   ", "not-json synthetic-secret", JSON.stringify({ error: "synthetic-secret" })]) {
    assert.throws(
      () => parseCostOutput(output, "codex"),
      (error: unknown) => error instanceof Error && !error.message.includes("synthetic-secret"),
    );
  }
});

test("rollout parser uses the last cumulative count and tolerates malformed lines", async () => {
  const text = await fixture("stats-rollout-cumulative.jsonl");
  assert.deepEqual(parseRolloutHead(text), {
    accountId: "workspace-synthetic",
    startedAt: "2026-09-01T12:00:00.000Z",
    forked: false,
  });
  assert.deepEqual(parseRolloutTail(text), tokens);
  assert.equal(parseRolloutTail('{"type":"event_msg","payload":{"type":"other"}}\n'), null);
  assert.deepEqual(parseRolloutHead("{broken\n"), { accountId: null, startedAt: null, forked: false });
});

test("bounded rollout reads preserve attribution and ignore a truncated final event", async () => {
  await withTemp(async (root) => {
    const file = path.join(root, "rollout-synthetic.jsonl");
    await fs.writeFile(file, await fixture("stats-rollout-cumulative.jsonl"));
    assert.deepEqual(await readRolloutUsage(file, { headBytes: 2048, tailBytes: 4096 }), {
      accountId: "workspace-synthetic",
      startedAt: "2026-09-01T12:00:00.000Z",
      forked: false,
      own: tokens,
    });
    await fs.writeFile(file, await fixture("stats-rollout-empty.jsonl"));
    const empty = await readRolloutUsage(file);
    assert.equal(empty.own.total, 0);
    assert.equal(empty.own.input, 0);
    assert.equal(empty.own.output, 0);
    assert.equal(empty.own.cachedInput, 0);
  });
});

test("Codex index persists entries, skips unchanged files, rereads changes, and retains deleted usage", async () => {
  await withTemp(async (root) => {
    const sessionsDir = path.join(root, "sessions");
    const stateDir = path.join(root, "state");
    await fs.mkdir(path.join(sessionsDir, "nested"), { recursive: true });
    const file = path.join(sessionsDir, "nested", "rollout-synthetic.jsonl");
    await fs.writeFile(file, "synthetic first version");
    let reads = 0;
    const readRollout = async () => {
      reads++;
      return { accountId: "workspace-synthetic", startedAt: "2026-09-01T12:00:00Z", forked: false, own: tokens };
    };
    const first = await refreshCodexIndex({ sessionsDir, stateDir, readRollout });
    assert.equal(first.filesRead, 1);
    assert.equal(Object.keys(first.index.entries).length, 1);
    assert.equal(first.index.version, INDEX_VERSION);
    const cached = JSON.parse(await fs.readFile(path.join(stateDir, "codex-usage-index.json"), "utf8"));
    assert.deepEqual(cached.entries, first.index.entries);
    const second = await refreshCodexIndex({ sessionsDir, stateDir, readRollout });
    assert.equal(second.filesUnchanged, 1);
    assert.equal(reads, 1);
    await fs.appendFile(file, " synthetic changed version");
    assert.equal((await refreshCodexIndex({ sessionsDir, stateDir, readRollout })).filesRead, 1);
    assert.equal(reads, 2);
    await fs.unlink(file);
    const removed = await refreshCodexIndex({ sessionsDir, stateDir, readRollout });
    assert.equal(removed.filesDeleted, 1);
    assert.equal(removed.index.entries[file].deleted, true);
    assert.deepEqual(removed.index.entries[file].own, tokens);
    assert.equal(aggregateCodexIndex(removed.index).tokens.total, 140);
    assert.equal((await refreshCodexIndex({ sessionsDir, stateDir, readRollout })).filesDeleted, 0);
    await fs.writeFile(file, "synthetic recreated version");
    const recreated = await refreshCodexIndex({ sessionsDir, stateDir, readRollout });
    assert.equal(recreated.filesRead, 1);
    assert.ok(!recreated.index.entries[file].deleted);
  });
});

test("Codex index records read failures and retries on the next refresh", async () => {
  await withTemp(async (root) => {
    const sessionsDir = path.join(root, "sessions");
    const stateDir = path.join(root, "state");
    await fs.mkdir(sessionsDir);
    await fs.writeFile(path.join(sessionsDir, "rollout-synthetic.jsonl"), "synthetic");
    const failed = await refreshCodexIndex({
      sessionsDir,
      stateDir,
      readRollout: async () => {
        throw new Error("Synthetic read failure");
      },
    });
    assert.equal(failed.failedFiles, 1);
    const recovered = await refreshCodexIndex({
      sessionsDir,
      stateDir,
      readRollout: async () => ({ accountId: null, startedAt: null, forked: false, own: tokens }),
    });
    assert.equal(recovered.filesRead, 1);
    assert.equal(recovered.failedFiles, 0);
  });
});

test("account labels resolve workspace IDs, provider IDs, live identity, and unknown attribution", () => {
  for (const id of ["workspace-synthetic", "provider-synthetic"])
    assert.equal(accountLabel(id, context), "synthetic@example.invalid · Synthetic lab");
  assert.equal(accountLabel("workspace-fallback", context), "Synthetic workspace");
  assert.equal(accountLabel("live-synthetic", context), "live@example.invalid");
  assert.equal(accountLabel("unknown-synthetic", context), "Account unknown-");
  assert.equal(accountLabel(null, context), "Account not recorded");
});

test("account aggregation combines sessions and sorts cumulative totals", () => {
  const entry = (accountId: string | null, startedAt: string | null, total: number) => ({
    size: 1,
    mtimeMs: 1,
    accountId,
    startedAt,
    forked: false,
    own: { ...tokens, total },
  });
  const rows = aggregateAccounts(
    {
      version: 2,
      updatedAt: "2026-10-01T00:00:00Z",
      entries: {
        a: entry("workspace-synthetic", "2026-09-01T12:00:00Z", 140),
        b: entry("workspace-synthetic", "2026-09-02T12:00:00Z", 200),
        c: entry(null, null, 10),
      },
    },
    context,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].tokens.total, 340);
  assert.equal(rows[0].tokens.input, 240);
  assert.equal(rows[0].sessions, 2);
  assert.equal(rows[0].firstSession, "2026-09-01T12:00:00Z");
  assert.equal(rows[0].lastSession, "2026-09-02T12:00:00Z");
  assert.equal(rows[1].label, "Account not recorded");
});

test("cost parser separates providers and preserves cache, reasoning, and missing costs", async () => {
  const { output } = JSON.parse(await fixture("stats-cost.json"));
  const claude = parseCostOutput(JSON.stringify(output), "claude");
  assert.deepEqual(claude.tokens, { input: 100, cachedInput: 60, cacheWrite: 10, output: 20, total: 190 });
  assert.equal(claude.totalCost, 2.5);
  assert.equal(claude.last30DaysTokens, 190);
  assert.equal(claude.last30DaysCostUSD, 2.5);
  assert.equal(claude.historyCoverageIsEstablished, true);
  assert.equal(claude.updatedAt, "2026-10-01T00:00:00.000Z");
  assert.deepEqual(claude.daily[0].models[0], {
    provider: "claude",
    modelName: "synthetic-model",
    totalTokens: 100,
    cost: 1.5,
  });
  const codex = parseCostOutput(JSON.stringify(output), "codex");
  assert.deepEqual(codex.tokens, { input: 50, cachedInput: 0, output: 10, reasoning: 5, total: 60 });
  assert.equal(codex.totalCost, null);
  assert.equal(codex.daily[0].totalCost, null);
  assert.equal(codex.daily[0].models[0].cost, null);
  assert.equal(codex.last30DaysTokens, null);
  assert.equal(codex.last30DaysCostUSD, null);
  assert.equal(codex.updatedAt, null);
});

test("model aggregation combines Claude days and excludes Codex model totals", async () => {
  const { output } = JSON.parse(await fixture("stats-cost.json"));
  const providers = [
    parseCostOutput(JSON.stringify(output), "claude"),
    parseCostOutput(JSON.stringify(output), "codex"),
  ];
  const rows = aggregateModels(providers);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].provider, "claude");
  assert.equal(rows[0].totalTokens, 190);
  assert.equal(rows[0].cost, 2.5);

  assert.equal(aggregateModels(providers, 1).length, 1);
});

test("rollout parser ignores last-turn counts and preserves optional cache writes", () => {
  const text = JSON.stringify({
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: 20,
          cached_input_tokens: 3,
          cache_write_input_tokens: 4,
          output_tokens: 6,
          total_tokens: 26,
        },
        last_token_usage: { input_tokens: 2, output_tokens: 1, total_tokens: 3 },
      },
    },
  });
  assert.deepEqual(parseRolloutTail(text), {
    input: 20,
    cachedInput: 3,
    cacheWrite: 4,
    output: 6,
    reasoning: 0,
    total: 26,
  });
  const lastTurnOnly = JSON.stringify({
    type: "event_msg",
    payload: { type: "token_count", info: { last_token_usage: { total_tokens: 999 } } },
  });
  assert.equal(parseRolloutTail(lastTurnOnly), null);
});

test("rollout reader finds distant counts across chunk boundaries and a multi-megabyte irrelevant line", async () => {
  await withTemp(async (root) => {
    const file = path.join(root, "rollout-synthetic-distant.jsonl");
    const metadata = JSON.stringify({
      type: "session_meta",
      payload: { creator_account_id: "workspace-synthetic", timestamp: "2026-09-01T08:00:00-04:00" },
    });
    const cumulative = JSON.stringify({
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          last_token_usage: {
            input_tokens: 120,
            cached_input_tokens: 30,
            output_tokens: 20,
            reasoning_output_tokens: 5,
            total_tokens: 140,
          },
          total_token_usage: {
            input_tokens: 120,
            cached_input_tokens: 30,
            output_tokens: 20,
            reasoning_output_tokens: 5,
            total_tokens: 140,
          },
        },
      },
    });
    const syntheticMarker = JSON.stringify({ type: "synthetic_fixture", payload: { synthetic: true } });
    const irrelevant = JSON.stringify({ type: "synthetic_irrelevant", payload: "x".repeat(3 * 1024 * 1024) });
    await fs.writeFile(file, [metadata, syntheticMarker, cumulative, '{"truncated":'].join("\n"));
    const crossingChunks = await readRolloutUsage(file, { headBytes: 512, tailBytes: 113 });
    assert.deepEqual(crossingChunks.own, tokens);
    await fs.writeFile(file, [metadata, syntheticMarker, cumulative, irrelevant, '{"truncated":'].join("\n"));
    const result = await readRolloutUsage(file, { headBytes: 512, tailBytes: 8191 });
    assert.deepEqual(result, {
      accountId: "workspace-synthetic",
      startedAt: "2026-09-01T12:00:00.000Z",
      forked: false,
      own: tokens,
    });
  });
});

test("lifetime summary counts the union of active days and reports Claude costs", async () => {
  const { output } = JSON.parse(await fixture("stats-cost.json"));
  const claude = parseCostOutput(JSON.stringify(output), "claude");
  const codex = parseCostOutput(JSON.stringify(output), "codex");
  codex.daily.push({ date: "2026-09-03", totalTokens: 10, totalCost: null, models: [] });
  codex.daily.push({ date: "2026-09-04", totalTokens: 0, totalCost: null, models: [] });
  const summary = lifetimeSummary([claude, codex]);
  assert.deepEqual(summary.tokens, {
    input: 150,
    cachedInput: 60,
    cacheWrite: 10,
    output: 30,
    reasoning: 5,
    total: 250,
  });
  assert.equal(summary.daysActive, 3);
  assert.equal(summary.firstDay, "2026-09-01");
  assert.equal(summary.lastDay, "2026-09-04");
  assert.equal(summary.totalCost, 2.5);
  assert.equal(summary.last30DaysTokens, null);
  assert.equal(summary.last30DaysCostUSD, 2.5);
  assert.equal(summary.historyCoverageIsEstablished, false);
  assert.equal(lifetimeSummary([claude]).totalCost, 2.5);
  assert.equal(lifetimeSummary([]).daysActive, 0);
  assert.equal(lifetimeSummary([]).totalCost, null);
});

test("refresh isolates provider failures while preserving cached statistics and indexing synthetic sessions", async () => {
  await withTemp(async (root) => {
    const stateDir = path.join(root, "state");
    const sessionsDir = path.join(root, "sessions");
    await fs.mkdir(sessionsDir);
    await fs.writeFile(
      path.join(sessionsDir, "rollout-synthetic.jsonl"),
      await fixture("stats-rollout-cumulative.jsonl"),
    );
    const { output } = JSON.parse(await fixture("stats-cost.json"));
    const base = { stateDir, sessionsDir, accountContext: context, codexbarPath: "/synthetic/codexbar" };
    const success = (stdout: string) => ({
      exitCode: 0,
      signal: null,
      stdout,
      stderr: "",
      timedOut: false,
      truncated: false,
    });
    const initial = await refreshStats({ ...base, query: async () => success(JSON.stringify(output)) });
    assert.equal(initial.version, 2);
    assert.equal(initial.providers.claude?.tokens.total, 190);
    assert.equal(initial.providers.codex?.tokens.total, 140);
    assert.equal(initial.providers.codex?.sessions, 1);
    assert.equal(initial.providers.codex?.attributedSessions, 1);
    assert.equal(initial.providers.codex?.firstAttributedSession, "2026-09-01T12:00:00.000Z");
    assert.equal(initial.accounts[0].label, "synthetic@example.invalid · Synthetic lab");
    const calls: string[][] = [];
    const refreshed = await refreshStats({
      ...base,
      rescan: true,
      query: async (_file, args) => {
        calls.push([...args]);
        if (args.includes("claude")) throw new Error("synthetic-private-error");
        return success(JSON.stringify([{ ...output[1], totals: { ...output[1].totals, totalTokens: 88 } }]));
      },
    });
    assert.equal(refreshed.providers.claude?.tokens.total, 190);
    assert.equal(refreshed.providers.codex?.tokens.total, 140);
    assert.match(refreshed.errors.claude ?? "", /cost scan failed/);
    assert.equal(refreshed.errors.codex, undefined);
    assert.equal(refreshed.errors.index, undefined);
    assert.ok(!JSON.stringify(refreshed).includes("synthetic-private-error"));
    assert.equal(calls.length, 1);
    assert.ok(calls.every((args) => args.includes("claude") && args.includes("--refresh") && args.includes("all")));
    const persisted = JSON.parse(await fs.readFile(path.join(stateDir, "usage-statistics.json"), "utf8"));
    assert.equal(persisted.providers.codex.tokens.total, 140);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const successfulQuery = (stdout: string) => ({
  exitCode: 0,
  signal: null,
  stdout,
  stderr: "",
  timedOut: false,
  truncated: false,
});

test(
  "late refresh subscribers receive indexed usage while the Claude query is pending",
  { timeout: 5000 },
  async () => {
    await withTemp(async (root) => {
      const sessionsDir = path.join(root, "sessions");
      await fs.mkdir(sessionsDir);
      await fs.writeFile(
        path.join(sessionsDir, "rollout-synthetic.jsonl"),
        await fixture("stats-rollout-cumulative.jsonl"),
      );
      const { output } = JSON.parse(await fixture("stats-cost.json"));
      const releaseClaude = deferred<void>();
      const codexPublished = deferred<void>();
      const base = {
        stateDir: path.join(root, "state"),
        sessionsDir,
        accountContext: context,
        codexbarPath: "/synthetic/codexbar",
      };
      let queries = 0;
      const running = refreshStats({
        ...base,
        query: async (_file, args) => {
          queries++;
          assert.ok(args.includes("claude"));
          await releaseClaude.promise;
          return successfulQuery(JSON.stringify(output));
        },
        onUpdate: (snapshot) => {
          if (snapshot.providers.codex && !snapshot.providers.claude) codexPublished.resolve();
        },
      });
      await codexPublished.promise;
      const seen: Array<{ claude: number | undefined; codex: number | undefined }> = [];
      const joined = refreshStats({
        ...base,
        query: async () => {
          throw new Error("Duplicate synthetic query");
        },
        onUpdate: (snapshot) => {
          seen.push({ claude: snapshot.providers.claude?.tokens.total, codex: snapshot.providers.codex?.tokens.total });
        },
      });
      assert.equal(joined, running);
      assert.deepEqual(seen[0], { claude: undefined, codex: 140 });
      releaseClaude.resolve();
      await joined;
      assert.equal(queries, 1);
      assert.ok(seen.some((snapshot) => snapshot.claude === 190 && snapshot.codex === 140));
    });
  },
);

test(
  "rescan requested during refresh queues one full scan after ordinary queries and index persistence",
  { timeout: 5000 },
  async () => {
    await withTemp(async (root) => {
      const sessionsDir = path.join(root, "sessions");
      const stateDir = path.join(root, "state");
      await fs.mkdir(sessionsDir);
      await fs.writeFile(
        path.join(sessionsDir, "rollout-synthetic.jsonl"),
        await fixture("stats-rollout-cumulative.jsonl"),
      );
      const { output } = JSON.parse(await fixture("stats-cost.json"));
      const releaseOrdinary = deferred<void>();
      const base = { stateDir, sessionsDir, accountContext: context, codexbarPath: "/synthetic/codexbar" };
      const calls: Array<{ provider: string; rescan: boolean }> = [];
      let ordinaryActive = 0;
      let indexCompleteBeforeRescan = false;
      const query = async (_file: string, args: readonly string[]) => {
        const rescan = args.includes("--refresh");
        calls.push({ provider: args[2], rescan });
        if (!rescan) {
          ordinaryActive++;
          try {
            await releaseOrdinary.promise;
          } finally {
            ordinaryActive--;
          }
        } else {
          assert.equal(ordinaryActive, 0, "full scan must wait for ordinary queries");
          const persisted = JSON.parse(await fs.readFile(path.join(stateDir, "usage-statistics.json"), "utf8"));
          const index = JSON.parse(await fs.readFile(path.join(stateDir, "codex-usage-index.json"), "utf8"));
          assert.equal(persisted.accounts[0].tokens.total, 140);
          assert.equal(Object.keys(index.entries).length, 1);
          indexCompleteBeforeRescan = true;
        }
        return successfulQuery(JSON.stringify(output));
      };
      const ordinary = refreshStats({ ...base, query });
      const queued = refreshStats({ ...base, query, rescan: true });
      const repeated = refreshStats({ ...base, query, rescan: true });
      assert.equal(queued, repeated);
      assert.notEqual(ordinary, queued);
      assert.deepEqual(
        calls.map((call) => call.rescan),
        [false],
      );
      releaseOrdinary.resolve();
      await Promise.all([ordinary, queued]);
      assert.deepEqual(
        calls.map((call) => call.rescan),
        [false, true],
      );
      assert.equal(indexCompleteBeforeRescan, true);
      assert.deepEqual(
        calls.map((call) => call.provider),
        ["claude", "claude"],
      );
    });
  },
);

// These tests use invented session counts and identifiers, never local rollout logs.
test("fork and ordinary subagent usage sum their request counts", async () => {
  await withTemp(async (root) => {
    for (const name of ["fork", "subagent"]) {
      const text = await fixture(`stats-rollout-${name}.jsonl`);
      const file = path.join(root, `rollout-synthetic-${name}.jsonl`);
      await fs.writeFile(file, text);
      const result = await readRolloutUsage(file, { headBytes: 47, tailBytes: 61 });
      assert.equal(result.forked, name === "fork");
      const requests = text
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .filter((row) => row.type === "event_msg" && row.payload.type === "token_count")
        .map((row) => row.payload.info.last_token_usage);
      const sum = (key: string) => requests.reduce((total, request) => total + (request[key] ?? 0), 0);
      assert.deepEqual(result.own, {
        input: sum("input_tokens"),
        cachedInput: sum("cached_input_tokens"),
        output: sum("output_tokens"),
        reasoning: sum("reasoning_output_tokens"),
        total: sum("total_tokens"),
        cacheWrite: sum("cache_write_input_tokens"),
      });
      assert.deepEqual(result.own, { input: 30, cachedInput: 6, output: 8, reasoning: 3, total: 38, cacheWrite: 3 });
    }
  });
});

test("forward scan finds the first usage beyond the metadata chunk", async () => {
  await withTemp(async (root) => {
    const lines = (await fixture("stats-rollout-fork.jsonl")).trimEnd().split("\n");
    lines.splice(
      2,
      0,
      '{"type":"event_msg","payload":{"type":"token_count","info":null}}',
      "{malformed synthetic line",
      ...Array(100).fill('{"type":"synthetic_padding","payload":"x"}'),
    );
    const file = path.join(root, "rollout-synthetic-deep.jsonl");
    await fs.writeFile(file, lines.join("\n") + "\n");
    const result = await readRolloutUsage(file, { headBytes: 79, tailBytes: 101 });
    assert.deepEqual(result.own, { input: 30, cachedInput: 6, output: 8, reasoning: 3, total: 38, cacheWrite: 3 });
  });
});

test("own usage clamps every component and rejects an unknown first request", async () => {
  await withTemp(async (root) => {
    const lines = (await fixture("stats-rollout-fork.jsonl")).trimEnd().split("\n");
    const last = JSON.parse(lines[3]);
    last.payload.info.total_token_usage = {
      input_tokens: 90,
      cached_input_tokens: 18,
      output_tokens: 28,
      reasoning_output_tokens: 3,
      total_tokens: 120,
      cache_write_input_tokens: 9,
    };
    lines[3] = JSON.stringify(last);
    const file = path.join(root, "rollout-synthetic-clamp.jsonl");
    await fs.writeFile(file, lines.join("\n") + "\n");
    assert.deepEqual((await readRolloutUsage(file)).own, {
      input: 0,
      cachedInput: 0,
      output: 0,
      reasoning: 0,
      total: 0,
      cacheWrite: 0,
    });
    last.payload.info.total_token_usage = {
      input_tokens: 90,
      cached_input_tokens: 26,
      output_tokens: 38,
      reasoning_output_tokens: 7,
      total_tokens: 168,
      cache_write_input_tokens: 13,
    };
    lines[3] = JSON.stringify(last);
    await fs.writeFile(file, lines.join("\n") + "\n");
    assert.deepEqual((await readRolloutUsage(file)).own, {
      input: 0,
      cachedInput: 6,
      output: 8,
      reasoning: 3,
      total: 38,
      cacheWrite: 3,
    });
    const first = JSON.parse(lines[2]);
    delete first.payload.info.last_token_usage;
    lines[2] = JSON.stringify(first);
    await fs.writeFile(file, lines.join("\n") + "\n");
    await assert.rejects(
      readRolloutUsage(file),
      (error: unknown) => error instanceof Error && !error.message.includes("synthetic-parent"),
    );
  });
});

test("version one indexes rebuild even when file metadata matches", async () => {
  await withTemp(async (root) => {
    const sessionsDir = path.join(root, "sessions");
    const stateDir = path.join(root, "state");
    await fs.mkdir(sessionsDir);
    await fs.mkdir(stateDir);
    const file = path.join(sessionsDir, "rollout-synthetic.jsonl");
    await fs.writeFile(file, await fixture("stats-rollout-fork.jsonl"));
    const stat = await fs.stat(file);
    await fs.writeFile(
      path.join(stateDir, "codex-usage-index.json"),
      JSON.stringify({
        version: 1,
        updatedAt: "",
        entries: {
          [file]: {
            size: stat.size,
            mtimeMs: stat.mtimeMs,
            accountId: null,
            startedAt: null,
            tokens: { ...tokens, total: 999999 },
          },
        },
      }),
    );
    const result = await refreshCodexIndex({ sessionsDir, stateDir });
    assert.equal(result.filesRead, 1);
    assert.equal(result.filesUnchanged, 0);
    assert.equal(result.index.version, 2);
    assert.equal(result.index.entries[file].own.total, 38);
  });
});

test("Codex aggregation counts attribution, forks, retained sessions, and exact recent dates", () => {
  const entry = (
    accountId: string | null,
    startedAt: string | null,
    total: number,
    forked = false,
    deleted = false,
  ) => ({
    size: 1,
    mtimeMs: 1,
    accountId,
    startedAt,
    forked,
    deleted,
    own: { input: total, cachedInput: 0, output: 0, total },
  });
  const index = {
    version: 2 as const,
    updatedAt: "2026-10-01T12:00:00.000Z",
    entries: {
      old: entry(null, "2026-08-01T00:00:00.000Z", 10),
      before: entry("workspace-synthetic", "2026-09-01T11:59:59.999Z", 20),
      cutoff: entry("workspace-synthetic", "2026-09-01T12:00:00.000Z", 30, true, true),
      zero: entry("workspace-synthetic", "2026-09-02T00:00:00.000Z", 0),
      future: entry(null, "2026-10-01T12:00:00.001Z", 40),
      undated: entry("workspace-synthetic", null, 50),
    },
  };
  const stats = aggregateCodexIndex(index, new Date("2026-10-01T12:00:00.000Z"));
  assert.equal(stats.tokens.total, 150);
  assert.equal(stats.sessions, 6);
  assert.equal(stats.forkedSessions, 1);
  assert.equal(stats.attributedSessions, 4);
  assert.equal(stats.firstAttributedSession, "2026-09-01T11:59:59.999Z");
  assert.equal(stats.firstSession, "2026-08-01T00:00:00.000Z");
  assert.equal(stats.lastSession, "2026-10-01T12:00:00.001Z");
  assert.equal(stats.last30DaysTokens, 30);
  assert.equal(stats.totalCost, null);
  assert.equal(stats.last30DaysCostUSD, null);
  assert.ok(stats.daily.some((day) => day.date === "2026-09-02" && day.totalTokens === 0));
  assert.equal(aggregateAccounts(index, context)[0].tokens.total, 100);
  assert.equal(lifetimeSummary([stats]).totalCost, null);
});

test("a single inherited request contributes its last usage", async () => {
  await withTemp(async (root) => {
    const lines = (await fixture("stats-rollout-fork.jsonl")).trimEnd().split("\n");
    const metadata = JSON.parse(lines[1]);
    delete metadata.payload.forked_from_id;
    metadata.payload.parent_session_id = "synthetic-parent";
    lines[1] = JSON.stringify(metadata);
    const file = path.join(root, "rollout-synthetic-single.jsonl");
    await fs.writeFile(file, lines.slice(0, 3).join("\n") + "\n");
    const result = await readRolloutUsage(file);
    assert.equal(result.forked, true);
    assert.deepEqual(result.own, { input: 10, cachedInput: 2, output: 3, reasoning: 1, total: 13, cacheWrite: 1 });
  });
});

test("index refresh failures retain cached Codex lifetime and attribution", async () => {
  await withTemp(async (root) => {
    const sessionsDir = path.join(root, "sessions");
    await fs.mkdir(sessionsDir);
    await fs.writeFile(path.join(sessionsDir, "rollout-synthetic.jsonl"), await fixture("stats-rollout-fork.jsonl"));
    const { output } = JSON.parse(await fixture("stats-cost.json"));
    const base = {
      stateDir: path.join(root, "state"),
      sessionsDir,
      accountContext: context,
      codexbarPath: "/synthetic/codexbar",
      query: async () => successfulQuery(JSON.stringify(output)),
    };
    const initial = await refreshStats(base);
    assert.equal(initial.providers.codex?.tokens.total, 38);
    await fs.rm(sessionsDir, { recursive: true });
    const failed = await refreshStats(base);
    assert.equal(failed.providers.codex?.tokens.total, 38);
    assert.equal(failed.providers.codex?.attributedSessions, 1);
    assert.equal(failed.accounts[0].tokens.total, 38);
    assert.ok(failed.errors.index);
    assert.ok(failed.errors.codex);
  });
});
