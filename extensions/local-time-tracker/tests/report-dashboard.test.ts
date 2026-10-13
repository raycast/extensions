import assert from "node:assert/strict";
import test from "node:test";
import { createDashboard, dashboardSvg, getUnknownProjectIds } from "../src/lib/report-dashboard";
import { createReport } from "../src/lib/reports";
import type { Project, WorkLog } from "../src/lib/types";

const now = new Date(2026, 9, 12, 12, 0);
const at = (day: number, hour: number) => new Date(2026, 9, day, hour).toISOString();
const projects: Project[] = [
  { id: "a", name: "A & <B>", type: "work", isActive: true, createdAt: "", updatedAt: "" },
  { id: "b", name: "Other", type: "personal", isActive: true, createdAt: "", updatedAt: "" },
];
const logs: WorkLog[] = [
  { id: "1", projectId: "a", description: "", startedAt: at(11, 23), endedAt: at(12, 1), createdAt: "", updatedAt: "" },
  { id: "2", projectId: "b", description: "", startedAt: at(12, 2), endedAt: at(12, 3), createdAt: "", updatedAt: "" },
];

test("dashboard matches report totals and splits cross-midnight activity into local days", () => {
  const timer = { id: "t", projectId: "a", description: "", startedAt: at(12, 11) };
  const model = createDashboard("Overview", "today", logs, projects, timer, now);
  assert.equal(model.totalSeconds, createReport("today", logs, projects, timer, now).totalSeconds);
  assert.equal(model.totalSeconds, 10800);
  assert.equal(model.days.at(-1)?.seconds, 10800);
  assert.equal(model.days.at(-2)?.seconds, 3600);
  assert.equal(model.sessions, 3);
  assert.equal(model.running, true);
  assert.equal(model.days.length, 35);
});

test("selected project scopes totals, share, activity and running status", () => {
  const timer = { id: "t", projectId: "b", description: "", startedAt: at(12, 11) };
  const model = createDashboard("Selected", "today", logs, projects, timer, now, new Set(["a"]));
  assert.equal(model.totalSeconds, 3600);
  assert.equal(model.share, 1 / 3);
  assert.equal(model.projectCount, 1);
  assert.equal(model.sessions, 1);
  assert.equal(model.running, false);
  assert.equal(model.days.at(-1)?.seconds, 3600);
});

test("empty data and a future active timer produce finite, empty charts", () => {
  const timer = { id: "t", projectId: "a", description: "", startedAt: at(12, 13) };
  const model = createDashboard("Empty", "today", [], projects, timer, now);
  assert.equal(model.totalSeconds, 0);
  assert.equal(model.running, false);
  assert.equal(model.share, 0);
  assert.equal(model.sessions, 0);
  assert.equal(
    model.days.every((day) => day.seconds === 0),
    true,
  );
  assert.doesNotMatch(dashboardSvg(model), /NaN|Infinity/);
});

test("SVG escapes user names instead of treating them as markup", () => {
  const model = createDashboard('A & <B> "test"', "today", logs, projects, null, now);
  const svg = dashboardSvg(model);
  assert.match(svg, /A &amp; &lt;B&gt;/);
  assert.doesNotMatch(svg, /<B>/);
});

test("week and month boundaries include only the selected period and keep daily charts independent", () => {
  const boundaryLogs: WorkLog[] = [
    {
      id: "old",
      projectId: "a",
      description: "",
      startedAt: new Date(2026, 8, 30, 23).toISOString(),
      endedAt: new Date(2026, 9, 1, 1).toISOString(),
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "sun",
      projectId: "a",
      description: "",
      startedAt: at(11, 23),
      endedAt: at(12, 1),
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "future",
      projectId: "a",
      description: "",
      startedAt: at(12, 13),
      endedAt: at(12, 14),
      createdAt: "",
      updatedAt: "",
    },
  ];
  const today = createDashboard("Overview", "today", boundaryLogs, projects, null, now);
  const week = createDashboard("Overview", "week", boundaryLogs, projects, null, now);
  const month = createDashboard("Overview", "month", boundaryLogs, projects, null, now);
  assert.equal(today.totalSeconds, 3600);
  assert.equal(week.totalSeconds, 3600);
  assert.equal(month.totalSeconds, 10800);
  assert.deepEqual(today.days, week.days);
  assert.deepEqual(week.days, month.days);
  assert.equal(month.sessions, 2);
});

test("unknown projects and an empty project group retain correct totals and chart labels", () => {
  const missing = [{ ...logs[1], projectId: "missing" }];
  const all = createDashboard("Overview", "today", missing, projects, null, now);
  assert.equal(all.totalSeconds, 3600);
  assert.equal(all.distribution[0].name, "Unknown Project");
  const selected = createDashboard("Missing", "today", missing, projects, null, now, new Set(["missing"]));
  assert.equal(selected.share, 1);
  assert.match(dashboardSvg(selected), /1 session</);
  assert.match(dashboardSvg(selected), /1 project</);
  const empty = createDashboard("Empty group", "today", missing, projects, null, now, new Set());
  assert.equal(empty.totalSeconds, 0);
  assert.equal(empty.sessions, 0);
  assert.equal(
    empty.days.every((day) => day.seconds === 0),
    true,
  );
});

test("expanding project mix displays every project and moves charts below the added rows", () => {
  const model = createDashboard("Overview", "today", [], projects, null, now);
  model.distribution = Array.from({ length: 6 }, (_, index) => ({ name: `MixProject${index + 1}`, seconds: 60 }));
  model.totalSeconds = 360;
  const collapsed = dashboardSvg(model);
  assert.match(collapsed, /MixProject2/);
  assert.doesNotMatch(collapsed, /MixProject3/);
  const expanded = dashboardSvg(model, true);
  assert.match(expanded, /MixProject6/);
  assert.match(expanded, /height="427" viewBox="0 0 440 427"/);
  assert.match(expanded, /y="323"[^>]*>LAST 7 DAYS/);
  assert.match(expanded, /TRACKED TIME/);
  assert.equal(dashboardSvg(model, false), collapsed);
});

test("unknown activity includes deleted projects outside the selected summary period", () => {
  const deletedLogs: WorkLog[] = [
    { ...logs[1], projectId: "deleted-today" },
    { ...logs[1], projectId: "deleted-yesterday", startedAt: at(11, 9), endedAt: at(11, 10) },
    { ...logs[1], projectId: "a", startedAt: at(11, 9), endedAt: at(11, 10) },
  ];
  const timer = { id: "t", projectId: "deleted-running", description: "", startedAt: at(12, 11) };
  const ids = getUnknownProjectIds(deletedLogs, projects, timer);
  assert.deepEqual(ids, new Set(["deleted-today", "deleted-yesterday", "deleted-running"]));
  const today = createDashboard("Unknown Projects", "today", deletedLogs, projects, timer, now, ids);
  const month = createDashboard("Unknown Projects", "month", deletedLogs, projects, timer, now, ids);
  assert.equal(today.totalSeconds, 7200);
  assert.equal(month.totalSeconds, 10800);
  assert.equal(today.days.at(-2)?.seconds, 3600);
  assert.equal(today.days.at(-1)?.seconds, 7200);
  assert.deepEqual(today.days, month.days);
  assert.equal(today.running, true);
});

test("long Japanese names are abbreviated within title and project label widths", () => {
  const name = "日本語の長いプロジェクト名を二十五文字以上で表示します";
  const model = createDashboard(name, "today", logs, [{ ...projects[0], name }, projects[1]], null, now);
  const svg = dashboardSvg(model);
  const title = svg.match(/<text x="24" y="53"[^>]*><title>[^<]*<\/title>([^<]*)<\/text>/)?.[1];
  const label = svg.match(/<text x="40" y="193"[^>]*><title>[^<]*<\/title>([^<]*)<\/text>/)?.[1];
  assert.ok(title);
  assert.ok(label);
  assert.ok(title.endsWith("…"));
  assert.ok(label.endsWith("…"));
  assert.ok(Array.from(title).length * 20 * 1.1 <= 392);
  assert.ok(Array.from(label).length * 12 * 1.1 <= 274);
  assert.match(svg, /<title>日本語の長いプロジェクト名を二十五文字以上で表示します<\/title>/);
  assert.match(svg, /<rect x="40"[^>]*width="274"/);
  assert.match(svg, /clip-path="url\(#dashboard-text-/);
});

test("both themes keep dashboard content and readable text contrast", () => {
  const model = createDashboard("Overview", "today", logs, projects, null, now);
  const luminance = (hex: string) => {
    const rgb = hex
      .slice(1)
      .match(/../g)!
      .map((part) => {
        const channel = parseInt(part, 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const theme of ["dark", "light"] as const) {
    const svg = dashboardSvg(model, true, theme);
    assert.ok(svg.includes("PROJECT MIX"));
    assert.ok(svg.includes("35-DAY ACTIVITY"));
    const background = svg.match(/rx="18" fill="(#[0-9a-f]+)"/)![1];
    for (const match of svg.matchAll(/<text[^>]+fill="(#[0-9a-f]+)"/g)) {
      const values = [luminance(background), luminance(match[1])].sort((a, b) => a - b);
      assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 4.5, `${theme}: ${match[1]}`);
    }
  }
  assert.equal(dashboardSvg(model), dashboardSvg(model, false, "dark"));
});
