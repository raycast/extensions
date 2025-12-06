// PMF utility tests

import { coerceNumber, normalizeProbability, summarizePmfPayload } from "../src/utils/pmf";

describe("coerceNumber", () => {
  test("returns number for valid input", () => {
    expect(coerceNumber(5)).toBe(5);
    expect(coerceNumber(3.14)).toBe(3.14);
  });

  test("returns null for invalid input", () => {
    expect(coerceNumber(null)).toBe(null);
    expect(coerceNumber(undefined)).toBe(null);
    expect(coerceNumber(NaN)).toBe(null);
    expect(coerceNumber(Infinity)).toBe(null);
  });

  test("parses string numbers", () => {
    expect(coerceNumber("42")).toBe(42);
    expect(coerceNumber("3.14")).toBe(3.14);
  });
});

describe("normalizeProbability", () => {
  test("normalizes valid probabilities", () => {
    expect(normalizeProbability(0.5)).toBe(0.5);
    expect(normalizeProbability(1)).toBe(1);
    expect(normalizeProbability(0)).toBe(0);
  });

  test("clamps negative values to 0", () => {
    expect(normalizeProbability(-0.5)).toBe(0);
  });

  test("returns 0 for invalid input", () => {
    expect(normalizeProbability(null)).toBe(0);
    expect(normalizeProbability("abc")).toBe(0);
  });
});

describe("summarizePmfPayload", () => {
  test("formats valid PMF", () => {
    const payload = {
      pmfs: [
        {
          bins: [
            { value: 1, probability: 0.5 },
            { value: 2, probability: 0.5 },
          ],
          mean: 1.5,
          std_dev: 0.5,
          variance: 0.25,
          iqr: 0.5,
          quantiles: [],
        },
      ],
    };
    const summary = summarizePmfPayload(payload);
    expect(summary).toContain("mean 1.50");
    expect(summary).toContain("range 1..2");
  });

  test("handles empty PMF", () => {
    const payload = { pmfs: [] };
    const summary = summarizePmfPayload(payload);
    expect(summary).toBe("PMF available");
  });
});
