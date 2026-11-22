import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addTime,
  finishTimer,
  flowStartedAt,
  flowStoppedAt,
  newTimer,
  pauseTimer,
  restartTimer,
  resumeTimer,
} from "../src/lib/state.ts";

const MIN = 60_000;

describe("flow timestamps for the dial transitions", () => {
  it("a new timer flows from its start", () => {
    const t = newTimer(5 * MIN, 1000, undefined, "id", "tok");
    assert.equal(flowStartedAt(t), 1000);
    assert.equal(flowStoppedAt(t), undefined);
  });

  it("pause records when the flow stopped, resume when it started again", () => {
    const paused = pauseTimer(newTimer(5 * MIN, 1000, undefined, "id", "tok"), 4000);
    assert.equal(flowStoppedAt(paused), 4000);
    const resumed = resumeTimer(paused, 9000, "tok2");
    assert.equal(flowStartedAt(resumed), 9000);
    assert.equal(flowStoppedAt(resumed), undefined);
  });

  it("finishing stops the flow at the finish time", () => {
    const finished = finishTimer(newTimer(MIN, 0, undefined, "id", "tok"), MIN);
    assert.equal(flowStoppedAt(finished), MIN);
  });

  it("restart and snooze start a fresh flow, forgetting old pause/resume times", () => {
    const resumed = resumeTimer(pauseTimer(newTimer(5 * MIN, 0, undefined, "id", "tok"), 1000), 2000, "t2");
    const restarted = restartTimer(resumed, 50_000, "t3");
    assert.equal(flowStartedAt(restarted), 50_000);
    assert.equal(restarted.pausedAt, undefined);

    const snoozed = addTime(finishTimer(resumed, 300_000), 5 * MIN, 310_000, "t4");
    assert.equal(flowStartedAt(snoozed), 310_000);
    assert.equal(snoozed.resumedAt, undefined);
  });
});
