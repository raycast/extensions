const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { buildHeatmap, heatmapRange, heatmapLevel } = require("../.test-build/heatmap-data.js");
const { heatmapImage } = require("../.test-build/heatmap-chart.js");
const { imageMarkdown } = require("../.test-build/svg.js");
// Outer tile boxes: tiles are inset squares widened by a round-joined stroke of the same fill.
const tiles = (body) => [...body.matchAll(/<path d="([^"]+)" fill="([^"]+)" stroke="[^"]+" stroke-width="([\d.]+)"/g)].flatMap(([, d, fill, stroke]) =>
  [...d.matchAll(/M([\d.]+) ([\d.]+)h([\d.]+)v\3h-\3z/g)].map(([, x, y, inner]) => ({ x: +x - stroke / 2, y: +y - stroke / 2, size: +inner + +stroke, fill })));

const cost = (value = 0) => ({ totalCost: value, pricedTokens: 0, unpricedTokens: 0 });
const contribution = (date, agent, tokens, messages = 1) => ({ date, agent, tokens, messages, cost: { ...cost(tokens / 100), pricedTokens: tokens } });
const range = { from: "2026-03-01", to: "2026-03-31", title: "March" };
const report = {
  days: [
    { date: "2026-03-02", tokens: 6400, messages: 10, cost: cost(64) },
    { date: "2026-03-03", tokens: 100, messages: 1, cost: cost(1) },
  ],
  agentDays: [contribution("2026-03-02", "codex", 6300, 9), contribution("2026-03-02", "claude", 100), contribution("2026-03-03", "claude", 100)],
};

test("calendar places Mondays first, pads boundary weeks, and keeps missing days", () => {
  const map = buildHeatmap(report, range, "all", "tokens");
  assert.equal(map.cells[0].date, "2026-02-23");
  assert.equal(map.cells[0].weekday, 0);
  assert.equal(map.cells[0].inRange, false);
  assert.equal(map.cells.at(-1).date, "2026-04-05");
  assert.equal(map.cells.at(-1).inRange, false);
  assert.equal(map.cells.filter((cell) => cell.inRange).length, 31);
  assert.equal(new Set(map.cells.map((cell) => cell.date)).size, map.cells.length);
  assert.equal(map.cells.find((cell) => cell.date === "2026-03-04").value, 0);
});

test("agent filtering preserves shared scale and combines mixed-day totals", () => {
  const all = buildHeatmap(report, range, "all", "tokens");
  const claude = buildHeatmap(report, range, "claude", "tokens");
  assert.deepEqual(claude.thresholds, all.thresholds);
  assert.deepEqual(all.thresholds, [100, 400, 1600, 6400]);
  const mixed = all.cells.find((cell) => cell.date === "2026-03-02");
  assert.equal(mixed.value, 6400);
  assert.equal(mixed.dominantAgent, "codex");
  assert.equal(claude.cells.find((cell) => cell.date === mixed.date).value, 100);
  assert.equal(heatmapLevel(0, all.thresholds), 0);
  assert.equal(heatmapLevel(100, all.thresholds), 1);
  assert.equal(heatmapLevel(6400, all.thresholds), 4);
});

test("metrics use corresponding daily values", () => {
  const messages = buildHeatmap(report, range, "all", "messages");
  const costs = buildHeatmap(report, range, "claude", "costs");
  assert.equal(messages.cells.find((cell) => cell.date === "2026-03-02").value, 10);
  assert.equal(costs.cells.find((cell) => cell.date === "2026-03-02").value, 1);
});

test("unpriced usage stays visible in coverage without inventing costs", () => {
  const unknown = { date: "2026-03-04", agent: "claude", tokens: 900, messages: 1, cost: { totalCost: 0, pricedTokens: 0, unpricedTokens: 900 } };
  const data = { days: [...report.days, unknown], agentDays: [...report.agentDays, unknown] };
  const map = buildHeatmap(data, range, "all", "costs");
  const day = map.cells.find((cell) => cell.date === unknown.date);
  assert.equal(day.value, 0);
  assert.equal(day.cost.unpricedTokens, 900);
  assert.equal(day.dominantAgent, undefined);
  assert.equal(heatmapLevel(day.value, map.thresholds), 0);
  assert.equal(buildHeatmap(data, range, "codex", "costs").cells.find((cell) => cell.date === unknown.date).cost.unpricedTokens, 0);
});

test("dominant color follows the selected metric while intensity uses the daily total", () => {
  const date = "2026-03-02";
  const data = {
    days: [{ date, tokens: 100, messages: 10, cost: cost(100) }],
    agentDays: [
      { ...contribution(date, "codex", 80, 2), cost: cost(40) },
      { ...contribution(date, "claude", 20, 8), cost: cost(60) },
    ],
  };
  for (const [metric, winner, total] of [["tokens", "codex", 100], ["messages", "claude", 10], ["costs", "claude", 100]]) {
    const map = buildHeatmap(data, range, "all", metric);
    const day = map.cells.find((cell) => cell.date === date);
    assert.equal(day.dominantAgent, winner);
    assert.equal(day.value, total);
    assert.equal(heatmapLevel(day.value, map.thresholds), 4);
  }
});

test("ties have a separate color, filters select their own agent, and small majorities still win", () => {
  const date = "2026-03-02";
  const data = {
    days: [{ date, tokens: 100, messages: 2, cost: cost(1) }],
    agentDays: [contribution(date, "codex", 50), contribution(date, "claude", 50)],
  };
  const tied = buildHeatmap(data, range, "all", "tokens");
  assert.equal(tied.cells.find((cell) => cell.date === date).dominantAgent, "tie");
  const image = heatmapImage(tied, true, String);
  assert.ok(image.body.includes("Equal share"));
  const tieColor = image.body.match(/<circle[^>]*fill="([^"]+)"\/><text[^>]*>Equal share<\/text>/)[1];
  assert.ok(tiles(image.body).some((tile) => tile.fill === tieColor));
  for (const agent of ["codex", "claude"]) {
    const filtered = buildHeatmap(data, range, agent, "tokens");
    assert.equal(filtered.cells.find((cell) => cell.date === date).dominantAgent, agent);
    assert.deepEqual(filtered.thresholds, tied.thresholds);
    assert.ok(!heatmapImage(filtered, true, String).body.includes("Equal share"));
  }
  data.agentDays = [contribution(date, "claude", 49), contribution(date, "codex", 51)];
  assert.equal(buildHeatmap(data, range, "all", "tokens").cells.find((cell) => cell.date === date).dominantAgent, "codex");
});

test("window navigation handles current partial months and past year boundaries", () => {
  const now = new Date(2026, 9, 5, 12);
  assert.deepEqual(heatmapRange("sixMonths", 0, now), { from: "2026-05-01", to: "2026-10-05", title: "6 Months of Activity" });
  assert.deepEqual(heatmapRange("sixMonths", -1, now), { from: "2025-11-01", to: "2026-04-30", title: "6 Months of Activity" });
  assert.deepEqual(heatmapRange("year", 0, now), { from: "2026-01-01", to: "2026-12-31", title: "2026 Activity" });
  assert.deepEqual(heatmapRange("year", -1, now), { from: "2025-01-01", to: "2025-12-31", title: "2025 Activity" });
  const january = new Date(2027, 0, 2, 12);
  assert.deepEqual(heatmapRange("year", 0, january), { from: "2027-01-01", to: "2027-12-31", title: "2027 Activity" });
  const currentYear = buildHeatmap({ days: [], agentDays: [] }, heatmapRange("year", 0, now), "all", "tokens");
  assert.equal(currentYear.cells.filter((cell) => cell.inRange).length, 365);
  assert.ok(currentYear.cells.some((cell) => cell.inRange && cell.date === "2026-12-31" && cell.value === 0));
  const svg = heatmapImage(currentYear, true, String).body;
  assert.equal(tiles(svg).length, 365);
  // Raycast's UI time grows with markdown size; the previous ~100 KB year image timed out.
  assert.ok(svg.length < 15000, `year SVG is ${svg.length} bytes`);
  assert.ok(svg.includes(">Nov</text>"));
  assert.ok(svg.includes(">Dec</text>"));
  const leapYear = heatmapRange("year", -2, now);
  const days = buildHeatmap({ days: [], agentDays: [] }, leapYear, "all", "tokens").cells.filter((cell) => cell.inRange);
  assert.equal(days.length, 366);
  assert.ok(days.some((cell) => cell.date === "2024-02-29"));
});

test("empty periods have no intensity and do not invent activity", () => {
  const map = buildHeatmap({ days: [], agentDays: [] }, range, "all", "tokens");
  assert.deepEqual(map.thresholds, [0, 0, 0, 0]);
  assert.ok(map.cells.every((cell) => cell.value === 0 && cell.dominantAgent === undefined));
});

test("SVG labels both axes and renders single-color cells without split geometry", () => {
  const map = buildHeatmap(report, range, "all", "tokens");
  const image = heatmapImage(map, true, (value) => String(value));
  assert.equal(image.width, 560);
  for (const label of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mar", "Codex", "Claude"]) assert.ok(image.body.includes(label));
  assert.ok(!image.body.includes("<clipPath"));
  assert.ok(image.body.includes('fill="#228cf6"'));
  assert.ok(image.body.includes('fill="#D97757"'));
  const days = tiles(image.body);
  assert.equal(days.length, 31);
  assert.equal(days.find((tile) => tile.fill === "#228cf6")?.size, 17);
  // Opacity makes renderers composite per tile; fills are pre-blended over the track instead.
  assert.ok(!/[\s"]opacity=/.test(image.body));
  assert.ok(!image.body.includes("NaN"));
  assert.ok(!image.body.includes("Infinity"));
  assert.match(imageMarkdown("Heatmap", image), /data:image\/svg\+xml;base64/);
  const svg = Buffer.from(imageMarkdown("Heatmap", image).split("base64,")[1].split("?")[0], "base64").toString();
  assert.ok(svg.includes('width="560"'));
});

test("calendar arithmetic stays complete across DST in multiple local time zones", () => {
  for (const timezone of ["Europe/Vienna", "America/Los_Angeles", "Pacific/Auckland"]) {
    const script = `const {buildHeatmap}=require(${JSON.stringify(require.resolve("../.test-build/heatmap-data.js"))}); const map=buildHeatmap({days:[],agentDays:[]},${JSON.stringify(range)},'all','tokens'); console.log(JSON.stringify(map.cells.filter(c=>c.inRange).map(c=>c.date)))`;
    const result = spawnSync(process.execPath, ["-e", script], { env: { ...process.env, TZ: timezone }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const dates = JSON.parse(result.stdout);
    assert.equal(dates.length, 31, timezone);
    assert.equal(new Set(dates).size, 31, timezone);
    assert.equal(dates[0], range.from);
    assert.equal(dates.at(-1), range.to);
  }
});
