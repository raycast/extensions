import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateTargetSizePlan, supportsTargetSize, trimmedDuration } from "../../src/utils/targetSize";

describe("target-size planning", () => {
  it("calculates a bounded video bitrate with muxing allowance", () => {
    const plan = calculateTargetSizePlan(10, 60);
    assert.equal(plan.audioBitrateKbps, 128);
    assert.ok(plan.videoBitrateKbps > 1100 && plan.videoBitrateKbps < 1300);
    assert.ok(plan.estimatedBytes < 10 * 1024 * 1024);
  });

  it("accounts for trim duration", () => {
    assert.equal(trimmedDuration(120, { start: "10", end: "40" }), 30);
  });

  it("rejects impractically small targets", () => {
    assert.throws(() => calculateTargetSizePlan(1, 600), /too small/);
  });

  it("supports every video output with a bitrate-based encoder", () => {
    for (const format of [".mp4", ".mkv", ".webm", ".avi", ".mpg"] as const) {
      assert.equal(supportsTargetSize(format), true);
    }
    assert.equal(supportsTargetSize(".mov"), false);
    assert.equal(supportsTargetSize(".gif"), false);
  });
});
