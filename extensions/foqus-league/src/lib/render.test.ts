import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { renderBoard } from "./statsBoard.ts";
import { CHART_WIDTH } from "./svg.ts";
import { dark, light, tiersFor, type Theme } from "./theme.ts";
import type { DayCell, Stats } from "./types.ts";
import { formatDay } from "./format.ts";
import { periodRange } from "./stats.ts";
import { renderWrapped, wrappedFacts, type WrappedFacts } from "./wrappedPoster.ts";

const LADDER = tiersFor([600, 1200, 2400]);

function assertWellFormed(markup: string, width: number) {
  assert.ok(markup.startsWith("<svg "), "does not open with an <svg element");
  assert.ok(markup.trimEnd().endsWith("</svg>"), "does not close its <svg element");
  assert.match(markup, new RegExp(`^<svg [^>]*\\bwidth="${width}"`), `width is not ${width}`);
  assert.doesNotMatch(markup, /undefined|NaN|\[object Object\]/);

  const open: string[] = [];
  const tag = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  for (const [, closing, name, , selfClosing] of markup.matchAll(tag)) {
    if (closing) assert.equal(open.pop(), name, `</${name}> does not close the open element`);
    else if (!selfClosing) open.push(name);
  }
  assert.deepEqual(open, [], `unclosed elements: ${open.join(", ")}`);
}

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function days(minutes: number[], from = "2026-01-05"): DayCell[] {
  const start = new Date(`${from}T00:00:00`);
  return minutes.map((m, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return {
      date: isoDay(d),
      minutes: m,
      sessions: m ? 1 : 0,
      level: (m === 0 ? 0 : Math.min(4, Math.ceil(m / 60))) as DayCell["level"],
      shielded: m === 0 && i % 3 === 0,
    };
  });
}

function statsOf(over: Partial<Stats> = {}): Stats {
  const cells = over.days ?? days([0, 30, 90, 0, 240, 61, 0, 45, 120, 0, 15, 300, 60, 0, 90, 90, 0, 0, 30, 480, 120]);
  const base: Stats = {
    totalMinutes: cells.reduce((a, d) => a + d.minutes, 0),
    totalSessions: cells.filter((d) => d.minutes).length,
    firstSessionAt: Date.parse("2026-01-05T09:00:00Z"),
    todayMinutes: cells[cells.length - 1]?.minutes ?? 0,
    weekMinutes: 700,
    lastWeekMinutes: 250,
    currentStreak: 3,
    shieldsLeft: 1,
    bestStreak: 9,
    bestStreakStart: Date.parse("2026-01-10T00:00:00Z"),
    bestStreakEnd: Date.parse("2026-01-18T00:00:00Z"),
    goals: [{ name: "Deep work", minutes: 900, sessions: 12 }],
    days: cells,
    activeDays: cells.filter((d) => d.minutes).length,
    longestSession: { start: Date.parse("2026-01-09T09:00:00Z"), goal: "Deep work", duration: 240, source: "reported" },
    bestDay: { date: "2026-01-24", minutes: 480 },
  };
  return { ...base, ...over };
}

function factsOf(over: Partial<WrappedFacts> = {}): WrappedFacts {
  return {
    periodLabel: "All Time",
    totalMinutes: 8_600,
    totalSessions: 214,
    activeDays: 97,
    goals: [
      { name: "Deep work", minutes: 4_200 },
      { name: "Writing & editing", minutes: 2_900 },
      { name: "Admin", minutes: 1_500 },
      { name: "Never drawn", minutes: 10 },
    ],
    weeks: Array.from({ length: 9 }, (_, i) => ({
      start: `2026-0${i < 4 ? 1 : 2}-${String(5 + (i % 4) * 7).padStart(2, "0")}`,
      minutes: i * 350,
    })),
    weeklyAverage: 1_400,
    longestSession: 240,
    longestSessionWhen: "Jan 9",
    bestDay: 480,
    bestDayWhen: "Jan 24",
    bestStreak: 9,
    bestStreakWhen: "Jan 10 – Jan 18",
    ...over,
  };
}

for (const theme of [light, dark] as Theme[]) {
  test(`renderBoard draws well-formed SVG in ${theme.name}`, () => {
    assertWellFormed(renderBoard(statsOf(), theme, 60, LADDER), CHART_WIDTH);
  });

  test(`renderWrapped draws well-formed SVG in ${theme.name}`, () => {
    assertWellFormed(renderWrapped(factsOf(), theme, LADDER), CHART_WIDTH);
  });
}

test("renderBoard honours the width it is given", () => {
  assertWellFormed(renderBoard(statsOf(), light, 60, LADDER, 480), 480);
  assertWellFormed(renderBoard(statsOf(), light, 60, LADDER, 1200), 1200);
});

test("renderBoard draws a first run with no days at all", () => {
  const empty = statsOf({
    days: [],
    totalMinutes: 0,
    totalSessions: 0,
    firstSessionAt: null,
    todayMinutes: 0,
    weekMinutes: 0,
    lastWeekMinutes: 0,
    currentStreak: 0,
    bestStreak: 0,
    bestStreakEnd: null,
    goals: [],
    activeDays: 0,
    longestSession: null,
    bestDay: null,
  });
  assertWellFormed(renderBoard(empty, dark, 60, LADDER), CHART_WIDTH);
});

test("renderBoard draws a 26-week calendar without labels overflowing", () => {
  const long = statsOf({ days: days(Array.from({ length: 182 }, (_, i) => (i % 3 === 0 ? 0 : 30 + i))) });
  assertWellFormed(renderBoard(long, light, 60, LADDER), CHART_WIDTH);
});

test("renderBoard names the tier the week has reached", () => {
  const bronze = renderBoard(statsOf({ weekMinutes: 10 }), light, 60, LADDER);
  assert.ok(bronze.includes("Bronze league"));
  assert.ok(bronze.includes("Reach 🥈 Silver"));
  const diamond = renderBoard(statsOf({ weekMinutes: 5_000 }), light, 60, LADDER);
  assert.ok(diamond.includes("Diamond league"));
  assert.ok(diamond.includes("Top league"));
});

test("renderWrapped escapes goal names rather than breaking the markup", () => {
  const out = renderWrapped(factsOf({ goals: [{ name: "R&D <ops>", minutes: 100 }] }), light, LADDER);
  assertWellFormed(out, CHART_WIDTH);
  assert.ok(out.includes("R&amp;D &lt;ops&gt;"));
});

test("renderWrapped draws a period with no sessions at all", () => {
  const blank = factsOf({
    totalMinutes: 0,
    totalSessions: 0,
    activeDays: 0,
    goals: [{ name: "No goal", minutes: 0 }],
    weeks: [],
    weeklyAverage: 0,
    longestSession: 0,
    longestSessionWhen: "—",
    bestDay: 0,
    bestDayWhen: "—",
    bestStreak: 0,
    bestStreakWhen: "—",
  });
  assertWellFormed(renderWrapped(blank, dark, LADDER), CHART_WIDTH);
});

test("the tier ladder holds its shape however many weeks the period covers", () => {
  const weeksOf = (n: number) =>
    factsOf({
      weeks: Array.from({ length: n }, (_, i) => ({ start: "2026-01-05", minutes: i % 4 === 0 ? 0 : i * 80 })),
    });

  for (const n of [1, 9, 40, 200]) assertWellFormed(renderWrapped(weeksOf(n), light, LADDER), CHART_WIDTH);
});

test("the hero's last goal bar and the ladder's last row end on the same line", () => {
  const poster = renderWrapped(
    factsOf({
      weeks: [
        { start: "2026-01-05", minutes: 300 },
        { start: "2026-01-12", minutes: 900 },
        { start: "2026-01-19", minutes: 1_500 },
        { start: "2026-01-26", minutes: 3_000 },
      ],
    }),
    dark,
    LADDER,
  );

  const bottoms = [...poster.matchAll(/<rect x="\d+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/g)]
    .map(([, y, h]) => Number(y) + Number(h))
    .sort((a, b) => a - b);
  const last = bottoms[bottoms.length - 1];

  assert.equal(bottoms.filter((b) => b === last).length >= 2, true, `nothing shares the bottom edge ${last}`);
});

test("the ladder counts the weeks each tier held, and names only the tiers reached", () => {
  const poster = renderWrapped(
    factsOf({
      weeks: [
        ...Array.from({ length: 5 }, () => ({ start: "2026-01-05", minutes: 300 })),
        ...Array.from({ length: 2 }, () => ({ start: "2026-01-12", minutes: 900 })),
        { start: "2026-01-19", minutes: 0 },
      ],
    }),
    dark,
    LADDER,
  );

  assert.match(poster, />Bronze</);
  assert.match(poster, />Silver</);
  assert.doesNotMatch(poster, />Gold</, "a tier never reached is left off the ladder");
  assert.match(poster, />5</);
  assert.match(poster, />2</);
});

test("renderWrapped sets the headline league from the weekly average", () => {
  assert.ok(renderWrapped(factsOf({ weeklyAverage: 0 }), light, LADDER).includes("🥉 Bronze"));
  assert.ok(renderWrapped(factsOf({ weeklyAverage: 2_400 }), light, LADDER).includes("💎 Diamond"));
});

const skeleton = (markup: string) => markup.replace(/>([^<>]+)</g, (whole, body) => (body.trim() ? ">·<" : whole));

const digest = (markup: string) => createHash("sha256").update(skeleton(markup)).digest("hex").slice(0, 16);

const GOLDEN_BOARD = (theme: Theme) => renderBoard(statsOf(), theme, 60, LADDER);

test("skeleton drops text content and keeps every attribute", () => {
  assert.equal(skeleton('<text x="1" y="2">Jan</text>'), '<text x="1" y="2">·</text>');
  assert.equal(skeleton("<g>\n  <rect />\n</g>"), "<g>\n  <rect />\n</g>");
});

test("both charts render the geometry they were calibrated at", () => {
  assert.deepEqual(
    {
      boardLight: digest(GOLDEN_BOARD(light)),
      boardDark: digest(GOLDEN_BOARD(dark)),
      wrappedLight: digest(renderWrapped(factsOf(), light, LADDER)),
      wrappedDark: digest(renderWrapped(factsOf(), dark, LADDER)),
    },
    {
      boardLight: "6663cb1eb5b05a3d",
      boardDark: "17b472f42c2fe366",
      wrappedLight: "8bd5a35ce1eaa521",
      wrappedDark: "397502ef7e063fc5",
    },
  );
});

test("a finished quest closes with its tick, centred on its sub-line", () => {
  const done = renderBoard(statsOf({ weekMinutes: 5_000 }), light, 60, LADDER);
  assert.match(done, /<path d="M209,85\.12 l3,3 l5,-6"/, "the tick closes the row on the meter's far end");
  assert.match(done, /<text x="202" y="89" font-size="11"[^>]*text-anchor="end"/, "the sub-line ends before it");
  assert.match(done, /<text x="2" y="90" font-size="13" font-weight="600"/, "the quest title left the baseline");
  assert.match(done, /<rect x="2" y="98" width="[\d.]+" height="6" rx="3"/, "the quest meter left baseline + 8");
});

test("the momentum band holds its grid", () => {
  const board = GOLDEN_BOARD(light);
  assert.match(board, /<text x="2" y="10" font-size="10" font-weight="600"/);
  assert.match(board, /<text x="2" y="42" font-size="30" font-weight="700"/);
  assert.match(board, /<text x="2" y="60" font-size="12"/);
  assert.match(board, /<text x="152" y="10" font-size="10"/);
  assert.match(board, /<circle cx="338" cy="36" r="9"/);
  assert.match(board, /<circle cx="365" cy="36" r="9"/);
  assert.match(board, /<circle cx="689" cy="36" r="9" [^/]*stroke=/, "today's disc is the ringed one");
  assert.equal(board.match(/<circle /g)?.length ?? 0, 13, "the one shielded day in the chain draws no disc");
  assert.match(board, /<path d="M385\.3,27\.7 h13\.4 v8\.3 q0,5\.4 -6\.7,8\.3 q-6\.7,-2\.9 -6\.7,-8\.3 z"/);
});

test("the calendar draws a 48px cell grid and colours it by level", () => {
  const board = GOLDEN_BOARD(light);
  assert.match(board, /<rect x="32" y="26" width="48" height="48" rx="4" fill="#ededea"/, "day 0 is empty: heat[0]");
  assert.match(board, /<rect x="32" y="130" width="48" height="48" rx="4" fill="#b8b8b4"/, "day 2 is 90m: heat[2]");
  assert.match(board, /<rect x="84" y="26" width="48" height="48"/, "the second week is one 52px pitch over");
  assert.equal(board.match(/ width="48" height="48" /g)?.length ?? 0, 21, "one cell per day, no more");
  assert.match(board, /^<svg [^>]*height="548"/);
  assert.match(board, /<g transform="translate\(0 112\)">/);
});

test("the poster keeps its tile bento and its 34px goal rows", () => {
  const poster = renderWrapped(factsOf(), light, LADDER);
  assert.match(poster, /^<svg [^>]*width="700" height="336"/);
  assert.match(poster, /<rect x="0" y="0" width="384" height="200" rx="10"/, "the total tile");
  assert.match(poster, /<rect x="392" y="0" width="308" height="200" rx="10"/, "the league tile");
  assert.match(poster, /<rect x="0" y="208" width="228" height="112" rx="10"/, "the first record tile");
  for (const [i, y] of [97, 131, 165].entries()) {
    assert.match(poster, new RegExp(`<text x="20" y="${y}" font-size="12" font-weight="600"`), `goal ${i} title`);
    assert.match(poster, new RegExp(`<rect x="20" y="${y + 6}" width="344" height="6" rx="3"`), `goal ${i} track`);
  }
  assert.match(poster, /<text x="18" y="[\d.]+" font-size="\d+" font-weight="800" fill="#ffffff" letter-spacing="-/);
});

test("the recap keeps three record tiles and never counts sessions given up on", () => {
  const poster = renderWrapped(factsOf(), dark, LADDER);

  assertWellFormed(poster, CHART_WIDTH);
  assert.doesNotMatch(poster, /seen through|started/);
});

test("the recap never reports what was blocked", () => {
  const poster = renderWrapped(factsOf(), dark, LADDER);

  assert.doesNotMatch(poster, /blocked|distraction|youtube/i);
});

test("the board keeps its three quests whatever the session count", () => {
  const messy = renderBoard(statsOf({ totalSessions: 21 }), dark, 60, LADDER);

  assertWellFormed(messy, CHART_WIDTH);
  assert.doesNotMatch(messy, /See it through/);
  assert.doesNotMatch(messy, /17 of 21 finished/);
});

test("wrappedFacts averages the weeks in range and dates the records", () => {
  const now = new Date(2026, 0, 20, 12);
  const range = periodRange("month", 0, now);
  const at = (day: number, duration: number) => ({
    start: new Date(2026, 0, day, 9).getTime(),
    goal: "Deep work",
    duration,
    source: "reported" as const,
  });
  const stats = statsOf();
  const facts = wrappedFacts(
    { stats, sessions: [at(6, 60), at(13, 120)], firstOnRecord: at(6, 60).start },
    range,
    1,
    now,
  );

  assert.equal(facts.periodLabel, range.label);
  assert.deepEqual(
    facts.weeks.map((w) => w.minutes),
    [60, 120, 0],
    "one week per Monday from the first session to now, however empty",
  );
  assert.equal(facts.weeklyAverage, 60);
  assert.equal(
    facts.bestStreakWhen,
    `${formatDay(stats.bestStreakStart ?? 0)} – ${formatDay(stats.bestStreakEnd ?? 0)}`,
  );
  assert.equal(facts.longestSessionWhen, formatDay(stats.longestSession?.start ?? 0));
  assert.equal(
    wrappedFacts({ stats: statsOf({ goals: [] }), sessions: [], firstOnRecord: null }, range, 1, now).goals[0].name,
    "No goal",
  );
});
