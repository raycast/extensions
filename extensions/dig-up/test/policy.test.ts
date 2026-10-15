// engine/policy.ts: the held decision (DigUp PowerPolicy.backfillBlocker + IndexSchedule), IndexHours across midnight,
// and the Policy shell (first read, settings changes, failed reads, wake).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Config } from "../engine/api";
import type { PowerStatus } from "../engine/helper";
import { silentLog, type Log } from "../engine/log";
import { IndexHours, Policy, decide, type PolicyHeld } from "../engine/policy";

const AC: PowerStatus = { onBattery: false, lowPower: false, thermal: "nominal" };
const at = (hour: number, minute = 0) => new Date(2026, 9, 15, hour, minute, 0, 0);

describe("decide", () => {
  const base = { paused: false, hours: null, indexOnBattery: true, power: AC, now: at(12) };

  it("holds nothing on AC, cool, any hour", () => {
    assert.deepEqual(decide(base), { held: null, until: null });
  });

  // Each row: the inputs that differ from `base`, and the hold that wins.
  const table: Array<[string, Partial<Parameters<typeof decide>[0]>, PolicyHeld]> = [
    ["paused", { paused: true }, "paused"],
    [
      "paused beats everything",
      {
        paused: true,
        hours: new IndexHours(60, 420),
        indexOnBattery: false,
        power: { onBattery: true, lowPower: true, thermal: "critical" },
      },
      "paused",
    ],
    ["outside the hours", { hours: new IndexHours(60, 420) }, "outside index hours"],
    [
      "the hours beat power",
      {
        hours: new IndexHours(60, 420),
        indexOnBattery: false,
        power: { onBattery: true, lowPower: true, thermal: "serious" },
      },
      "outside index hours",
    ],
    ["Low Power Mode", { power: { ...AC, lowPower: true } }, "Low Power Mode"],
    [
      "Low Power Mode beats warm and battery",
      {
        indexOnBattery: false,
        power: { onBattery: true, lowPower: true, thermal: "critical" },
      },
      "Low Power Mode",
    ],
    ["serious is warm", { power: { ...AC, thermal: "serious" } }, "Mac is warm"],
    ["critical is warm", { power: { ...AC, thermal: "critical" } }, "Mac is warm"],
    ["fair is not warm", { power: { ...AC, thermal: "fair" } }, null],
    [
      "warm beats battery",
      { indexOnBattery: false, power: { onBattery: true, lowPower: false, thermal: "serious" } },
      "Mac is warm",
    ],
    [
      "battery with indexing on battery off",
      { indexOnBattery: false, power: { ...AC, onBattery: true } },
      "on battery",
    ],
    ["battery with indexing on battery on (DigUp's default)", { power: { ...AC, onBattery: true } }, null],
    ["inside the hours", { hours: new IndexHours(60, 420), now: at(3) }, null],
    ["no power reading: no power hold (a desktop Mac)", { indexOnBattery: false, power: null }, null],
  ];
  for (const [name, change, held] of table) {
    it(name, () => assert.equal(decide({ ...base, ...change }).held, held));
  }

  it("says until when the hours start again", () => {
    const decision = decide({ ...base, hours: new IndexHours(22 * 60, 7 * 60), now: at(12, 30) });
    assert.equal(decision.held, "outside index hours");
    assert.equal(decision.until, at(22).getTime());
  });
});

describe("IndexHours", () => {
  it("wraps midnight (22-7): in from 22:00, out from 07:00", () => {
    const night = IndexHours.fromConfig({ start: 22, end: 7 })!;
    const inside = [at(22), at(23, 59), at(0), at(3), at(6, 59)];
    const outside = [at(7), at(12), at(21, 59)];
    for (const date of inside) assert.equal(night.contains(date), true, date.toTimeString());
    for (const date of outside) assert.equal(night.contains(date), false, date.toTimeString());
  });

  it("runs within one day (1-7): start inclusive, end exclusive", () => {
    const hours = IndexHours.fromConfig({ start: 1, end: 7 })!;
    assert.equal(hours.contains(at(0, 59)), false);
    assert.equal(hours.contains(at(1)), true);
    assert.equal(hours.contains(at(6, 59)), true);
    assert.equal(hours.contains(at(7)), false);
  });

  it("takes start = end as all day, with no next change", () => {
    const hours = new IndexHours(300, 300);
    assert.equal(hours.contains(at(4)), true);
    assert.equal(hours.nextChange(at(4)), null);
  });

  it("keeps minutes in 0..1439 (DigUp's init)", () => {
    assert.deepEqual([new IndexHours(-60, 1500).start, new IndexHours(-60, 1500).end], [1380, 60]);
  });

  it("gives the next end inside the hours and the next start outside them, across midnight", () => {
    const night = IndexHours.fromConfig({ start: 22, end: 7 })!;
    assert.equal(night.nextChange(at(23))!.getTime(), new Date(2026, 9, 16, 7).getTime());
    assert.equal(night.nextChange(at(3))!.getTime(), at(7).getTime());
    assert.equal(night.nextChange(at(12))!.getTime(), at(22).getTime());
    // Exactly at the start it's inside: the next change is the end.
    assert.equal(night.nextChange(at(22))!.getTime(), new Date(2026, 9, 16, 7).getTime());
    // Exactly at the end it's outside: the next change is tonight's start.
    assert.equal(night.nextChange(at(7))!.getTime(), at(22).getTime());
  });

  it("turns null hours into none", () => {
    assert.equal(IndexHours.fromConfig(null), null);
  });
});

type Settings = Pick<Config, "paused" | "indexHours" | "indexOnBattery">;
const settings = (over: Partial<Settings> = {}): Settings => ({
  paused: false,
  indexHours: null,
  indexOnBattery: true,
  ...over,
});

function recordingLog(): Log & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    info: (m) => lines.push(`info ${m}`),
    warn: (m) => lines.push(`warn ${m}`),
    error: (m) => lines.push(`error ${m}`),
  };
}

describe("Policy", () => {
  it("decides once the power state is read, then only on changes", async () => {
    let power: PowerStatus = { ...AC, onBattery: true };
    let reads = 0;
    const heard: Array<[PolicyHeld, number | null]> = [];
    const policy = new Policy(settings({ indexOnBattery: false }), {
      log: silentLog,
      power: async () => {
        reads++;
        return power;
      },
      onHeld: (held, until) => heard.push([held, until]),
    });
    await policy.start();
    assert.deepEqual(heard, [["on battery", null]]);
    await policy.refresh();
    assert.equal(heard.length, 1, "the same decision isn't told twice");
    power = AC;
    await policy.refresh();
    assert.deepEqual(heard.at(-1), [null, null]);
    assert.equal(reads, 3);
    policy.stop();
  });

  it("pauses at once, without waiting for a power read", async () => {
    const heard: PolicyHeld[] = [];
    const policy = new Policy(settings(), {
      log: silentLog,
      power: async () => AC,
      onHeld: (held) => heard.push(held),
    });
    await policy.start();
    policy.update(settings({ paused: true }));
    assert.deepEqual(heard, [null, "paused"]);
    policy.update(settings({ paused: true, indexHours: { start: 1, end: 2 } }));
    assert.deepEqual(heard, [null, "paused"], "paused still wins");
    policy.stop();
  });

  it("starts without the power state when the read is slow, and decides again when it lands", async () => {
    let answer!: (power: PowerStatus) => void;
    const heard: PolicyHeld[] = [];
    const policy = new Policy(settings(), {
      log: silentLog,
      power: () => new Promise((done) => (answer = done)),
      onHeld: (held) => heard.push(held),
      firstReadMs: 20,
    });
    await policy.start();
    assert.deepEqual(heard, [null]);
    answer({ ...AC, lowPower: true });
    await policy.refresh();
    assert.deepEqual(heard, [null, "Low Power Mode"]);
    policy.stop();
  });

  it("treats a failed read as no power hold and logs it once", async () => {
    const log = recordingLog();
    const heard: PolicyHeld[] = [];
    const policy = new Policy(settings({ indexOnBattery: false }), {
      log,
      power: async () => {
        throw new Error("helper missing");
      },
      onHeld: (held) => heard.push(held),
    });
    await policy.start();
    await policy.refresh();
    await policy.refresh();
    assert.deepEqual(heard, [null]);
    assert.equal(log.lines.filter((line) => line.includes("helper missing")).length, 1);
    policy.stop();
  });

  it("reads the power again when the Mac wakes (a jump in the wall clock)", async () => {
    let clock = at(12).getTime();
    let reads = 0;
    const log = recordingLog();
    const policy = new Policy(settings(), {
      log,
      power: async () => {
        reads++;
        return AC;
      },
      onHeld: () => {},
      now: () => clock,
      heartbeatMs: 20,
      wakeGapMs: 1000,
      intervalMs: 60_000,
    });
    await policy.start();
    assert.equal(reads, 1);
    clock += 2 * 60 * 60 * 1000; // two hours asleep
    await new Promise((done) => setTimeout(done, 60));
    assert.ok(reads >= 2, `reads: ${reads}`);
    assert.ok(log.lines.some((line) => line.includes("woke")));
    policy.stop();
  });

  it("holds outside the index hours with when they start, and lets go at the boundary", async () => {
    let clock = at(22).getTime() - 100; // 21:59:59.9
    const heard: Array<[PolicyHeld, number | null]> = [];
    const policy = new Policy(settings({ indexHours: { start: 22, end: 7 } }), {
      log: silentLog,
      power: async () => AC,
      onHeld: (held, until) => heard.push([held, until]),
      now: () => clock,
      heartbeatMs: 60_000,
      intervalMs: 60_000,
    });
    await policy.start();
    assert.deepEqual(heard, [["outside index hours", at(22).getTime()]]);
    clock = at(22).getTime() + 1000;
    // The boundary timer fires a second after 22:00 (0.1 s + 1 s from the start), with no tick or read in between.
    await new Promise((done) => setTimeout(done, 1300));
    assert.deepEqual(heard.at(-1), [null, null]);
    policy.stop();
  });

  it("does nothing once stopped", async () => {
    const heard: PolicyHeld[] = [];
    const policy = new Policy(settings(), {
      log: silentLog,
      power: async () => AC,
      onHeld: (held) => heard.push(held),
    });
    await policy.start();
    policy.stop();
    policy.update(settings({ paused: true }));
    await policy.refresh();
    assert.deepEqual(heard, [null]);
  });
});
