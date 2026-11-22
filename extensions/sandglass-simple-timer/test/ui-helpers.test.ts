import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { durationTitle, hourFraction, plainDurationTitle } from "../src/components/helpers.ts";

const MIN = 60_000;

describe("durationTitle", () => {
  it("uses single units", () => {
    assert.equal(durationTitle(12 * MIN), "12-Minute");
    assert.equal(durationTitle(60 * MIN), "1-Hour");
    assert.equal(durationTitle(120 * MIN), "2-Hour");
    assert.equal(durationTitle(30_000), "30-Second");
  });
  it("falls back to short format for mixed units", () => {
    assert.equal(durationTitle(90 * MIN), "1 h 30 min");
    assert.equal(durationTitle(90_000), "1 min 30 sec");
  });
});

describe("plainDurationTitle", () => {
  it("pluralizes", () => {
    assert.equal(plainDurationTitle(MIN), "1 Minute");
    assert.equal(plainDurationTitle(25 * MIN), "25 Minutes");
    assert.equal(plainDurationTitle(60 * MIN), "1 Hour");
    assert.equal(plainDurationTitle(90 * MIN), "1 h 30 min");
  });
});

describe("hourFraction", () => {
  it("clamps", () => {
    assert.equal(hourFraction(30 * MIN), 0.5);
    assert.equal(hourFraction(300 * MIN), 1);
  });
});
