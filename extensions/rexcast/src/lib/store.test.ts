import { describe, expect, it } from "vitest";
import { nextStore } from "./store";
import type { Stored } from "./block-state";

const s = (state: Stored["state"], unseen = false): Stored => ({ state, unseen });

describe("nextStore", () => {
  const prev = { "a|1": s("working"), "a|2": s("idle", true), "b|1": s("done", true), "c|1": s("idle") };

  it("replaces entries that were read again", () => {
    const next = nextStore(prev, { "a|1": s("idle", true) }, ["a", "b", "c"], ["b"]);
    expect(next["a|1"]).toEqual(s("idle", true));
  });
  it("keeps a session whose read failed this time", () => {
    const next = nextStore(prev, {}, ["a", "b", "c"], ["b"]);
    expect(next["b|1"]).toEqual(s("done", true));
  });
  it("drops sessions that were confirmed gone", () => {
    const next = nextStore(prev, {}, ["a", "b"], []);
    expect(Object.keys(next).some((k) => k.startsWith("c|"))).toBe(false);
  });
  it("does not carry over a pane that disappeared from a session read fine", () => {
    const next = nextStore(prev, { "a|1": s("idle") }, ["a", "b", "c"], []);
    expect(next["a|2"]).toBeUndefined();
  });
});
