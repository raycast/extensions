import assert from "node:assert/strict";
import { test } from "node:test";
import { toolErrorText, toolOutput } from "./tool-output.ts";
import type { TimerInfo } from "./timer.ts";

const timers: TimerInfo[] = [
  { state: "running", kind: "focus", timeLeftSeconds: 742, durationSeconds: 1500, capped: false },
  { state: "paused", kind: "break", timeLeftSeconds: 60, durationSeconds: 300, capped: true },
  { state: "idle", kind: "none", timeLeftSeconds: 0, durationSeconds: 0, capped: false },
  { state: "finished", kind: "none", timeLeftSeconds: 0, durationSeconds: 0, capped: false },
];

// The AC's privacy pin: nothing about the person's sessions beyond the timer in
// flight (no intention, Stats, feelings, recap or history) reaches Raycast AI.
for (const timer of timers) {
  test(`toolOutput_${timer.state}${timer.kind}_isOnlyStateKindTimeLeftAndLength`, () => {
    assert.deepEqual(toolOutput(timer), {
      state: timer.state,
      kind: timer.kind,
      timeLeftSeconds: timer.timeLeftSeconds,
      durationSeconds: timer.durationSeconds,
    });
  });
}

test("toolOutput_aTimerCarryingMore_dropsEverythingElse", () => {
  const widened = { ...timers[0], intention: "Thesis", stats: [1, 2, 3] } as TimerInfo;
  assert.deepEqual(Object.keys(toolOutput(widened)).sort(), ["durationSeconds", "kind", "state", "timeLeftSeconds"]);
});

test("toolErrorText_titleAlone_isTheTitle", () => {
  assert.equal(toolErrorText({ title: "The timer is already paused." }), "The timer is already paused.");
});

test("toolErrorText_titleAndMessage_areOneSentenceAfterTheOther", () => {
  assert.equal(
    toolErrorText({ title: "Moment isn't installed on this Mac.", message: "Moment is on the Mac App Store." }),
    "Moment isn't installed on this Mac. Moment is on the Mac App Store.",
  );
});
