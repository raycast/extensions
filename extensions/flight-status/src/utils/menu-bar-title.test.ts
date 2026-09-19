import { describe, it, expect } from "vitest";
import { buildMenuBarTitle } from "./menu-bar-title";

describe("buildMenuBarTitle", () => {
  it("shows all parts: flight + status + ETA", () => {
    expect(
      buildMenuBarTitle("DL389", "Cruising", "~2h 15m", true, true, true),
    ).toBe("DL389: Cruising • ~2h 15m");
  });

  it("shows flight + status (no ETA)", () => {
    expect(
      buildMenuBarTitle("DL389", "Cruising", "~2h 15m", true, true, false),
    ).toBe("DL389: Cruising");
  });

  it("shows flight + ETA (no status)", () => {
    expect(
      buildMenuBarTitle("DL389", "Cruising", "~2h 15m", true, false, true),
    ).toBe("DL389 • ~2h 15m");
  });

  it("shows status + ETA (no flight number)", () => {
    expect(
      buildMenuBarTitle("DL389", "Cruising", "~2h 15m", false, true, true),
    ).toBe("Cruising • ~2h 15m");
  });

  it("shows flight only", () => {
    expect(
      buildMenuBarTitle("DL389", "Cruising", "~2h 15m", true, false, false),
    ).toBe("DL389");
  });

  it("shows status only", () => {
    expect(
      buildMenuBarTitle("DL389", "Cruising", "~2h 15m", false, true, false),
    ).toBe("Cruising");
  });

  it("shows ETA only", () => {
    expect(
      buildMenuBarTitle("DL389", "Cruising", "~2h 15m", false, false, true),
    ).toBe("~2h 15m");
  });

  it("returns empty string when all toggles off", () => {
    expect(
      buildMenuBarTitle("DL389", "Cruising", "~2h 15m", false, false, false),
    ).toBe("");
  });

  it("handles null statusText with showStatus on", () => {
    expect(buildMenuBarTitle("DL389", null, "~2h 15m", true, true, true)).toBe(
      "DL389 • ~2h 15m",
    );
  });

  it("handles null etaText with showEta on", () => {
    expect(buildMenuBarTitle("DL389", "Cruising", null, true, true, true)).toBe(
      "DL389: Cruising",
    );
  });

  it("handles both null statusText and etaText", () => {
    expect(buildMenuBarTitle("DL389", null, null, true, true, true)).toBe(
      "DL389",
    );
  });

  it("returns empty string when all values null and flight number off", () => {
    expect(buildMenuBarTitle("DL389", null, null, false, true, true)).toBe("");
  });
});
