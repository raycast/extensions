import assert from "node:assert/strict";
import test from "node:test";
import analyzeContrast from "../src/tools/analyze-contrast.ts";
import generateColorScale from "../src/tools/generate-color-scale.ts";
import { formatColor } from "../src/lib/color-format.ts";

test("color calculations", () => {
  assert.deepEqual(analyzeContrast({ foreground: "#000", background: "#fff" }).ratio, 21);

  const result = generateColorScale({ color: "#FF6363" });
  assert.equal(result.scale.length, 11);
  assert.deepEqual(result.scale[5], { label: 500, color: "#FF6363" });
});

test("oklch previews keep alpha", () => {
  assert.equal(formatColor("rgba(87, 99, 237, 0.5)", "oklch"), "oklch(56.943% 0.20528 274.1 / 0.5)");
  assert.equal(formatColor("hsla(235, 80%, 63%, 0.25)", "oklch"), "oklch(56.544% 0.2061 273.83 / 0.25)");
});

test("oklch previews of grayscale colors have no NaN hue", () => {
  for (const color of ["#000000", "#808080", "#ffffff"]) {
    const result = formatColor(color, "oklch");
    assert.ok(!result.includes("NaN"), `${color} produced ${result}`);
  }
});
