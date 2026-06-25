import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HSLtoHEXA, HSLtoRGBA } from "./colorsConversion.ts";

describe("HSLtoRGBA", () => {
  it("converts with alpha as decimal number", () => {
    const result = HSLtoRGBA([10, 10, 10, "0.1"]);
    assert.deepEqual(result, [28, 24, 23, 0.1]);
  });

  it("converts with alpha as percentage string", () => {
    const result = HSLtoRGBA([10, 10, 10, "10%"]);
    assert.deepEqual(result, [28, 24, 23, 0.1]);
  });

  it("percentage and decimal alpha produce the same rgba", () => {
    const fromDecimal = HSLtoRGBA([10, 10, 10, "0.1"]);
    const fromPercent = HSLtoRGBA([10, 10, 10, "10%"]);
    assert.deepEqual(fromDecimal, fromPercent);
  });
});

describe("HSLtoHEXA", () => {
  it("converts hsl to hex with embedded alpha (alpha derived from chroma, not a 4th param)", () => {
    const result = HSLtoHEXA([120, 100, 25, "0.5"]);
    assert.equal(result, "#00800080");
  });

  it("converts fully-saturated mid-lightness green", () => {
    const result = HSLtoHEXA([120, 100, 25, "50%"]);
    assert.equal(result, "#00800080");
  });
});
