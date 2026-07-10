import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = await mkdtemp(join(tmpdir(), "codex-stale-repro-"));
const sessionDir = join(root, "sessions", "2026", "07", "06");
await mkdir(sessionDir, { recursive: true });
await writeFile(
  join(root, "auth.json"),
  JSON.stringify({ tokens: { access_token: "fixture-token", account_id: "fixture-account" } }),
);
await writeFile(
  join(sessionDir, "rollout-fixture.jsonl"),
  JSON.stringify({
    timestamp: "2026-07-06T12:00:00.000Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      info: { total_token_usage: { total_tokens: 332700 } },
      rate_limits: {
        primary: { used_percent: 40, resets_at: 1783368000 },
        secondary: { used_percent: 25, resets_at: 1783368000 },
        plan_type: "plus",
      },
    },
  }),
);

const bundle = join(root, "codex.mjs");
await build({
  entryPoints: [resolve("src/lib/codex.ts")],
  outfile: bundle,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
});

let requests = 0;
let requestInit;
globalThis.fetch = async (_url, init) => {
  requests += 1;
  requestInit = init;
  return new Response(
    JSON.stringify({
      plan_type: "plus",
      rate_limit: {
        primary_window: { used_percent: 12, reset_at: 1783728000 },
        secondary_window: { used_percent: 34, reset_at: 1784246400 },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};

const { readCodexQuota } = await import(`${pathToFileURL(bundle).href}?v=${Date.now()}`);
const quota = await readCodexQuota(root);

assert.equal(requests, 1, "a logged-in user should receive one live quota request");
assert.equal(requestInit.headers.Authorization, "Bearer fixture-token");
assert.equal(requestInit.headers["ChatGPT-Account-Id"], "fixture-account");
assert.equal(quota.source, "live", "the stale snapshot should be replaced with live quota");
assert.deepEqual(
  quota.windows.map(({ name, usedPercent }) => ({ name, usedPercent })),
  [
    { name: "5-Hour", usedPercent: 12 },
    { name: "Weekly", usedPercent: 34 },
  ],
);

globalThis.fetch = async () => new Response("upstream failure", { status: 500 });
const fallback = await readCodexQuota(root);
assert.equal(fallback.source, "snapshot", "a failed live request should preserve the offline fallback");
assert.equal(fallback.totalTokens, 332700);
console.log("PASS: stale snapshot was replaced with live Codex quota");
