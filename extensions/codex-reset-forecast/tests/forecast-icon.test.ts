import { describe, expect, it } from "vitest";
import { forecastIconAsset, forecastIconLevel } from "../src/domain/forecast-icon";

describe("forecast icon", () => {
  it("maps likelihood to the nearest quarter", () => {
    expect(forecastIconLevel(-5)).toBe(0);
    expect(forecastIconLevel(12)).toBe(0);
    expect(forecastIconLevel(13)).toBe(25);
    expect(forecastIconLevel(62)).toBe(50);
    expect(forecastIconLevel(64)).toBe(75);
    expect(forecastIconLevel(88)).toBe(100);
    expect(forecastIconLevel(140)).toBe(100);
  });

  it("returns the bundled asset name", () => {
    expect(forecastIconAsset(64)).toBe("forecast-agent-75.svg");
  });
});
