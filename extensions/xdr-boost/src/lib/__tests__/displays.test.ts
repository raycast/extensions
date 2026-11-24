import { describe, expect, it } from "vitest";
import {
  allLabel,
  allState,
  friendly,
  highestLevel,
  hud,
  matchDisplay,
  pauseLabel,
  shortLabel,
  statusSubtitle,
} from "../displays";
import type { HelperDisplay, HelperStatus } from "../helper";

function display(
  uuid: string,
  name: string,
  level: number,
  status: HelperDisplay["status"] = "boosted",
): HelperDisplay {
  return {
    uuid,
    id: 1,
    name,
    builtIn: uuid === "BI",
    potentialEDR: 16,
    currentEDR: 8,
    level,
    effectiveLevel: level,
    status: level <= 1 ? "off" : status,
  };
}
const state = (displays: HelperDisplay[], running = true): HelperStatus => ({
  running,
  allLevel: 1,
  levels: {},
  displays,
});
const BI = (l: number, s?: HelperDisplay["status"]) => display("BI", "Built-in Retina Display", l, s);
const XDR = (l: number, s?: HelperDisplay["status"]) => display("XDR", "Pro Display XDR", l, s);

describe("All Displays summary", () => {
  it("names a shared preset, says Custom for a shared custom level, Mixed otherwise", () => {
    expect(allState([BI(1.375), XDR(1.375)])).toEqual({ kind: "preset", index: 2 });
    expect(allState([BI(1.5), XDR(1.5)])).toEqual({ kind: "custom", index: 3 });
    expect(allState([BI(1), XDR(1.5625)])).toEqual({ kind: "mixed", index: 3 });
  });
  it("uses the highest level for the menu bar dial", () => {
    expect(highestLevel([BI(1.1875), XDR(1.75)])).toBe(1.75);
    expect(highestLevel([])).toBe(1);
  });
  it("never shows a custom number", () => {
    expect(shortLabel(1.5)).toBe("Custom");
    expect(shortLabel(1.0005)).toBe("Custom");
    expect(shortLabel(1.375)).toBe("Medium");
  });
});

describe("notification and HUD copy: relative words, never numbers", () => {
  it("speaks about your displays when they all end up the same", () => {
    expect(friendly(state([BI(1.5625), XDR(1.5625)]), "all")).toBe("Your displays are much brighter.");
    expect(friendly(state([BI(1), XDR(1)], false), "all")).toBe("Your displays are no longer boosted.");
  });
  it("names the display a per-display change touched", () => {
    expect(friendly(state([BI(1), XDR(1.1875)]), ["XDR"])).toBe("Pro Display XDR is a little brighter.");
    expect(friendly(state([BI(1), XDR(1.375)]), ["BI"])).toBe("Built-in Retina Display is no longer boosted.");
  });
  it("explains waiting and limited displays", () => {
    expect(friendly(state([BI(1.75), XDR(1.75, "waiting")]), ["XDR"])).toBe(
      "Pro Display XDR will brighten once it allows extra brightness.",
    );
    expect(friendly(state([BI(1), XDR(1.75, "limited")]), ["XDR"])).toBe(
      "Pro Display XDR is as bright as it can go right now.",
    );
  });
  it("HUD says Mixed, Custom, or the preset", () => {
    expect(hud(state([BI(1), XDR(1.5625)]))).toBe("XDR Boost: Mixed");
    expect(hud(state([BI(1.5), XDR(1.5)]))).toBe("XDR Boost: Custom");
    expect(hud(state([BI(1.75), XDR(1.75)]))).toBe("XDR Boost: Max");
    expect(hud(state([BI(1), XDR(1)], false))).toBe("XDR Boost Off");
  });
});

describe("H1: Max is 'at maximum boost', never 'as bright as it goes'", () => {
  it("an external XDR at a scaled Max", () => {
    expect(friendly(state([BI(1), XDR(1.75)]), ["XDR"])).toBe("Pro Display XDR is at maximum boost.");
    expect(friendly(state([BI(1.75), XDR(1.75)]), "all")).toBe("Your displays are at maximum boost.");
  });
});

describe("pause label", () => {
  const paused = (reasons: string[], running = true) => ({ ...state([BI(1.5)], running), pauseReasons: reasons });
  it("shows one reason in a stable order, only while the helper runs", () => {
    expect(pauseLabel(paused(["low-power-mode", "screen-locked"]))).toBe("Paused: Screen Locked");
    expect(pauseLabel(paused(["low-power-mode"]))).toBe("Paused: Low Power Mode");
    expect(pauseLabel(paused([]))).toBeUndefined();
    expect(pauseLabel(paused(["low-power-mode"], false))).toBeUndefined();
    expect(pauseLabel({ ...paused(["low-battery"]), lowBattery: 20 })).toBe("Paused: Battery Below 20%");
  });
});

describe("J4: a change made while paused is reported as saved, not applied", () => {
  it("notification and HUD", () => {
    const paused = { ...state([BI(1.5625, "paused"), XDR(1.5625, "paused")]), pauseReasons: ["low-power-mode"] };
    expect(friendly(paused, "all")).toBe("Boost set to High. It applies when this ends: Low Power Mode.");
    expect(hud(paused)).toBe("XDR Boost: High (Paused)");
  });
});

describe("matchDisplay (the AI tool's display argument)", () => {
  const displays = [BI(1), XDR(1.5)];
  it("matches by id first, then by name, case-insensitively", () => {
    expect(matchDisplay(displays, "xdr").uuid).toBe("XDR");
    expect(matchDisplay(displays, "pro display xdr").uuid).toBe("XDR");
  });
  it("lists the connected displays when nothing matches", () => {
    expect(() => matchDisplay(displays, "Studio")).toThrow(/No XDR display matches "Studio". Connected: Built-in/);
  });
  it("asks for the id when two displays share a name", () => {
    const twins = [display("A", "Pro Display XDR", 1), display("B", "Pro Display XDR", 1)];
    expect(() => matchDisplay(twins, "Pro Display XDR")).toThrow(/pass its id/);
    expect(matchDisplay(twins, "b").uuid).toBe("B");
  });
});

describe("allLabel", () => {
  it("names the preset, or says Custom or Mixed", () => {
    expect(allLabel(allState([BI(1.5625), XDR(1.5625)]))).toBe("High");
    expect(allLabel(allState([BI(1.5), XDR(1.5)]))).toBe("Custom");
    expect(allLabel(allState([BI(1.5625), XDR(1)]))).toBe("Mixed");
  });
});

describe("Toggle XDR Boost subtitle: the current state, read in root search", () => {
  it("says Off when nothing is boosted or the helper is not running", () => {
    expect(statusSubtitle(state([BI(1), XDR(1)], false))).toBe("Off");
    expect(statusSubtitle(state([BI(1), XDR(1)]))).toBe("Off");
  });
  it("names the level, Custom or Mixed, like the All Displays row", () => {
    expect(statusSubtitle(state([BI(1.5625), XDR(1.5625)]))).toBe("On · High");
    expect(statusSubtitle(state([BI(1.5), XDR(1.5)]))).toBe("On · Custom");
    expect(statusSubtitle(state([BI(1), XDR(1.75)]))).toBe("On · Mixed");
  });
  it("adds why the boost is paused", () => {
    expect(statusSubtitle({ ...state([BI(1.5625, "paused")]), pauseReasons: ["screen-locked"] })).toBe(
      "On · High · Screen Locked",
    );
    expect(statusSubtitle({ ...state([BI(1.75, "paused")]), pauseReasons: ["low-battery"], lowBattery: 20 })).toBe(
      "On · Max · Battery Below 20%",
    );
  });
  it("says when there is nothing to boost or the boost has no effect", () => {
    expect(statusSubtitle(state([], false))).toBe("No XDR Display");
    expect(statusSubtitle({ ...state([BI(1.5625)]), gammaSupported: false })).toBe("On · High · No Effect on This Mac");
  });
});
