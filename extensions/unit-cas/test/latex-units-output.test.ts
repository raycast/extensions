import { describe, expect, test } from "vitest";
import { Context, DEFAULT_SETTINGS, calculate, suggestConversions, texUnit } from "../src/engine";
import { texToSvg } from "../src/lib/mathjax";

// LaTeX output for units uses the plain editor style: `0.6\ m`, `\frac{m}{s}`, `N\cdot m`.
// Inputs here are Nspire text so these tests don't depend on parsing the new LaTeX form.

const ctx = (): Context => ({ settings: { ...DEFAULT_SETTINGS }, vars: new Map(), funcs: new Map() });

function run(input: string) {
  const r = calculate(input, ctx());
  if (!r.ok) throw new Error(`${input}: ${r.error}`);
  return r;
}

const renders = (tex: string) => expect(() => texToSvg(tex, "#fff")).not.toThrow();

describe("texUnit", () => {
  test.each([
    ["m", "m"],
    ["Hz", "Hz"],
    ["kg", "kg"],
    ["km", "km"],
    ["Ω", "\\Omega"],
    ["kΩ", "k\\Omega"],
    ["μm", "\\mu m"],
    ["°C", "^{\\circ}C"],
    ["°", "^{\\circ}"],
    ["Å", "\\mathring{A}"],
  ])("%s -> %s", (name, tex) => {
    expect(texUnit(name)).toBe(tex);
    expect(texUnit(name)).not.toContain("\\mathrm");
    renders(`1\\ ${tex}`);
  });
});

describe("result LaTeX", () => {
  test.each([
    ["300_m/_s/(500_Hz)", "0.6\\ m"],
    ["0.6_m", "0.6\\ m"],
    ["3_m^2", "3\\ m^{2}"],
    ["5_km/(2_hr)", "0.694444\\ \\frac{m}{s}"],
    ["9.8_m/_s^2", "9.8\\ \\frac{m}{s^{2}}"],
    ["4186_J/(_kg*_K)", "4186\\ \\frac{m^{2}}{s^{2}\\cdot K}"],
    ["3_m*_m*_s", "3\\ m^{2}\\cdot s"],
    ["2_kΩ*3_mA", "6\\ V"],
    ["2_kΩ", "2000\\ \\Omega"],
    ["5_μm", "5\\cdot 10^{-6}\\ m"],
    ["x*2_s", "2x\\ s"],
    ["1/_s", "1\\ \\frac{1}{s}"],
  ])("%s -> %s", (input, tex) => {
    const out = run(input).result.latex;
    expect(out).toBe(tex);
    renders(out);
  });
});

describe("input echo LaTeX", () => {
  test.each([
    ["300_m/_s/(500_Hz)", "\\frac{\\frac{300\\ m}{s}}{500\\ Hz}"],
    ["5_km/(2_hr)", "\\frac{5\\ km}{2\\ h}"],
    ["5_N*_m", "5\\ N\\cdot m"],
    ["500_Hz", "500\\ Hz"],
    ["5_N*2_m", "5\\ N\\cdot 2\\ m"],
    ["4186_J/(_kg*_K)", "\\frac{4186\\ J}{kg\\cdot K}"],
    ["9.8_m/_s^2", "\\frac{9.8\\ m}{s^{2}}"],
    ["25_°C", "25^{\\circ}C"],
    ["30_°", "30^{\\circ}"],
    ["5_μm", "5\\ \\mu m"],
    ["2_kΩ*3_mA", "2\\ k\\Omega\\cdot 3\\ mA"],
    ["1_Å", "1\\ \\mathring{A}"],
    ["3_m►_ft", "3\\ m\\blacktriangleright ft"],
  ])("%s -> %s", (input, tex) => {
    const out = run(input).input.latex;
    expect(out).toBe(tex);
    renders(out);
  });
});

describe("conversion suggestions", () => {
  test("use the plain unit form and typeset", () => {
    const r = run("0.6_m");
    const sugg = suggestConversions(r.value, ctx()).map((c) => c.result.latex);
    expect(sugg).toContain("60\\ cm");
    for (const s of sugg) {
      expect(s).not.toContain("\\mathrm");
      renders(s);
    }
  });
  test("temperature", () => {
    const sugg = suggestConversions(run("25_°C").value, ctx()).map((c) => c.result.latex);
    expect(sugg).toContain("25^{\\circ}C");
    sugg.forEach(renders);
  });
});

describe("unchanged formatting", () => {
  test("non-unit identifiers", () => {
    expect(run("abc*3").result.latex).toBe("3\\mathit{abc}");
    expect(run("x_1*2").result.latex).toBe("2x_{1}");
    expect(run("solve(x^2+x-1=0,x)").result.latex).toBe(
      "x=\\frac{-1-\\sqrt{5}}{2}\\text{ or }x=\\frac{-1+\\sqrt{5}}{2}",
    );
  });
  test("Nspire output", () => {
    expect(run("300_m/_s/(500_Hz)").result.nspire).toBe("0.6*_m");
    expect(run("5_km/(2_hr)").result.nspire).toBe("0.694444*_m/_s");
  });
});

describe("physical constants", () => {
  test("keep \\mathrm so they stay distinct from variables", () => {
    expect(texUnit("Gc")).toBe("\\mathrm{G}");
    expect(texUnit("c")).toBe("\\mathrm{c_{0}}");
    const echo = run("_Gc*5.97E24_kg/(6.371E6_m)^2").input.latex;
    expect(echo).toContain("\\mathrm{G}");
    expect(echo).toContain("\\ kg");
    renders(echo);
  });
});
