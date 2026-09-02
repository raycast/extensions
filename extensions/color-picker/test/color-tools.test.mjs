import assert from "node:assert/strict";
import test from "node:test";
import analyzeContrast from "../src/tools/analyze-contrast.ts";
import generateColorScale from "../src/tools/generate-color-scale.ts";

test("color calculations", () => {
  assert.deepEqual(analyzeContrast({ foreground: "#000", background: "#fff" }).ratio, 21);

  const result = generateColorScale({ color: "#FF6363" });
  assert.equal(result.scale.length, 11);
  assert.deepEqual(result.scale[5], { label: 500, color: "#FF6363" });
});
