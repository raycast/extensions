import assert from "node:assert/strict";
import test from "node:test";
import { CALENDAR_WEEKS, UNLABELLED, computeStats, periodRange, weeklyTotals } from "./stats.ts";
import { SHIELDS_PER_WEEK, WALK_HORIZON_DAYS, dayKey, startOfDay, startOfWeek } from "./streaks.ts";
import type { Session, Stats } from "./types.ts";

const BUCHAREST = "Europe/Bucharest";
const SANTIAGO = "America/Santiago";

const session = (y: number, m: number, d: number, h = 10, duration = 30, goal = "Work"): Session => ({
  start: new Date(y, m - 1, d, h, 0, 0, 0).getTime(),
  goal,
  duration,
  source: "manual",
});

const sessionsOn = (y: number, m: number, from: number, to: number): Session[] => {
  const out: Session[] = [];
  for (let d = from; d <= to; d++) out.push(session(y, m, d));
  return out;
};

const at = (y: number, m: number, d: number, h = 14) => new Date(y, m - 1, d, h, 0, 0, 0);

type Golden = {
  name: string;
  tz?: string;
  weekStartsOn: 0 | 1;
  build: () => { sessions: Session[]; now: Date };
  current: number;
  best: number;
  bestEnd: string | null;
  shieldsLeft: number;
  shielded: string[];
  activeDays: number;
};

const goldens: Golden[] = [
  {
    name: "C1 no sessions at all",
    weekStartsOn: 1,
    build: () => ({ sessions: [], now: at(2025, 6, 11) }),
    current: 0,
    best: 0,
    bestEnd: null,
    shieldsLeft: 2,
    shielded: [],
    activeDays: 0,
  },
  {
    name: "C2 a single session today",
    weekStartsOn: 1,
    build: () => ({ sessions: [session(2025, 6, 11)], now: at(2025, 6, 11) }),
    current: 1,
    best: 1,
    bestEnd: "2025-06-11",
    shieldsLeft: 2,
    shielded: [],
    activeDays: 1,
  },
  {
    name: "C3 a single session yesterday, nothing today",
    weekStartsOn: 1,
    build: () => ({ sessions: [session(2025, 6, 10)], now: at(2025, 6, 11) }),
    current: 1,
    best: 1,
    bestEnd: "2025-06-10",
    shieldsLeft: 1,
    shielded: [],
    activeDays: 1,
  },
  {
    name: "C4 weekend off, week starts Monday",
    weekStartsOn: 1,
    build: () => ({ sessions: [...sessionsOn(2025, 6, 9, 13), session(2025, 6, 16)], now: at(2025, 6, 16) }),
    current: 6,
    best: 6,
    bestEnd: "2025-06-16",
    shieldsLeft: 2,
    shielded: ["2025-06-14", "2025-06-15"],
    activeDays: 6,
  },
  {
    name: "C5 the same weekend off, week starts Sunday",
    weekStartsOn: 0,
    build: () => ({ sessions: [...sessionsOn(2025, 6, 9, 13), session(2025, 6, 16)], now: at(2025, 6, 16) }),
    current: 6,
    best: 6,
    bestEnd: "2025-06-16",
    shieldsLeft: 1,
    shielded: ["2025-06-14", "2025-06-15"],
    activeDays: 6,
  },
  {
    name: "C6 a gap of three empty days mid-week",
    weekStartsOn: 1,
    build: () => ({ sessions: [session(2025, 6, 9), session(2025, 6, 13)], now: at(2025, 6, 13) }),
    current: 1,
    best: 1,
    bestEnd: "2025-06-09",
    shieldsLeft: 2,
    shielded: [],
    activeDays: 2,
  },
  {
    name: "C7 a run broken mid-week, then resumed",
    weekStartsOn: 1,
    build: () => ({
      sessions: [...sessionsOn(2025, 6, 2, 6), session(2025, 6, 12), session(2025, 6, 13)],
      now: at(2025, 6, 13),
    }),
    current: 2,
    best: 5,
    bestEnd: "2025-06-06",
    shieldsLeft: 2,
    shielded: [],
    activeDays: 7,
  },
  {
    name: "C8 today empty, a five-day run behind it",
    weekStartsOn: 1,
    build: () => ({ sessions: sessionsOn(2025, 6, 6, 10), now: at(2025, 6, 11) }),
    current: 5,
    best: 5,
    bestEnd: "2025-06-10",
    shieldsLeft: 1,
    shielded: [],
    activeDays: 5,
  },
  {
    name: "C9 the first-ever session is today, week starts Sunday",
    weekStartsOn: 0,
    build: () => ({ sessions: [session(2025, 6, 12)], now: at(2025, 6, 12) }),
    current: 1,
    best: 1,
    bestEnd: "2025-06-12",
    shieldsLeft: 2,
    shielded: [],
    activeDays: 1,
  },
  {
    name: "C10 sessions far in the past with a long empty tail",
    weekStartsOn: 1,
    build: () => ({ sessions: sessionsOn(2025, 1, 6, 10), now: at(2025, 6, 11) }),
    current: 0,
    best: 5,
    bestEnd: "2025-01-10",
    shieldsLeft: 1,
    shielded: [],
    activeDays: 5,
  },
  {
    name: "C11 a full unbroken 30-day run ending today",
    weekStartsOn: 1,
    build: () => ({
      sessions: [...sessionsOn(2025, 5, 13, 31), ...sessionsOn(2025, 6, 1, 11)],
      now: at(2025, 6, 11),
    }),
    current: 30,
    best: 30,
    bestEnd: "2025-06-11",
    shieldsLeft: 2,
    shielded: [],
    activeDays: 30,
  },
  {
    name: "C12 shields exhausted exactly, streak survives",
    weekStartsOn: 1,
    build: () => ({ sessions: [session(2025, 6, 9), session(2025, 6, 12)], now: at(2025, 6, 12) }),
    current: 2,
    best: 2,
    bestEnd: "2025-06-12",
    shieldsLeft: 0,
    shielded: ["2025-06-10", "2025-06-11"],
    activeDays: 2,
  },
  {
    name: "C13 one empty day past exhaustion, the live streak collapses",
    weekStartsOn: 1,
    build: () => ({ sessions: [session(2025, 6, 9)], now: at(2025, 6, 13) }),
    current: 0,
    best: 1,
    bestEnd: "2025-06-09",
    shieldsLeft: 1,
    shielded: [],
    activeDays: 1,
  },
  {
    name: "C14 a DST spring-forward at 03:00 changes nothing",
    weekStartsOn: 1,
    build: () => ({
      sessions: [session(2025, 3, 29, 23), session(2025, 3, 30, 0, 30), session(2025, 3, 31, 10)],
      now: at(2025, 3, 31),
    }),
    current: 3,
    best: 3,
    bestEnd: "2025-03-31",
    shieldsLeft: 2,
    shielded: [],
    activeDays: 3,
  },
  {
    name: "C15 Monday morning, history ends Sunday: the empty Monday has already cost a shield",
    weekStartsOn: 1,
    build: () => ({ sessions: sessionsOn(2025, 6, 2, 8), now: at(2025, 6, 9) }),
    current: 7,
    best: 7,
    bestEnd: "2025-06-08",
    shieldsLeft: 1,
    shielded: [],
    activeDays: 7,
  },
  {
    name: "C16 today empty plus one other empty day this week",
    weekStartsOn: 1,
    build: () => ({ sessions: [session(2025, 6, 9), session(2025, 6, 11)], now: at(2025, 6, 12) }),
    current: 2,
    best: 2,
    bestEnd: "2025-06-11",
    shieldsLeft: 0,
    shielded: ["2025-06-10"],
    activeDays: 2,
  },
  {
    name: "C17 sessions dated in the future",
    weekStartsOn: 1,
    build: () => ({ sessions: [session(2025, 6, 20)], now: at(2025, 6, 11) }),
    current: 0,
    best: 1,
    bestEnd: "2025-06-20",
    shieldsLeft: 2,
    shielded: [],
    activeDays: 1,
  },
  {
    name: "C18 a zero-duration session today is not an active day",
    weekStartsOn: 1,
    build: () => ({ sessions: [session(2025, 6, 11, 9, 0)], now: at(2025, 6, 11) }),
    current: 0,
    best: 0,
    bestEnd: null,
    shieldsLeft: 2,
    shielded: [],
    activeDays: 0,
  },
  {
    name: "C19 a DST spring-forward at local midnight keeps the last day",
    tz: SANTIAGO,
    weekStartsOn: 1,
    build: () => ({
      sessions: [session(2025, 9, 7, 12), session(2025, 9, 8, 12), session(2025, 9, 9, 12)],
      now: at(2025, 9, 9),
    }),
    current: 3,
    best: 3,
    bestEnd: "2025-09-09",
    shieldsLeft: 2,
    shielded: [],
    activeDays: 3,
  },
];

function run(g: Golden): { stats: Stats; now: Date } {
  process.env.TZ = g.tz ?? BUCHAREST;
  const { sessions, now } = g.build();
  const stats = computeStats(sessions, {
    weekStartsOn: g.weekStartsOn,
    calendarWeeks: CALENDAR_WEEKS,
    now,
  });
  return { stats, now };
}

for (const g of goldens) {
  test(`computeStats golden: ${g.name}`, () => {
    const { stats, now } = run(g);
    assert.equal(stats.currentStreak, g.current, "currentStreak");
    assert.equal(stats.bestStreak, g.best, "bestStreak");
    assert.equal(
      stats.bestStreakEnd === null ? null : dayKey(new Date(stats.bestStreakEnd)),
      g.bestEnd,
      "bestStreakEnd",
    );
    assert.equal(stats.shieldsLeft, g.shieldsLeft, "shieldsLeft");
    assert.deepEqual(
      stats.days.filter((d) => d.shielded).map((d) => d.date),
      g.shielded,
      "shielded calendar days",
    );
    assert.equal(stats.activeDays, g.activeDays, "activeDays");

    const calendarStart = startOfWeek(now, g.weekStartsOn);
    calendarStart.setDate(calendarStart.getDate() - (CALENDAR_WEEKS - 1) * 7);
    assert.equal(stats.days[0].date, dayKey(calendarStart), "calendar starts a whole week back");
    assert.equal(stats.days[stats.days.length - 1].date, dayKey(now), "calendar ends today");
  });
}

test("a shield never lifts a day into the streak count", () => {
  const byName = new Map(goldens.map((g) => [g.name, g]));
  const g = byName.get("C4 weekend off, week starts Monday")!;
  const { stats } = run(g);
  assert.equal(stats.currentStreak, 6, "six active days, two of them shielded, counts six");
  assert.equal(stats.shieldsLeft, SHIELDS_PER_WEEK, "the shields were spent in last week's budget");
});

test("totals, goals and records", () => {
  process.env.TZ = BUCHAREST;
  const sessions: Session[] = [
    session(2025, 6, 9, 10, 30, "Write"),
    session(2025, 6, 9, 14, 90, "Code"),
    session(2025, 6, 10, 9, 45, "Write"),
    session(2025, 6, 10, 16, 20, "   "),
  ];
  const stats = computeStats(sessions, {
    weekStartsOn: 1,
    calendarWeeks: CALENDAR_WEEKS,
    now: at(2025, 6, 10),
  });

  assert.equal(stats.totalMinutes, 185);
  assert.equal(stats.totalSessions, 4);
  assert.equal(stats.firstSessionAt, sessions[0].start);
  assert.equal(stats.todayMinutes, 65, "only 2025-06-10");
  assert.equal(stats.weekMinutes, 185, "the whole week so far");
  assert.deepEqual(
    stats.goals.map((g) => [g.name, g.minutes, g.sessions]),
    [
      ["Write", 75, 2],
      ["Code", 90, 1],
      [UNLABELLED, 20, 1],
    ].sort((a, b) => (b[1] as number) - (a[1] as number)),
    "goals ordered by minutes, blank goal folded into UNLABELLED",
  );
  assert.equal(stats.longestSession?.duration, 90);
  assert.deepEqual(stats.bestDay, { date: "2025-06-09", minutes: 120 });
});

test("a zero-duration session still counts as a session on its day", () => {
  process.env.TZ = BUCHAREST;
  const stats = computeStats([session(2025, 6, 11, 9, 0)], {
    weekStartsOn: 1,
    calendarWeeks: CALENDAR_WEEKS,
    now: at(2025, 6, 11),
  });
  const today = stats.days[stats.days.length - 1];
  assert.deepEqual({ ...today }, { date: "2025-06-11", minutes: 0, sessions: 1, level: 0, shielded: false });
  assert.deepEqual(stats.bestDay, { date: "2025-06-11", minutes: 0 });
  assert.equal(stats.activeDays, 0);
});

test("last week counts all seven days, not just the stretch already lived this week", () => {
  process.env.TZ = BUCHAREST;
  const sessions = [session(2025, 6, 2, 10, 60), session(2025, 6, 4, 20, 60), session(2025, 6, 9, 10, 25)];
  const stats = computeStats(sessions, {
    weekStartsOn: 1,
    calendarWeeks: CALENDAR_WEEKS,
    now: at(2025, 6, 10, 12),
  });
  assert.equal(stats.weekMinutes, 25);
  assert.equal(stats.lastWeekMinutes, 120, "Wednesday 20:00 last week counts even though it is only Tuesday noon");
});

test("calendarWeeks decides the calendar's length", () => {
  process.env.TZ = BUCHAREST;
  const now = at(2025, 6, 11);
  const stats = computeStats([], { weekStartsOn: 1, calendarWeeks: 4, now });
  assert.equal(stats.days[0].date, "2025-05-19", "three whole weeks back, then the current one");
  assert.equal(stats.days[stats.days.length - 1].date, "2025-06-11");
  assert.equal(stats.days.length, 3 * 7 + 3, "three full weeks plus Monday to Wednesday");
});

test("records keep the earliest claimant when two tie", () => {
  process.env.TZ = BUCHAREST;
  const stats = computeStats([session(2025, 6, 9, 10, 60, "Early"), session(2025, 6, 10, 10, 60, "Late")], {
    weekStartsOn: 1,
    calendarWeeks: CALENDAR_WEEKS,
    now: at(2025, 6, 11),
  });
  assert.equal(stats.longestSession?.goal, "Early", "equal durations do not displace the incumbent");
  assert.deepEqual(stats.bestDay, { date: "2025-06-09", minutes: 60 }, "equal day totals likewise");
});

test("levels spread a day's minutes over the user's own distribution", () => {
  process.env.TZ = BUCHAREST;
  const sessions = [10, 20, 40, 80, 160].map((m, i) => session(2025, 6, 7 + i, 10, m));
  const stats = computeStats(sessions, {
    weekStartsOn: 1,
    calendarWeeks: CALENDAR_WEEKS,
    now: at(2025, 6, 11),
  });
  const levels = new Map(stats.days.map((d) => [d.date, d.level]));
  assert.equal(levels.get("2025-06-06"), 0, "an empty day is always level 0");
  assert.equal(levels.get("2025-06-11"), 4, "the heaviest day is always level 4");
  assert.ok(levels.get("2025-06-07")! >= 1, "any day with minutes is at least level 1");
});

test("startOfDay, startOfWeek and dayKey agree about the local day", () => {
  process.env.TZ = BUCHAREST;
  const d = at(2025, 6, 11, 23);
  assert.equal(dayKey(d), "2025-06-11");
  assert.equal(dayKey(startOfDay(d)), "2025-06-11");
  assert.equal(dayKey(startOfWeek(d, 1)), "2025-06-09");
  assert.equal(dayKey(startOfWeek(d, 0)), "2025-06-08");
});

test("weeklyTotals has no gaps and ends on the current week", () => {
  process.env.TZ = BUCHAREST;
  const sessions = [session(2025, 5, 26, 10, 60), session(2025, 6, 10, 10, 30)];
  const totals = weeklyTotals(sessions, 0, 1, at(2025, 6, 11));
  assert.deepEqual(totals, [
    { start: "2025-05-26", minutes: 60 },
    { start: "2025-06-02", minutes: 0 },
    { start: "2025-06-09", minutes: 30 },
  ]);
  assert.deepEqual(weeklyTotals([], 0, 1, at(2025, 6, 11)), [], "no sessions, no weeks");
});

test("weeklyTotals refuses to walk further back than the streak horizon", () => {
  process.env.TZ = BUCHAREST;
  const now = at(2025, 6, 11);
  const corrupt = { start: -8e15, goal: "junk", duration: 30, source: "manual" as const };
  const totals = weeklyTotals([corrupt, session(2025, 6, 10, 10, 30)], 0, 1, now);

  assert.ok(totals.length <= Math.ceil((WALK_HORIZON_DAYS / 7) * 1.01) + 1, `${totals.length} weeks is unbounded`);
  assert.equal(totals[totals.length - 1].start, "2025-06-09", "it still ends on the current week");
  assert.equal(totals[totals.length - 1].minutes, 30);
});

const mon = (year: number, month: number) => new Date(year, month, 1).toLocaleDateString(undefined, { month: "short" });

const span = (year: number, first: number, last: number) => `${mon(year, first)}–${mon(year, last)} ${year}`;

test("periodRange", () => {
  process.env.TZ = BUCHAREST;
  const now = at(2025, 6, 11);
  assert.equal(periodRange("all", 0, now).from, 0);
  assert.equal(periodRange("month", 0, now).from, new Date(2025, 5, 1).getTime());
  assert.equal(periodRange("month", 0, now).to, new Date(2025, 6, 1).getTime());
  assert.equal(periodRange("quarter", 0, now).from, new Date(2025, 3, 1).getTime());
  assert.equal(periodRange("quarter", 0, now).label, span(2025, 3, 5));
  assert.equal(periodRange("half", 0, now).from, new Date(2025, 0, 1).getTime());
  assert.equal(periodRange("half", 0, now).label, span(2025, 0, 5));
  assert.equal(periodRange("year", 0, now).from, new Date(2025, 0, 1).getTime());
  assert.equal(periodRange("year", 0, now).label, "2025");
});

test("periodRange steps back by whole periods, across year boundaries", () => {
  process.env.TZ = BUCHAREST;
  const now = at(2025, 6, 11);

  assert.equal(periodRange("month", -1, now).label, "May 2025");
  assert.equal(periodRange("month", -6, now).label, "December 2024");
  assert.equal(periodRange("month", -6, now).to, new Date(2025, 0, 1).getTime());

  assert.equal(periodRange("quarter", -1, now).label, span(2025, 0, 2));
  assert.equal(periodRange("quarter", -2, now).label, span(2024, 9, 11));

  assert.equal(periodRange("half", -1, now).label, span(2024, 6, 11));
  assert.equal(periodRange("half", -2, now).label, span(2024, 0, 5));

  assert.equal(periodRange("year", -1, now).label, "2024");
  assert.equal(periodRange("year", -1, now).from, new Date(2024, 0, 1).getTime());
  assert.equal(periodRange("year", -1, now).to, new Date(2025, 0, 1).getTime());
});

test("a stepped period is a closed range, each one picking up where the last left off", () => {
  process.env.TZ = BUCHAREST;
  const now = at(2025, 6, 11);
  for (const period of ["month", "quarter", "half", "year"] as const)
    assert.equal(periodRange(period, -1, now).to, periodRange(period, 0, now).from);
});

test("a day with a clock change still counts its last hour", () => {
  process.env.TZ = BUCHAREST;
  // 2026-10-25: clocks go back at 04:00, so the local day and its week last an hour longer
  const late = session(2026, 10, 25, 23, 45);
  const stats = computeStats([late], { weekStartsOn: 1, calendarWeeks: CALENDAR_WEEKS, now: at(2026, 10, 25, 23) });
  assert.equal(stats.todayMinutes, 45);
  assert.equal(stats.weekMinutes, 45);
});
