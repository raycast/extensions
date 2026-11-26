import { describe, expect, test } from "vitest";
import { Context, DEFAULT_SETTINGS, Settings, calculate, translate } from "../src/engine";

const ctx = (s: Partial<Settings> = {}): Context => ({
  settings: { ...DEFAULT_SETTINGS, ...s },
  vars: new Map(),
  funcs: new Map(),
});

function nspire(input: string): string {
  const r = calculate(input, ctx());
  if (!r.ok) throw new Error(`${input}: ${r.error}`);
  return r.result.nspire;
}

function tr(input: string): string {
  const r = translate(input, ctx());
  if ("ok" in r && r.ok === false) throw new Error(`${input}: ${r.error}`);
  return (r as { nspire: string }).nspire;
}

describe("bare-letter units after an explicit LaTeX space", () => {
  test("fraction of units from a math editor matches the Nspire input", () => {
    const src = String.raw`\frac{300\ \frac{m}{s}}{500\ Hz}`;
    expect(tr(src)).toBe("300*_m/_s/(500*_Hz)");
    expect(nspire(src)).toBe("0.6*_m");
    expect(nspire("((((300*_m)/(_s)))/(500*_Hz))")).toBe("0.6*_m");
  });

  test.each([
    [String.raw`3\ m`, "3*_m"],
    [String.raw`5\ \mathrm{m}`, "5*_m"],
    [String.raw`0.6\ m`, "0.6*_m"],
    [String.raw`500\ Hz`, "500*_Hz"],
    [String.raw`3\,km`, "3*_km"],
    [String.raw`2\;kg`, "2*_kg"],
    [String.raw`2\:mol`, "2*_mol"],
    [String.raw`2~mol`, "2*_mol"],
    [String.raw`9.81\ \frac{m}{s^{2}}`, "9.81*_m/_s^2"],
    [String.raw`5\ N\cdot m`, "5*(_N*_m)"],
    [String.raw`3\ m^{2}`, "3*_m^2"],
    [String.raw`2\ \Omega`, "2*_Ω"],
    [String.raw`4\ \mu m`, "4*_μm"],
    [String.raw`20\ ^{\circ}C`, "20*_°C"],
    [String.raw`90\ ^{\circ}`, "90*_°"],
    [String.raw`1\ \frac{J}{kg\cdot K}`, "1*_J/(_kg*_K)"],
    [String.raw`3\ m/s`, "3*_m/_s"],
    [String.raw`(1+2)\ kg`, "(1+2)*_kg"],
    [String.raw`3\ m+2\ m`, "3*_m+2*_m"],
    [String.raw`5\ \mu m`, "5*_μm"],
    [String.raw`1\ \mathring{A}`, "1*_Å"],
    [String.raw`30^{\circ}`, "30*_°"],
    [String.raw`3\ m^{2}\cdot s`, "3*(_m^2*_s)"],
    [String.raw`5\ N\cdot 2\ m`, "5*_N*2*_m"],
    [String.raw`2\ k\Omega\cdot 3\ mA`, "2*_kΩ*3*_mA"],
    [String.raw`v=\frac{3\ m}{s}`, "v=3*_m/_s"],
    [String.raw`\frac{4186\ J}{kg\cdot K}`, "4186*_J/(_kg*_K)"],
    [String.raw`\frac{5\ km}{2\ hr}`, "5*_km/(2*_hr)"],
    [String.raw`3\ km\blacktriangleright mi`, "3*_km►_mi"],
    [String.raw`25^{\circ}C\blacktriangleright ^{\circ}F`, "25*_°C►_°F"],
    [String.raw`\operatorname{tmpCnv}\left(100^{\circ}C,^{\circ}F\right)`, "tmpCnv(100*_°C,_°F)"],
  ])("%s translates to %s", (src, expected) => {
    expect(tr(src)).toBe(expected);
  });

  test.each([
    [String.raw`3\ m`, "3*_m"],
    [String.raw`0.6\ m`, "0.6*_m"],
    [String.raw`9.81\ \frac{m}{s^{2}}`, "9.81*_m/_s^2"],
    [String.raw`3\ m^{2}`, "3*_m^2"],
    [String.raw`2\ \Omega`, "2*_Ω"],
    [String.raw`5\ N\cdot m`, "5*_J"],
    [String.raw`3\ m+2\ m`, "5*_m"],
    [String.raw`2\ k\Omega\cdot 3\ mA`, "6*_V"],
    [String.raw`5\ N\cdot 2\ m`, "10*_J"],
    [String.raw`25^{\circ}C\blacktriangleright ^{\circ}F`, "77*_°F"],
  ])("%s evaluates to %s", (src, expected) => {
    expect(nspire(src)).toBe(expected);
  });

  test.each([
    [String.raw`2\ x`, "2*x"],
    [String.raw`3\ ab`, "3*a*b"],
    [String.raw`3\ m\ x`, "3*m*x"],
    [String.raw`3\ m\cdot x`, "3*m*x"],
    [String.raw`2\ m_e`, "2*m_e"],
    [String.raw`\frac{3\ x}{s}`, "3*x/s"],
    [String.raw`\frac{3\ m}{x}`, "3*_m/x"],
    ["3m", "3*m"],
    ["2x", "2*x"],
    [String.raw`\int_{0}^{1} 2\ dt`, "nInt(2,t,0,1)"],
  ])("%s keeps variables (%s)", (src, expected) => {
    expect(tr(src)).toBe(expected);
  });
});

describe("multi-letter units glued to a number", () => {
  test("speed squared over g matches the Nspire input", () => {
    expect(nspire(String.raw`\frac{(50km/h)^2}{_g}`)).toBe("19.6705*_m");
    expect(nspire("(((((50*_km)/(_hr)))^(2))/(_g))")).toBe("19.6705*_m");
  });

  test.each([
    [String.raw`\frac{(500km/h)^2}{_g}`, "(500*_km/_hr)^2/_g"],
    [String.raw`\frac{3km}{h}`, "3*_km/_hr"],
    [String.raw`2kg\cdot m`, "2*(_kg*_m)"],
    [String.raw`5km\blacktriangleright mi`, "5*_km►_mi"],
  ])("%s", (src, expected) => {
    expect(tr(src)).toBe(expected);
  });

  test.each([String.raw`\frac{3m}{s}`, String.raw`2xy+\pi`, String.raw`\frac{2sin(x)}{2}`])(
    "%s keeps letters as variables",
    (src) => {
      expect(tr(src)).not.toContain("_");
    },
  );
});
