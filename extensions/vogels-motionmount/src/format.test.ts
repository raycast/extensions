import { describe as suite, expect, it } from "vitest";
import { clamp, describe, isAt, nudge } from "./format";

suite("describe", () => {
  it("says the TV is against the wall when retracted, since rotation is meaningless there", () => {
    expect(describe({ distance: 0, rotation: 0 })).toBe("Against the wall");
  });

  it("names the side the TV turns to, because negative numbers mean nothing to a user", () => {
    expect(describe({ distance: 95, rotation: -86 })).toBe("Distance 95 · 86 left");
    expect(describe({ distance: 40, rotation: 20 })).toBe("Distance 40 · 20 right");
  });

  it("says straight when extended without rotation", () => {
    expect(describe({ distance: 60, rotation: 0 })).toBe("Distance 60 · straight");
  });
});

suite("clamp", () => {
  it("keeps distance inside the motor range", () => {
    expect(clamp({ distance: 130, rotation: 0 })).toEqual({ distance: 100, rotation: 0 });
    expect(clamp({ distance: -10, rotation: 0 })).toEqual({ distance: 0, rotation: 0 });
  });

  it("limits rotation to distance like the mount does, so the remote shows where the TV really ends up", () => {
    expect(clamp({ distance: 30, rotation: -80 })).toEqual({ distance: 30, rotation: -30 });
  });
});

suite("nudge", () => {
  it("moves one step in the requested direction", () => {
    expect(nudge({ distance: 40, rotation: 0 }, "extend")).toEqual({ distance: 50, rotation: 0 });
    expect(nudge({ distance: 40, rotation: 0 }, "left")).toEqual({ distance: 40, rotation: -10 });
    expect(nudge({ distance: 40, rotation: 0 }, "right")).toEqual({ distance: 40, rotation: 10 });
  });

  it("straightens the TV when retracting past its rotation, because it cannot stay turned that close to the wall", () => {
    expect(nudge({ distance: 20, rotation: -20 }, "retract")).toEqual({ distance: 10, rotation: -10 });
  });

  it("does not turn while against the wall", () => {
    expect(nudge({ distance: 0, rotation: 0 }, "right")).toEqual({ distance: 0, rotation: 0 });
  });
});

suite("isAt", () => {
  it("recognizes a preset even when the motors stop a couple of steps away from it", () => {
    expect(isAt({ distance: 95, rotation: -88 }, { distance: 95, rotation: -86 })).toBe(true);
  });

  it("does not mark a preset the TV is clearly away from", () => {
    expect(isAt({ distance: 31, rotation: -28 }, { distance: 95, rotation: -86 })).toBe(false);
    expect(isAt({ distance: 95, rotation: -70 }, { distance: 95, rotation: -86 })).toBe(false);
  });
});
