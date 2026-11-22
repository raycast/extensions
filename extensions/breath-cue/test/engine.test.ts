import { test } from "node:test";
import assert from "node:assert/strict";
import { applyOutcome, categorize, emptyState, tick, type Sample, type State } from "../src/lib/engine.ts";

const MIN = 60_000;
// 2026-03-10 10:00 local — inside active hours.
const T0 = new Date(2026, 2, 10, 10, 0, 0).getTime();

function s(over: Partial<Sample> = {}): Sample {
  return { app: "Xcode", bundleId: "com.apple.dt.Xcode", idleSeconds: 3, micInUse: false, screenLocked: false, overlayRunning: false, ...over };
}

function run(state: State, samples: Sample[], start: number) {
  const cues: { at: number; cue: string }[] = [];
  let st = state;
  samples.forEach((sample, i) => {
    const now = start + i * MIN;
    const r = tick(st, sample, now);
    st = r.state;
    if (r.cue) cues.push({ at: i, cue: r.cue });
  });
  return { state: st, cues };
}

test("categorizes common apps", () => {
  assert.equal(categorize("com.microsoft.VSCode"), "focus");
  assert.equal(categorize("com.jetbrains.intellij"), "focus");
  assert.equal(categorize("com.tinyspeck.slackmacgap"), "comms");
  assert.equal(categorize("com.google.Chrome"), "browse");
  assert.equal(categorize("us.zoom.xos"), "meeting");
  assert.equal(categorize("com.unknown.app"), "other");
});

test("no cue in the first 49 minutes of focus", () => {
  const { cues } = run(emptyState(T0), Array.from({ length: 49 }, () => s()), T0);
  assert.deepEqual(cues, []);
});

test("long focus cues at the next natural pause after the threshold", () => {
  const samples = Array.from({ length: 55 }, () => s());
  samples[53] = s({ idleSeconds: 40 }); // user pauses to think
  const { cues } = run(emptyState(T0), samples, T0);
  assert.deepEqual(cues, [{ at: 53, cue: "long-focus" }]);
});

test("long focus forces a cue when there is never a pause", () => {
  const { cues } = run(emptyState(T0), Array.from({ length: 95 }, () => s()), T0);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].cue, "long-focus");
  assert.equal(cues[0].at, 90);
});

test("a 5-minute break resets the focus streak", () => {
  const samples = [
    ...Array.from({ length: 40 }, () => s()),
    s({ idleSeconds: 320 }),
    ...Array.from({ length: 40 }, () => s()),
  ];
  const { cues } = run(emptyState(T0), samples, T0);
  assert.deepEqual(cues, []);
});

test("post-call cue right after a long call, never during it", () => {
  const samples = [
    ...Array.from({ length: 30 }, () => s({ app: "Zoom", bundleId: "us.zoom.xos", micInUse: true })),
    s({ app: "Slack", bundleId: "com.tinyspeck.slackmacgap" }),
    s({ app: "Slack", bundleId: "com.tinyspeck.slackmacgap" }),
    s({ app: "Slack", bundleId: "com.tinyspeck.slackmacgap" }),
  ];
  const { cues, state } = run(emptyState(T0), samples, T0);
  assert.deepEqual(cues, [{ at: 31, cue: "post-call" }]);
  assert.equal(state.lastCall?.minutes, 30);
});

test("short calls don't trigger a cue", () => {
  const samples = [
    ...Array.from({ length: 5 }, () => s({ micInUse: true })),
    ...Array.from({ length: 4 }, () => s({ app: "Slack", bundleId: "com.tinyspeck.slackmacgap" })),
  ];
  assert.deepEqual(run(emptyState(T0), samples, T0).cues, []);
});

test("scattered switching across many apps cues once", () => {
  const apps = ["com.tinyspeck.slackmacgap", "com.google.Chrome", "ru.keepcoder.Telegram", "com.apple.mail", "com.apple.Notes"];
  const samples = Array.from({ length: 30 }, (_, i) => s({ app: "x", bundleId: apps[i % apps.length] }));
  const { cues } = run(emptyState(T0), samples, T0);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].cue, "scattered");
});

test("quiet hours, pause and do-not-disturb apps block cues", () => {
  const night = new Date(2026, 2, 10, 23, 30).getTime();
  assert.deepEqual(run(emptyState(night), Array.from({ length: 100 }, () => s()), night).cues, []);

  const paused = { ...emptyState(T0), pausedUntil: T0 + 200 * MIN };
  assert.deepEqual(run(paused, Array.from({ length: 100 }, () => s()), T0).cues, []);

  const keynote = Array.from({ length: 100 }, (_, i) => (i < 60 ? s() : s({ bundleId: "com.apple.iWork.Keynote", app: "Keynote" })));
  // Keynote is focus work too, but presenting must never be interrupted.
  assert.deepEqual(run(emptyState(T0), keynote, T0).cues.filter((c) => c.at >= 60), []);
});

test("skipping makes it back off, finishing makes it a little more eager", () => {
  let st = emptyState(T0);
  st.cues.push({ at: T0, reason: "long-focus" });
  st = applyOutcome(st, { reason: "long-focus", completed: false, shownSeconds: 3, endedAt: T0 + 1 });
  assert.equal(st.cooldownMin, 63);
  assert.equal(st.focusThresholdMin, 65);
  assert.equal(st.skipStreak["long-focus"], 1);
  assert.equal(st.cues[0].outcome, "skipped");

  st = applyOutcome(st, { reason: "long-focus", completed: true, shownSeconds: 70, endedAt: T0 + 2 });
  assert.equal(st.cooldownMin, 57);
  assert.equal(st.skipStreak["long-focus"], 0);

  // Same outcome file read twice is ignored.
  assert.equal(applyOutcome(st, { reason: "long-focus", completed: true, shownSeconds: 70, endedAt: T0 + 2 }), st);
});

test("three skips in a row mute that kind of cue for the day", () => {
  const st = emptyState(T0);
  st.skipStreak["long-focus"] = 3;
  assert.deepEqual(run(st, Array.from({ length: 100 }, () => s()), T0).cues, []);
});

test("cooldown keeps cues apart", () => {
  const samples = Array.from({ length: 140 }, () => s());
  const { cues } = run(emptyState(T0), samples, T0);
  assert.ok(cues.length >= 1);
  for (let i = 1; i < cues.length; i++) assert.ok(cues[i].at - cues[i - 1].at >= 45);
});
