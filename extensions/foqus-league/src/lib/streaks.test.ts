import assert from "node:assert/strict";
import test from "node:test";
import { SHIELDS_PER_WEEK, dayKey, shiftDayKey, startOfWeek, walkStreaks } from "./streaks.ts";

const BUCHAREST = "Europe/Bucharest";
const SANTIAGO = "America/Santiago";

const day = (y: number, m: number, d: number) => dayKey(new Date(y, m - 1, d));

const days = (y: number, m: number, from: number, to: number): string[] => {
  const out: string[] = [];
  for (let d = from; d <= to; d++) out.push(day(y, m, d));
  return out;
};

const at = (y: number, m: number, d: number, h = 14) => new Date(y, m - 1, d, h, 0, 0, 0);

type Golden = {
  name: string;
  tz?: string;
  weekStartsOn: 0 | 1;
  build: () => { active: string[]; now: Date };
  current: number;
  best: number;
  bestStart: string | null;
  bestEnd: string | null;
  shieldsLeft: number;
  shielded: string[];
};

const goldens: Golden[] = [
  {
    name: "C1 no active days at all",
    weekStartsOn: 1,
    build: () => ({ active: [], now: at(2025, 6, 11) }),
    current: 0,
    best: 0,
    bestStart: null,
    bestEnd: null,
    shieldsLeft: 2,
    shielded: [],
  },
  {
    name: "C2 today only",
    weekStartsOn: 1,
    build: () => ({ active: [day(2025, 6, 11)], now: at(2025, 6, 11) }),
    current: 1,
    best: 1,
    bestStart: "2025-06-11",
    bestEnd: "2025-06-11",
    shieldsLeft: 2,
    shielded: [],
  },
  {
    name: "C3 yesterday only, nothing today",
    weekStartsOn: 1,
    build: () => ({ active: [day(2025, 6, 10)], now: at(2025, 6, 11) }),
    current: 1,
    best: 1,
    bestStart: "2025-06-10",
    bestEnd: "2025-06-10",
    shieldsLeft: 1,
    shielded: [],
  },
  {
    name: "C4 weekend off, week starts Monday",
    weekStartsOn: 1,
    build: () => ({ active: [...days(2025, 6, 9, 13), day(2025, 6, 16)], now: at(2025, 6, 16) }),
    current: 6,
    best: 6,
    bestStart: "2025-06-09",
    bestEnd: "2025-06-16",
    shieldsLeft: 2,
    shielded: ["2025-06-14", "2025-06-15"],
  },
  {
    name: "C5 the same weekend off, week starts Sunday",
    weekStartsOn: 0,
    build: () => ({ active: [...days(2025, 6, 9, 13), day(2025, 6, 16)], now: at(2025, 6, 16) }),
    current: 6,
    best: 6,
    bestStart: "2025-06-09",
    bestEnd: "2025-06-16",
    shieldsLeft: 1,
    shielded: ["2025-06-14", "2025-06-15"],
  },
  {
    name: "C6 a gap of three empty days mid-week",
    weekStartsOn: 1,
    build: () => ({ active: [day(2025, 6, 9), day(2025, 6, 13)], now: at(2025, 6, 13) }),
    current: 1,
    best: 1,
    bestStart: "2025-06-09",
    bestEnd: "2025-06-09",
    shieldsLeft: 2,
    shielded: [],
  },
  {
    name: "C7 a run broken mid-week, then resumed",
    weekStartsOn: 1,
    build: () => ({
      active: [...days(2025, 6, 2, 6), day(2025, 6, 12), day(2025, 6, 13)],
      now: at(2025, 6, 13),
    }),
    current: 2,
    best: 5,
    bestStart: "2025-06-02",
    bestEnd: "2025-06-06",
    shieldsLeft: 2,
    shielded: [],
  },
  {
    name: "C8 today empty, a five-day run behind it",
    weekStartsOn: 1,
    build: () => ({ active: days(2025, 6, 6, 10), now: at(2025, 6, 11) }),
    current: 5,
    best: 5,
    bestStart: "2025-06-06",
    bestEnd: "2025-06-10",
    shieldsLeft: 1,
    shielded: [],
  },
  {
    name: "C9 the first-ever day is today, week starts Sunday",
    weekStartsOn: 0,
    build: () => ({ active: [day(2025, 6, 12)], now: at(2025, 6, 12) }),
    current: 1,
    best: 1,
    bestStart: "2025-06-12",
    bestEnd: "2025-06-12",
    shieldsLeft: 2,
    shielded: [],
  },
  {
    name: "C10 far in the past with a long empty tail",
    weekStartsOn: 1,
    build: () => ({ active: days(2025, 1, 6, 10), now: at(2025, 6, 11) }),
    current: 0,
    best: 5,
    bestStart: "2025-01-06",
    bestEnd: "2025-01-10",
    shieldsLeft: 1,
    shielded: [],
  },
  {
    name: "C11 a full unbroken 30-day run ending today",
    weekStartsOn: 1,
    build: () => ({ active: [...days(2025, 5, 13, 31), ...days(2025, 6, 1, 11)], now: at(2025, 6, 11) }),
    current: 30,
    best: 30,
    bestStart: "2025-05-13",
    bestEnd: "2025-06-11",
    shieldsLeft: 2,
    shielded: [],
  },
  {
    name: "C12 shields exhausted exactly, streak survives",
    weekStartsOn: 1,
    build: () => ({ active: [day(2025, 6, 9), day(2025, 6, 12)], now: at(2025, 6, 12) }),
    current: 2,
    best: 2,
    bestStart: "2025-06-09",
    bestEnd: "2025-06-12",
    shieldsLeft: 0,
    shielded: ["2025-06-10", "2025-06-11"],
  },
  {
    name: "C13 one empty day past exhaustion, the live streak collapses",
    weekStartsOn: 1,
    build: () => ({ active: [day(2025, 6, 9)], now: at(2025, 6, 13) }),
    current: 0,
    best: 1,
    bestStart: "2025-06-09",
    bestEnd: "2025-06-09",
    shieldsLeft: 1,
    shielded: [],
  },
  {
    name: "C14 a DST spring-forward at 03:00 changes nothing",
    weekStartsOn: 1,
    build: () => ({ active: days(2025, 3, 29, 31), now: at(2025, 3, 31) }),
    current: 3,
    best: 3,
    bestStart: "2025-03-29",
    bestEnd: "2025-03-31",
    shieldsLeft: 2,
    shielded: [],
  },
  {
    name: "C15 Monday morning, history ends Sunday: the empty Monday has already cost a shield",
    weekStartsOn: 1,
    build: () => ({ active: days(2025, 6, 2, 8), now: at(2025, 6, 9) }),
    current: 7,
    best: 7,
    bestStart: "2025-06-02",
    bestEnd: "2025-06-08",
    shieldsLeft: 1,
    shielded: [],
  },
  {
    name: "C16 today empty plus one other empty day this week",
    weekStartsOn: 1,
    build: () => ({ active: [day(2025, 6, 9), day(2025, 6, 11)], now: at(2025, 6, 12) }),
    current: 2,
    best: 2,
    bestStart: "2025-06-09",
    bestEnd: "2025-06-11",
    shieldsLeft: 0,
    shielded: ["2025-06-10"],
  },
  {
    name: "C17 active days dated in the future",
    weekStartsOn: 1,
    build: () => ({ active: [day(2025, 6, 20)], now: at(2025, 6, 11) }),
    current: 0,
    best: 1,
    bestStart: "2025-06-20",
    bestEnd: "2025-06-20",
    shieldsLeft: 2,
    shielded: [],
  },
  {
    name: "C19 a DST spring-forward at local midnight keeps the last day",
    tz: SANTIAGO,
    weekStartsOn: 1,
    build: () => ({ active: days(2025, 9, 7, 9), now: at(2025, 9, 9) }),
    current: 3,
    best: 3,
    bestStart: "2025-09-07",
    bestEnd: "2025-09-09",
    shieldsLeft: 2,
    shielded: [],
  },
];

function run(g: Golden) {
  process.env.TZ = g.tz ?? BUCHAREST;
  const { active, now } = g.build();
  return { walk: walkStreaks(active, g.weekStartsOn, now), now };
}

const weekOf = (key: string, weekStartsOn: 0 | 1) => {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(startOfWeek(new Date(y, m - 1, d), weekStartsOn));
};

const expectedShieldsLeft = (active: string[], weekStartsOn: 0 | 1, now: Date, shieldedDays: Set<string>) => {
  const thisWeek = weekOf(dayKey(now), weekStartsOn);
  const spent = [...shieldedDays].filter((k) => weekOf(k, weekStartsOn) === thisWeek).length;
  const sorted = [...active].sort();
  const today = dayKey(now);
  const todayCosts = sorted.length && !active.includes(today) && today >= sorted[0] ? 1 : 0;
  return Math.max(0, SHIELDS_PER_WEEK - spent - todayCosts);
};

for (const g of goldens) {
  test(`walkStreaks golden: ${g.name}`, () => {
    const { walk, now } = run(g);
    assert.equal(walk.current, g.current, "current");
    assert.equal(walk.best, g.best, "best");
    assert.equal(walk.bestStart === null ? null : dayKey(new Date(walk.bestStart)), g.bestStart, "bestStart");
    assert.equal(walk.bestEnd === null ? null : dayKey(new Date(walk.bestEnd)), g.bestEnd, "bestEnd");
    assert.equal(walk.shieldsLeft, g.shieldsLeft, "shieldsLeft");
    assert.deepEqual([...walk.shieldedDays].sort(), g.shielded, "shieldedDays");

    assert.equal(
      walk.shieldsLeft,
      expectedShieldsLeft(g.build().active, g.weekStartsOn, now, walk.shieldedDays),
      "shieldsLeft is the live ledger's spend this week plus the standing charge for an empty today",
    );
  });
}

test("the best run spans its shielded days, so bestStart is earlier than bestEnd minus best", () => {
  process.env.TZ = BUCHAREST;
  const active = [day(2025, 6, 9), day(2025, 6, 10), day(2025, 6, 12), day(2025, 6, 13), day(2025, 6, 14)];
  const walk = walkStreaks(active, 1, at(2025, 6, 14));
  assert.equal(walk.best, 5, "the shielded 2025-06-11 holds the run together but does not count");
  assert.equal(dayKey(new Date(walk.bestEnd!)), "2025-06-14");
  assert.equal(dayKey(new Date(walk.bestStart!)), "2025-06-09", "not 2025-06-10, which bestEnd minus best gives");
});

test("a third empty day in the same week breaks the streak", () => {
  process.env.TZ = BUCHAREST;
  const now = at(2025, 6, 13);
  const twoOff = walkStreaks([day(2025, 6, 9), day(2025, 6, 12), day(2025, 6, 13)], 1, now);
  assert.equal(twoOff.current, 3, "Tuesday and Wednesday shielded");
  const threeOff = walkStreaks([day(2025, 6, 9), day(2025, 6, 13)], 1, now);
  assert.equal(threeOff.current, 1, "Monday is out of reach on a two-shield budget");
  assert.deepEqual([...threeOff.shieldedDays], [], "the days the break stranded are not saved days");
  assert.equal(threeOff.shieldsLeft, 2, "and the shields they reached for come back");
});

test("no shield is drawn behind the day that ended the run", () => {
  process.env.TZ = BUCHAREST;
  const walk = walkStreaks([...days(2025, 6, 2, 4), ...days(2025, 6, 8, 15)], 1, at(2025, 6, 15));

  assert.equal(walk.current, 8, "Sunday through Sunday, and nothing before Thursday");
  assert.deepEqual([...walk.shieldedDays], []);
  assert.equal(walk.shieldsLeft, SHIELDS_PER_WEEK, "this week's budget is untouched");
});

test("each week gets its own budget, so where a gap falls decides whether it is survivable", () => {
  process.env.TZ = BUCHAREST;
  const straddling = walkStreaks([day(2025, 6, 6), day(2025, 6, 11)], 1, at(2025, 6, 11));
  assert.equal(straddling.current, 2, "two shields from the week of 06-09 and two from the week of 06-02");
  assert.deepEqual([...straddling.shieldedDays].sort(), ["2025-06-07", "2025-06-08", "2025-06-09", "2025-06-10"]);
  assert.equal(straddling.shieldsLeft, 0);

  const inOneWeek = walkStreaks([day(2025, 6, 9), day(2025, 6, 14)], 1, at(2025, 6, 14));
  assert.equal(inOneWeek.current, 1, "the same four empty days inside one week break the streak");
  assert.deepEqual([...inOneWeek.shieldedDays].sort(), [], "and a broken run saves none of them");
});

test("the two walks' separate budgets can leave the best streak below the live one", () => {
  process.env.TZ = BUCHAREST;
  const walk = walkStreaks([day(2025, 6, 2), day(2025, 6, 6), day(2025, 6, 8)], 1, at(2025, 6, 11));
  assert.equal(walk.current, 2, "walking back from today, 06-07 is shielded and joins 06-08 to 06-06");
  assert.equal(walk.best, 1, "walking forward, the week's two shields went on 06-03 and 06-04 instead");
});

test("the live walk and the best walk do not share a budget", () => {
  process.env.TZ = BUCHAREST;
  const walk = walkStreaks([...days(2025, 6, 2, 6), day(2025, 6, 12), day(2025, 6, 13)], 1, at(2025, 6, 13));
  assert.equal(walk.best, 5, "the best walk spends its own two shields on 06-07 and 06-08, then breaks");
  assert.equal(walk.current, 2, "the live walk still has its own two, spent on 06-10 and 06-11");
});

test("shieldsLeft stays within the budget whatever the history", () => {
  process.env.TZ = BUCHAREST;
  const now = at(2025, 6, 11);
  for (let mask = 0; mask < 1 << 10; mask++) {
    for (const weekStartsOn of [0, 1] as const) {
      const active: string[] = [];
      for (let i = 0; i < 10; i++) if (mask & (1 << i)) active.push(day(2025, 6, 2 + i));
      const walk = walkStreaks(active, weekStartsOn, now);
      assert.ok(
        walk.shieldsLeft >= 0 && walk.shieldsLeft <= SHIELDS_PER_WEEK,
        `shieldsLeft out of range for mask ${mask}`,
      );
      assert.equal(
        walk.shieldsLeft,
        expectedShieldsLeft(active, weekStartsOn, now, walk.shieldedDays),
        `shieldsLeft off the ledger for mask ${mask}`,
      );
    }
  }
});

test("shiftDayKey walks the local calendar across DST, months and years", () => {
  process.env.TZ = SANTIAGO;
  assert.equal(shiftDayKey("2025-09-06", 1), "2025-09-07", "into the day with no local midnight");
  assert.equal(shiftDayKey("2025-09-07", 1), "2025-09-08", "and out of it again");
  assert.equal(shiftDayKey("2025-09-08", -1), "2025-09-07");
  assert.equal(shiftDayKey("2025-04-06", 1), "2025-04-07", "across the autumn fall-back");
  process.env.TZ = BUCHAREST;
  assert.equal(shiftDayKey("2025-01-31", 1), "2025-02-01");
  assert.equal(shiftDayKey("2025-03-01", -1), "2025-02-28");
  assert.equal(shiftDayKey("2024-02-28", 1), "2024-02-29", "a leap day");
  assert.equal(shiftDayKey("2024-12-31", 1), "2025-01-01");
  assert.equal(shiftDayKey("2025-01-01", -1), "2024-12-31");
  assert.equal(shiftDayKey("2025-06-11", 0), "2025-06-11");
});

test("a day key no real date produced cannot stall the walk", () => {
  process.env.TZ = BUCHAREST;
  const now = new Date(2026, 8, 16);

  const started = Date.now();
  const walk = walkStreaks([day(2026, 9, 14), day(2026, 9, 15), "NaN-NaN-NaN"], 1, now);

  assert.ok(Date.now() - started < 1000, "the walk has to end");
  assert.equal(walk.best, 2, "and the two real days are still a streak of two");
});

test("a day key in an absurd year is dropped rather than walked one day at a time", () => {
  process.env.TZ = BUCHAREST;
  const now = new Date(2026, 8, 16);

  const started = Date.now();
  const walk = walkStreaks([day(2026, 9, 14), day(2026, 9, 15), "57398-01-01"], 1, now);

  assert.ok(Date.now() - started < 1000, "bounded by the day count, not by string order");
  assert.equal(walk.best, 2);
});

test("the walk horizon drops a key rather than clamping it", () => {
  process.env.TZ = BUCHAREST;
  const now = new Date(2026, 8, 16);

  const inRange = walkStreaks([day(1976, 9, 16)], 1, now);
  assert.equal(inRange.best, 1, "fifty years back is a plausible history, not corruption");
  assert.equal(dayKey(new Date(inRange.bestStart!)), "1976-09-16");

  const outOfRange = walkStreaks([day(1876, 9, 16)], 1, now);
  assert.equal(outOfRange.best, 0, "a century and a half back is dropped outright");
  assert.equal(outOfRange.bestStart, null);
});

test("ties keep the first run, so a best streak of 1 is dated at the earliest active day", () => {
  process.env.TZ = BUCHAREST;
  const walk = walkStreaks([day(2025, 6, 2), day(2025, 6, 20)], 1, at(2025, 6, 20));
  assert.equal(walk.best, 1, "seventeen empty days are far past a two-shield week");
  assert.equal(dayKey(new Date(walk.bestStart!)), "2025-06-02", "not the later day of equal length");
  assert.equal(dayKey(new Date(walk.bestEnd!)), "2025-06-02");
});
