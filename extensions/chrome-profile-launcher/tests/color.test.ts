import { describe, expect, it } from "vitest";
import { decodeChromeColor, generatedColor } from "../src/lib/chrome-color";

describe("decodeChromeColor", () => {
  it("decodes real profile_color_seed values from this machine", () => {
    expect(decodeChromeColor(-16033840)).toBe("#0B57D0"); // Default
    expect(decodeChromeColor(-14244198)).toBe("#26A69A"); // catapult.vc
    expect(decodeChromeColor(-10395126)).toBe("#61620A"); // John
    expect(decodeChromeColor(-7558172)).toBe("#8CABE4");
    expect(decodeChromeColor(-2231047)).toBe("#DDF4F9");
  });

  it("returns undefined for missing / zero / non-finite values", () => {
    expect(decodeChromeColor(undefined)).toBeUndefined();
    expect(decodeChromeColor(0)).toBeUndefined();
    expect(decodeChromeColor(Number.NaN)).toBeUndefined();
    expect(decodeChromeColor(Infinity)).toBeUndefined();
  });

  it("preserves opaque black (a valid color, not an unset value)", () => {
    expect(decodeChromeColor(-16777216)).toBe("#000000"); // 0xFF000000
  });
});

describe("generatedColor", () => {
  it("is deterministic for a given directory", () => {
    expect(generatedColor("Profile 3")).toBe(generatedColor("Profile 3"));
  });

  it("always returns a valid #RRGGBB hex", () => {
    for (const dir of ["Default", "Profile 1", "Andy", "Person 1"]) {
      expect(generatedColor(dir)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
