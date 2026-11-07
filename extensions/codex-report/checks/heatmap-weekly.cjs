const assert = require("node:assert/strict");
const test = require("node:test");
const { buildHeatmap, heatmapRange } = require("../.test-build/heatmap-data.js");
const { buildWeeklyHeatmap, weeklyHeight, weeklyBlocks } = require("../.test-build/heatmap-weekly.js");
const { heatmapImage } = require("../.test-build/heatmap-chart.js");
const entry = (date, agent, tokens, messages, dollars = tokens / 100) => ({
  date, agent, tokens, messages, cost: { totalCost: dollars, pricedTokens: tokens, unpricedTokens: 0 },
});
const range = { from: "2026-03-03", to: "2026-03-10", title: "Test" };
const entries = [
  entry("2026-03-02", "codex", 99999, 99),
  entry("2026-03-03", "codex", 20, 10, 4),
  entry("2026-03-04", "codex", 20, 10, 4),
  entry("2026-03-05", "claude", 60, 1, 1),
  entry("2026-03-09", "claude", 30, 3, 3),
  entry("2026-03-11", "codex", 99999, 99),
];
const report = { agentDays: entries, days: entries }; // One contribution per date.
const weekly = (agent = "all", metric = "tokens", data = report, window = range) =>
  buildWeeklyHeatmap(buildHeatmap(data, window, agent, metric));

// Outer tile boxes: tiles are inset squares widened by a round-joined stroke of the same fill.
const tiles = (body) => [...body.matchAll(/<path d="([^"]+)" fill="([^"]+)" stroke="[^"]+" stroke-width="([\d.]+)"/g)].flatMap(([, d, fill, stroke]) =>
  [...d.matchAll(/M([\d.]+) ([\d.]+)h([\d.]+)v\3h-\3z/g)].map(([, x, y, inner]) => ({ x: +x - stroke / 2, y: +y - stroke / 2, size: +inner + +stroke, fill })));

test("weekly sums clip boundaries and aggregate each agent across days", () => {
  const result = weekly();
  assert.equal(result.peak, 100);
  assert.deepEqual(result.weeks.map(w => [w.date, w.endDate, w.value]), [
    ["2026-03-03", "2026-03-08", 100], ["2026-03-09", "2026-03-10", 30],
  ]);
  assert.deepEqual(result.weeks[0].contributions.map(e => [e.agent, e.tokens, e.messages]), [["codex", 40, 20], ["claude", 60, 1]]);
  assert.equal(result.weeks.reduce((sum, w) => sum + w.value, 0), 130);
});

test("weekly metrics and agent filters retain the combined peak", () => {
  for (const [metric, value] of [["tokens", 100], ["messages", 21], ["costs", 9]]) {
    const all = weekly("all", metric);
    assert.equal(all.weeks[0].value, value);
    assert.equal(weekly("codex", metric).peak, all.peak);
    assert.equal(weekly("claude", metric).peak, all.peak);
  }
  const codex = weekly("codex");
  assert.equal(codex.weeks[0].value, 40);
  assert.equal(codex.weeks[0].cost.totalCost, 8);
  assert.deepEqual(weeklyBlocks(codex.weeks[1], codex.peak, "codex", "tokens"), []);
  assert.equal(weeklyHeight(codex.weeks[0].value, codex.peak), 5);
});

test("weekly blocks round up positive usage and preserve empty future weeks", () => {
  assert.deepEqual([0, 1, 14, 15, 50, 100].map(v => weeklyHeight(v, 100)), [0, 1, 3, 3, 5, 7]);
  assert.equal(weeklyHeight(0, 0), 0);
  const year = heatmapRange("year", 0, new Date(2026, 9, 6, 12));
  const result = weekly("all", "tokens", report, year);
  assert.equal(result.weeks.length, 53);
  assert.equal(result.weeks[0].date, "2026-01-01");
  assert.equal(result.weeks.at(-1).endDate, "2026-12-31");
  assert.equal(result.weeks.at(-1).value, 0);
});

test("weekly cost coverage and equal shares remain available", () => {
  const unknown = entry("2026-03-06", "claude", 0, 0, 0);
  unknown.cost.unpricedTokens = 900;
  const data = { days: [...entries, unknown], agentDays: [...entries, unknown] };
  assert.equal(weekly("all", "costs", data).weeks[0].cost.unpricedTokens, 900);
  assert.equal(weekly("codex", "costs", data).weeks[0].cost.unpricedTokens, 0);
  const tied = [entry("2026-03-03", "codex", 50, 1), entry("2026-03-04", "claude", 50, 1)];
  const result = weekly("all", "tokens", { days: tied, agentDays: tied });
  assert.deepEqual(weeklyBlocks(result.weeks[0], result.peak, "all", "tokens"), ["codex", "codex", "codex", "codex", "claude", "claude", "claude"]);
});

test("weekly SVG stacks solid blocks from the bottom and labels its volume scale", () => {
  const image = heatmapImage(buildHeatmap(report, range, "all", "tokens"), true, String, "weekly");
  assert.ok(image.body.includes("Activity · Tokens · Weekly"));
  assert.ok(image.body.includes("Square-root scale"));
  assert.ok(!image.body.includes(">Mon</text>"));
  assert.equal(tiles(image.body).filter((tile) => tile.fill !== "#303030").length, 11);
  assert.ok(tiles(image.body).some((tile) => tile.y === 117 && tile.size === 17 && tile.fill === "#D97757"));
  const empty = buildHeatmap({ days: [], agentDays: [] }, range, "all", "costs");
  assert.ok(heatmapImage(empty, true, String, "weekly").body.includes("No priced costs"));
});


test("weekly shares form contiguous Codex then Claude segments using the selected metric", () => {
  for (const [metric, codexCount] of [["tokens", 3], ["messages", 7], ["costs", 6]]) {
    const result = weekly("all", metric);
    const blocks = weeklyBlocks(result.weeks[0], result.peak, "all", metric);
    assert.deepEqual(blocks, [...Array(codexCount).fill("codex"), ...Array(7 - codexCount).fill("claude")]);
    for (const agent of ["codex", "claude"]) {
      const filtered = weekly(agent, metric);
      const selected = weeklyBlocks(filtered.weeks[0], filtered.peak, agent, metric);
      assert.ok(selected.every(value => value === agent));
      assert.equal(selected.length, weeklyHeight(filtered.weeks[0].value, result.peak));
    }
  }
  const small = [entry("2026-03-03", "codex", 99, 1), entry("2026-03-04", "claude", 1, 1)];
  const result = weekly("all", "tokens", { days: small, agentDays: small });
  assert.deepEqual(weeklyBlocks(result.weeks[0], result.peak, "all", "tokens"), Array(7).fill("codex"));
  const svg = heatmapImage(buildHeatmap(report, range, "all", "tokens"), true, String, "weekly").body;
  assert.ok(tiles(svg).some((tile) => tile.y === 138 && tile.size === 17 && tile.fill === "#228cf6"));
  assert.ok(tiles(svg).some((tile) => tile.y === 117 && tile.size === 17 && tile.fill === "#D97757"));
  assert.ok(svg.includes("≤ 100</text>"));
  assert.ok(!svg.includes("100%"));
  assert.ok(!svg.includes("Equal share"));
});


test("currency axis labels fit the margin and year grids stay inside the image", () => {
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  const costs = [entry("2026-03-03", "codex", 100, 1, 1000000)];
  for (const period of ["sixMonths", "year"]) {
    const window = heatmapRange(period, 0, new Date(2026, 2, 10, 12));
    const map = buildHeatmap({ days: costs, agentDays: costs }, window, "all", "costs");
    for (const view of ["daily", "weekly"]) {
      const image = heatmapImage(map, true, money, view);
      const grid = tiles(image.body);
      assert.ok(grid.length > 0);
      // Coordinates are rounded to 0.1 px to keep the markdown small.
      for (const tile of grid) assert.ok(tile.x + tile.size <= image.width + 0.1);
      if (view === "weekly") {
        const axis = [...image.body.matchAll(/<text x="([\d.]+)"[^>]*text-anchor="end"[^>]*font-size="([\d.]+)">([^<]+)<\/text>/g)];
        assert.equal(axis.length, 3);
        assert.equal(axis[0][3], "≤ $1,000,000.00");
        // System font measurement: this label is 65 points wide at size 8.
        assert.ok(Number(axis[0][1]) >= 65 * Number(axis[0][2]) / 8);
        assert.ok(Number(axis[0][1]) < Math.min(...grid.map((tile) => tile.x)));
      }
    }
  }
});
