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
import { compareVersions, isOutdatedVersion } from "./version";
import {
  AnalyticsCounts,
  POPULARITY_PERIOD,
  analyticsRows,
  byPopularity,
  packageStatus,
  parseRanks,
  totalForPeriod,
} from "./analyticsParse";

/// Fixtures

// Counts are bucketed by invocation, so a total sums `asc` and `asc --HEAD`.
assert.equal(totalForPeriod({ "30d": { asc: 2752, "asc --HEAD": 6 } }, "30d"), 2758);
// An unreported period is absent, not zero. The UI reserves the row and shows
// an em dash rather than omitting it — see analyticsRows.
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

/**
 * Prove the API's `number` rank is redundant with the count, which is what
 * makes dropping it safe.
 *
 * Comparing positions one-by-one does NOT work: the file has ~21k adjacent
 * ties, the API breaks them arbitrarily and this code breaks them by name, so a
 * tie legitimately displaces every position after it. (That is exactly how the
 * first version of this assertion failed — on `imath` vs `aws-c-cal`, both at
 * 23,779.)
 *
 * The tie-independent form of the claim is monotonicity: the published file is
 * non-increasing by count, and so is our re-sort of it. Two orders that are
 * both non-increasing over the same counts differ only within ties.
 */
function assertReproducesFileOrder(
  items: { formula?: string; cask?: string; count: string }[],
  ranks: Map<string, number>,
  label: string,
): void {
  const countOf = (entry: { id: string }) => ranks.get(entry.id);
  const ids: { id: string }[] = items.map((i) => ({ id: (i.formula ?? i.cask) as string }));

  // Drop the unparseable rows FIRST rather than skipping over them in the
  // comparison. Skipping hides an inversion that straddles a dropped row:
  // [100, malformed, 200] would skip both adjacent pairs and pass.
  const retained = ids.filter((entry) => countOf(entry) !== undefined);

  const nonIncreasing = (sequence: { id: string }[], what: string) => {
    for (let i = 0; i < sequence.length - 1; i++) {
      const a = countOf(sequence[i]) as number;
      const b = countOf(sequence[i + 1]) as number;
      assert.ok(
        a >= b,
        `${label}: ${what} is not ordered by count — ${sequence[i].id} (${a}) before ${sequence[i + 1].id} (${b})`,
      );
    }
  };

  assert.ok(retained.length > 1000, `${label}: only ${retained.length} parsed rows — assertion is too weak`);
  // The published file being non-increasing is the real claim — it is what
  // makes `number` redundant. Re-sorting it is the weaker half by construction,
  // but it catches a comparator that disagrees with its own key.
  nonIncreasing(retained, "the published file");
  nonIncreasing([...retained].sort(byPopularity(ranks)), "our re-sort");
}

// Statistics rows are reserved before the fetch lands, so the panel does not
// reflow underneath the user when it does. Same row count, same titles, either
// way — only the values change.
const pending = analyticsRows(undefined);
const loaded = analyticsRows({ analytics: { install: { "30d": { asc: 1 }, "90d": { asc: 2 }, "365d": { asc: 3 } } } });
assert.equal(pending.length, 3, "install rows must be reserved while loading");
assert.deepEqual(
  pending.map((r) => r.title),
  loaded.map((r) => r.title),
);
assert.deepEqual(
  pending.map((r) => r.text),
  ["—", "—", "—"],
);
assert.deepEqual(
  loaded.map((r) => r.text),
  ["1", "2", "3"],
);
// Build errors stay conditional — a permanent "0" row would be noise.
assert.equal(analyticsRows({ analytics: { install: {}, build_error: { "30d": { asc: 7 } } } }).length, 4);
assert.equal(analyticsRows({ analytics: { install: {}, build_error: { "30d": {} } } }).length, 3);

// A failed fetch must not read as "this package has no installs". The flag is
// what the renderers hang Icon.QuestionMarkCircle off, so assert it too.
assert.deepEqual(
  analyticsRows(undefined, true).map((r) => r.text),
  ["Unavailable", "Unavailable", "Unavailable"],
);
assert.deepEqual(
  analyticsRows(undefined, true).map((r) => r.unavailable),
  [true, true, true],
);
// Loading and no-data stay unmarked — no question mark on either.
assert.deepEqual(
  analyticsRows(undefined).map((r) => r.unavailable),
  [false, false, false],
);
assert.equal(
  analyticsRows({ analytics: { install: { "30d": { asc: 5 } } } }, true).find((r) => r.key === "30d")?.unavailable,
  undefined,
  "a period that DID load must not be marked unavailable",
);

// The bucket is untyped JSON at runtime: string values must not concatenate.
assert.equal(totalForPeriod({ "30d": { asc: "1" } } as unknown as AnalyticsCounts, "30d"), undefined);
assert.equal(totalForPeriod({ "30d": { a: 1, b: "x" } } as unknown as AnalyticsCounts, "30d"), 1);
assert.equal(totalForPeriod({ "30d": {} }, "30d"), undefined);

// Version comparison. Every case below is one an adversarial review raised
// against an earlier attempt — first string INEQUALITY (which called any
// difference "outdated", in both directions), then a hand-rolled segment
// ranker (which mis-ordered prereleases, patch levels, case variants and
// trailing zeros). The module now compares ONLY plain dotted numbers and
// returns undefined for everything else.
assert.equal(isOutdatedVersion("2.3.2", "2.4.0", { stripRevision: true }), true, "ipatool: genuinely behind");
assert.equal(isOutdatedVersion("2.4.0", "2.4.0", { stripRevision: true }), false);
assert.equal(
  isOutdatedVersion("1.23.1_1", "1.23.2", { stripRevision: true }),
  true,
  "libheif: behind, with a revision",
);
assert.equal(isOutdatedVersion("1.2.3_1", "1.2.3", { stripRevision: true }), false, "a rebuild is not an upgrade");
assert.equal(isOutdatedVersion(undefined, "1.0"), false, "not installed is not outdated");
assert.equal(isOutdatedVersion("1.0", undefined), false);

// Installed NEWER than the index must never offer an upgrade — that downgrades.
assert.equal(isOutdatedVersion("2.0", "1.0", { stripRevision: true }), false, "newer installed is not outdated");
assert.equal(isOutdatedVersion("1.10", "1.9", { stripRevision: true }), false, "numeric, not lexical: 10 > 9");
assert.equal(isOutdatedVersion("1.9", "1.10", { stripRevision: true }), true);
assert.equal(isOutdatedVersion("1.2", "1.2.1", { stripRevision: true }), true, "a shorter prefix is older");
assert.equal(isOutdatedVersion("1.2.1", "1.2", { stripRevision: true }), false);

// Trailing zeros are the SAME version, not a shorter, older one.
assert.equal(compareVersions("5", "5.0"), 0, "5 and 5.0 are equal");
assert.equal(compareVersions("5.0.0", "5"), 0);
assert.equal(isOutdatedVersion("5", "5.0"), false, "5 must not read as behind 5.0");

// Shapes this module refuses to rank. Each was mis-ordered by the previous
// attempt; undefined means "ask brew", which is the correct answer here.
for (const [a, b, why] of [
  ["1.0b2", "1.0", "beta vs final"],
  ["1.0", "1.0b2", "final vs beta"],
  ["1.0-rc1", "1.0-p1", "release candidate vs patch level"],
  ["1.0RC1", "1.0rc1", "case variants"],
  ["2024-01-15", "2024-02-01", "date versions"],
  ["1.2.3", "latest", "cask `latest`"],
  ["1.2.3", "HEAD", "HEAD"],
  ["1_2", "1_2", "underscores are ordinary cask syntax"],
] as const) {
  if (a !== b) {
    assert.equal(compareVersions(a, b), undefined, `must refuse to rank: ${why}`);
    assert.equal(isOutdatedVersion(a, b), false, `must not report outdated: ${why}`);
  }
}

/// Live API — the shape assumptions above, against the real thing/// Live API — the shape assumptions above, against the real thing

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
  // The bulk files are published in count order, so parsing and re-sorting by
  // count must reproduce each file's own order. This is THE assertion that the
  // dropped `number` rank was redundant, so it runs over the whole file and
  // over both categories — the drop logic is shared by formulae and casks.
  //
  // Equal counts are the one legitimate difference: the API breaks those ties
  // arbitrarily and we break them by name, so a pair is only a failure when the
  // counts actually differ.
  assertReproducesFileOrder(bulk.items, parsed, "formulae");

  const caskBulk = await (
    await fetch(`https://formulae.brew.sh/api/analytics/cask-install/${POPULARITY_PERIOD}.json`)
  ).json();
  const casks = parseRanks(caskBulk);
  assert.ok(casks.size > 1000, `expected thousands of ranked casks, got ${casks.size}`);
  assertReproducesFileOrder(caskBulk.items, casks, "casks");

  console.log(
    `ok — fixtures + live API, ranking period ${POPULARITY_PERIOD} (${parsed.size} formulae, ${casks.size} casks ranked)`,
  );
}

checkLive().catch((error) => {
  console.error(error);
  process.exit(1);
});
