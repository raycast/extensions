import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import {
  formatElevation,
  formatSnow,
  formatTemp,
  formatWind,
  formatWindAndGusts,
  fromDisplayElevation,
  toDisplayElevation,
} from "../src/lib/units";

const useUnits = (units: "metric" | "imperial") => {
  (globalThis as { raycastPreferences?: Preferences }).raycastPreferences = { units };
};

afterEach(() => useUnits("metric"));

describe("metric", () => {
  test("one decimal below 10, whole numbers above", () => {
    assert.equal(formatSnow(2.54), "2.5 cm");
    assert.equal(formatSnow(15.4), "15 cm");
  });

  test("missing values show a dash", () => {
    assert.equal(formatSnow(null), "–");
    assert.equal(formatTemp(undefined), "–");
  });

  test("temperature, elevation and wind", () => {
    assert.equal(formatTemp(-3.6), "-4°C");
    assert.equal(formatElevation(3041), "3,041 m");
    assert.equal(formatWind(25.4), "25 km/h");
    assert.equal(formatWindAndGusts(10, 25), "10, gusts 25 km/h");
  });
});

describe("imperial", () => {
  test("converts for display", () => {
    useUnits("imperial");
    assert.equal(formatSnow(25.4), "10 in");
    assert.equal(formatTemp(0), "32°F");
    assert.equal(formatElevation(1000), "3,281 ft");
    assert.equal(formatWind(100), "62 mph");
  });

  test("form elevations round-trip through feet", () => {
    useUnits("imperial");
    assert.equal(toDisplayElevation(3000), 9843);
    assert.equal(fromDisplayElevation(9843), 3000);
  });
});
