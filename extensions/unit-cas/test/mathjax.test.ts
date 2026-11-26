import { expect, test } from "vitest";
import { texToSvg } from "../src/lib/mathjax";
test("renders", () => {
  const svg = texToSvg("x=\\frac{-1-\\sqrt{5}}{2}\\text{ or }5^{\\circ}C\\blacktriangleright \\mu m+0.6\\ m", "#fff");
  expect(svg).toMatch(/^<svg/);
  expect(svg).toContain('fill="#fff"');
  expect(svg).toMatch(/width="[\d.]+"/);
});
