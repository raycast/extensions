/**
 * Self-check for the analytics parsing.
 *
 * Run: npx esbuild src/utils/brew/analyticsParse.check.ts --bundle --platform=node \
 *        --outfile=/tmp/analytics-check.js && node /tmp/analytics-check.js
 *
 * Half of it is fixtures, half hits the live formulae.brew.sh API — the risky
 * assumptions here are all about the *shape* of that data (comma-formatted
 * counts, per-invocation buckets, `formula` vs `cask` keys), and a fixture
 * cannot notice when the API changes them.
 */

import assert from "assert";
import { POPULARITY_PERIOD, byPopularity, packageStatus, parseRanks, totalForPeriod } from "./analyticsParse";

/// Fixtures

// Counts are bucketed by invocation, so a total sums `asc` and `asc --HEAD`.
assert.equal(totalForPeriod({ "30d": { asc: 2752, "asc --HEAD": 6 } }, "30d"), 2758);
// An unreported period is absent, not zero — the UI omits the row.
assert.equal(totalForPeriod({ "30d": { asc: 1 } }, "365d"), undefined);
assert.equal(totalForPeriod(undefined, "30d"), undefined);

// Comma-formatted counts, and both key names.
const ranks = parseRanks({
  items: [
    { formula: "openssl@3", count: "1,476,807" },
    { cask: "codex", count: "276,879" },
    { formula: "broken", count: "not-a-number" },
  ],
});
assert.equal(ranks.get("openssl@3"), 1476807);
assert.equal(ranks.get("codex"), 276879);
assert.equal(ranks.has("broken"), false, "malformed rows must be dropped, not stored as NaN");

// Ordering is by count descending. A zero count is a real value and must sort
// ABOVE an absent one, which is the case the -1 sentinel exists to separate.
const ordering = parseRanks({
  items: [
    { formula: "big", count: "1,000" },
    { formula: "small", count: "10" },
    { formula: "zero", count: "0" },
    { formula: "tie-b", count: "10" },
  ],
});
const sorted = [{ id: "unranked" }, { id: "zero" }, { id: "tie-b" }, { id: "small" }, { id: "big" }].sort(
  byPopularity(ordering),
);
assert.deepEqual(
  sorted.map((entry) => entry.id),
  // big > (small, tie-b tied at 10 -> by name) > zero > unranked
  ["big", "small", "tie-b", "zero", "unranked"],
);

// Package status. Disabled outranks deprecated because a disabled formula
// reports BOTH flags — verified against ansible@9 in the live pass below.
assert.equal(packageStatus(undefined), undefined);
assert.equal(packageStatus({ deprecated: false, disabled: false }), undefined);
assert.equal(
  packageStatus({ deprecated: true, deprecation_reason: "x", disabled: true, disable_reason: "unmaintained" })?.title,
  "Disabled",
);
assert.deepEqual(
  packageStatus({ deprecated: true, deprecation_reason: "unmaintained", deprecation_replacement_formula: "ansible" }),
  { title: "Deprecated", text: "unmaintained · use ansible" },
);
// A bare flag with no reason still says something useful.
assert.equal(packageStatus({ deprecated: true })?.text, "No longer maintained");

/// Live API — the shape assumptions above, against the real thing

async function checkLive() {
  const formula = await (await fetch("https://formulae.brew.sh/api/formula/asc.json")).json();
  const installs = formula.analytics?.install;
  assert.ok(installs, "per-formula JSON must still carry analytics.install");
  for (const period of ["30d", "90d", "365d"] as const) {
    assert.equal(typeof totalForPeriod(installs, period), "number", `missing ${period} bucket`);
  }

  const bulk = await (await fetch(`https://formulae.brew.sh/api/analytics/install/${POPULARITY_PERIOD}.json`)).json();
  const parsed = parseRanks(bulk);
  assert.ok(parsed.size > 1000, `expected thousands of ranked formulae, got ${parsed.size}`);
  // The bulk file is published in count order, so parsing then re-sorting by
  // count must reproduce the file's own order — this is the assertion that the
  // dropped `number` rank was redundant.
  const top: { id: string }[] = bulk.items.slice(0, 25).map((i: { formula: string }) => ({ id: i.formula }));
  assert.deepEqual(
    [...top].sort(byPopularity(parsed)).map((e: { id: string }) => e.id),
    top.map((e: { id: string }) => e.id),
    "sorting by count must reproduce the API's own ranking",
  );

  const casks = parseRanks(
    await (await fetch(`https://formulae.brew.sh/api/analytics/cask-install/${POPULARITY_PERIOD}.json`)).json(),
  );
  assert.ok(casks.size > 1000, `expected thousands of ranked casks, got ${casks.size}`);

  console.log(
    `ok — fixtures + live API, ranking period ${POPULARITY_PERIOD} (${parsed.size} formulae, ${casks.size} casks ranked)`,
  );
}

checkLive().catch((error) => {
  console.error(error);
  process.exit(1);
});
