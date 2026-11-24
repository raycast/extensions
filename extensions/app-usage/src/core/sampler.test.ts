import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tick } from "./sampler";
import type { AppRef, SamplerState } from "./types";

const MINUTE = 60_000;
const OPTS = { maxGapMs: 2 * MINUTE };
const T = 1_789_600_000_000;

const chrome: AppRef = { key: "com.google.Chrome", name: "Google Chrome" };
const code: AppRef = { key: "com.microsoft.VSCode", name: "Visual Studio Code" };

function stateAt(at: number, app: AppRef = chrome): SamplerState {
  return { v: 1, lastAt: at, lastKey: app.key, lastName: app.name };
}

describe("tick", () => {
  it("records nothing on the first ever run but remembers the app", () => {
    const { slice, nextState } = tick(T, chrome, 0, null, OPTS);
    assert.equal(slice, null);
    assert.equal(nextState.lastKey, chrome.key);
    assert.equal(nextState.lastAt, T);
  });

  it("attributes a full active interval to the previous app", () => {
    const { slice } = tick(T, chrome, 0, stateAt(T - MINUTE), OPTS);
    assert.equal(slice?.app?.key, chrome.key);
    assert.equal(slice?.app?.seconds, 60);
    assert.equal(slice?.idleSeconds, 0);
    assert.equal(slice?.at, T - MINUTE, "should bucket at the start of the window");
  });

  it("attributes to the previous app, not the one now in front", () => {
    const { slice, nextState } = tick(T, code, 0, stateAt(T - MINUTE, chrome), OPTS);
    assert.equal(slice?.app?.key, chrome.key, "the window belonged to Chrome");
    assert.equal(nextState.lastKey, code.key, "but the next window belongs to Code");
  });

  it("records the whole window as idle when the user was away throughout", () => {
    const { slice } = tick(T, chrome, 120, stateAt(T - MINUTE), OPTS);
    assert.equal(slice?.app, null, "no application earned this time");
    assert.equal(slice?.idleSeconds, 60, "but the minute still passed at the machine");
  });

  it("splits a window the user walked away partway through", () => {
    const { slice } = tick(T, chrome, 20, stateAt(T - MINUTE), OPTS);
    assert.equal(slice?.app?.seconds, 40);
    assert.equal(slice?.idleSeconds, 20);
  });

  it("never turns a one-minute window into 61 seconds through rounding", () => {
    // 29.5s active and 30.5s idle each round up on their own.
    const { slice } = tick(T, chrome, 30.5, stateAt(T - MINUTE), OPTS);
    assert.equal((slice?.app?.seconds ?? 0) + (slice?.idleSeconds ?? 0), 60);
  });

  it("never reports more idle than the window itself", () => {
    const { slice } = tick(T, chrome, 3600, stateAt(T - MINUTE), OPTS);
    assert.equal(slice?.idleSeconds, 60);
  });

  it("clamps a sleep gap even when idle reads as zero after a mouse wake", () => {
    const eightHours = 8 * 60 * MINUTE;
    const { slice } = tick(T, chrome, 0, stateAt(T - eightHours), OPTS);
    assert.equal(slice?.app?.seconds, 120, "must clamp to maxGapMs, not credit eight hours");
  });

  it("clamps an overnight gap that also reads as idle", () => {
    const eightHours = 8 * 60 * MINUTE;
    const { slice } = tick(T, chrome, 8 * 3600, stateAt(T - eightHours), OPTS);
    assert.equal(slice?.app, null);
    assert.equal(slice?.idleSeconds, 120, "the gap is clamped, so eight hours cannot land as idle");
  });

  it("records nothing when the clock moves backwards", () => {
    const { slice } = tick(T, chrome, 0, stateAt(T + MINUTE), OPTS);
    assert.equal(slice, null);
  });

  it("records nothing at all after an excluded app, not even the idle beside it", () => {
    // An unexplained block of idle would betray that something was running.
    const blank: SamplerState = { v: 1, lastAt: T - MINUTE, lastKey: "", lastName: "" };
    const { slice } = tick(T, chrome, 30, blank, OPTS);
    assert.equal(slice, null);
  });

  it("stores nothing about an excluded app, not even its name", () => {
    const { nextState } = tick(T, null, 0, stateAt(T - MINUTE), OPTS);
    assert.equal(nextState.lastKey, "");
    assert.equal(nextState.lastName, "");
  });

  it("treats a negative idle reading as zero", () => {
    const { slice } = tick(T, chrome, -5, stateAt(T - MINUTE), OPTS);
    assert.equal(slice?.app?.seconds, 60);
    assert.equal(slice?.idleSeconds, 0);
  });

  it("drops a sub-second active remainder but keeps the idle it sat in", () => {
    const { slice } = tick(T, chrome, 59.8, stateAt(T - MINUTE), OPTS);
    assert.equal(slice?.app, null, "0.2s is not worth a row");
    assert.equal(slice?.idleSeconds, 60);
  });

  it("writes nothing for a window too short to round to a second", () => {
    const { slice } = tick(T, chrome, 0, stateAt(T - 400), OPTS);
    assert.equal(slice, null);
  });
});
