import { describe, expect, test } from "vitest";
import { Context, DEFAULT_SETTINGS, Settings, calculate, suggestConversions, translate } from "../src/engine";

const ctx = (s: Partial<Settings> = {}): Context => ({
  settings: { ...DEFAULT_SETTINGS, ...s },
  vars: new Map(),
  funcs: new Map(),
});

function run(input: string, s: Partial<Settings> = {}, c = ctx(s)) {
  const r = calculate(input, c);
  if (!r.ok) throw new Error(`${input}: ${r.error}`);
  return r;
}
const nspire = (input: string, s: Partial<Settings> = {}) => run(input, s).result.nspire;
const latex = (input: string, s: Partial<Settings> = {}) => run(input, s).result.latex;

describe("arithmetic and exactness", () => {
  test.each([
    ["2+3*4", "14"],
    ["1/3+1/6", "1/2"],
    ["2.5*4", "10."],
    ["2^-1", "1/2"],
    ["(-2)^2", "4"],
    ["-2^2", "-4"],
    ["5!", "120"],
    ["√(8)", "2*√(2)"],
    ["sin(π/4)", "√(2)/2"],
    ["sin⁻¹(1)", "π/2"],
    ["ln(ℯ^2)", "2"],
    ["log(1000)", "3"],
    ["log(8,2)", "3"],
    ["root(27,3)", "3"],
    ["(-8)^(1/3)", "-2"],
    ["mod(17,5)", "2"],
    ["gcd(12,18)", "6"],
    ["nCr(5,2)", "10"],
    ["round(2.567,2)", "2.57"],
    ["max({1,5,3})", "5"],
    ["{1,2,3}*2", "{2,4,6}"],
    ["6.02214076E23*2", "1.20443ᴇ24"],
    ["0.0001", "1.ᴇ-4"],
    ["50%", "1/2"],
  ])("%s = %s", (input, out) => expect(nspire(input)).toBe(out));

  test("approximate mode", () => expect(nspire("1/3", { mode: "approx" })).toBe("0.333333"));
  test("exact mode turns decimals into fractions", () => expect(nspire("0.25+0.5", { mode: "exact" })).toBe("3/4"));
  test("degree mode", () => expect(nspire("sin(30)", { angle: "deg" })).toBe("1/2"));
  test("angle unit in radian mode", () => expect(nspire("cos(60_°)")).toBe("1/2"));
  test("digits", () => expect(nspire("π*1.", { digits: 10 })).toBe("3.141592654"));
  test("decimal approximation offered for exact results", () => expect(run("1/3").approx?.nspire).toBe("0.333333"));
});

describe("units", () => {
  test.each([
    ["5_km/(2_hr)", "0.694444*_m/_s"],
    ["3_km►_mi", "1.86411*_mi"],
    ["5_N*2_m", "10*_J"],
    ["10_W/(2_A)", "5*_V"],
    ["3_ft+2_in", "0.9652*_m"],
    ["1_m^2►_cm^2", "10000*_cm^2"],
    ["1_N►_kg*_m/_s^2", "1*_kg*_m/_s^2"],
    ["_hr►_s", "3600*_s"],
    ["_c", "2.99792ᴇ8*_m/_s"],
    ["_g*2_kg", "19.6133*_N"],
    ["1_atm►_psi", "14.6959*_psi"],
    ["100_km/_hr►_mph", "62.1371*_mph"],
    ["1_kWh►_J", "3.6ᴇ6*_J"],
    ["1_eV►_J", "1.60218ᴇ-19*_J"],
    ["2_kΩ*3_mA", "6*_V"],
    ["5_μF*10_V", "5.ᴇ-5*_C"],
    ["1_l►_cm^3", "1000*_cm^3"],
    ["1_GHz*1_ns", "1"],
    ["√(4_m^2)", "2*_m"],
    ["_Na*_k", "8.31446*_J/(_K*_mol)"],
    ["1_lb►_kg", "0.453592*_kg"],
    ["2_mol*_Rc*300_K/(1_atm)►_l", "49.2344*_l"],
  ])("%s = %s", (input, out) => expect(nspire(input)).toBe(out));

  test.each([
    ["20_°C", "293.15*_K"],
    ["20_°C►_K", "293.15*_K"],
    ["100_°C►_°F", "212*_°F"],
    ["-40_°F►_°C", "-40*_°C"],
    ["0_K►_°C", "-273.15*_°C"],
    ["tmpCnv(100_°C,_°F)►_K", "373.15*_K"],
    ["ΔtmpCnv(100_°C,_°F)", "180*_°F"],
    ["20_°C+5_°C", "25*_K"],
    ["(20_°C+5_°C)►_°F", "45*_°F"],
    ["1_J/(1_°C)", "1*_J/_K"],
  ])("temperature: %s = %s", (input, out) => expect(nspire(input)).toBe(out));
  test("temperature: suggestions and variables are absolute", () => {
    const conv = suggestConversions(run("20_°C").value, ctx()).map((c) => c.result.nspire);
    expect(conv).toEqual(["20*_°C", "68*_°F", "527.67*_°R"]);
    const c = ctx();
    c.vars.set("t", run("t:=20_°C", {}, c).assignment!.value!);
    expect(run("t►_°F", {}, c).result.nspire).toBe("68*_°F");
  });
  test("tmpCnv converts absolute temperatures", () => {
    expect(nspire("tmpCnv(100_°C,_°F)")).toBe("212*_°F");
    expect(nspire("tmpCnv(32_°F,_°C)")).toBe("0*_°C");
    expect(nspire("tmpCnv(0_°C,_K)")).toBe("273.15*_K");
  });
  test("incompatible units", () => {
    const r = calculate("1_m+1_s", ctx());
    expect(r.ok).toBe(false);
  });
  test("conversion suggestions", () => {
    const r = run("1_km");
    const conv = suggestConversions(r.value, ctx());
    expect(conv.map((c) => c.unit.nspire)).toContain("mi");
    expect(conv.find((c) => c.unit.nspire === "ft")?.result.nspire).toBe("3280.84*_ft");
  });
});

describe("solve", () => {
  test.each([
    ["solve(x^2-4=0,x)", "x=-2 or x=2"],
    ["solve(2*x+3=7,x)", "x=2"],
    ["solve(x^2+x-1=0,x)", "x=(-1-√(5))/2 or x=(-1+√(5))/2"],
    ["solve(x^3-6x^2+11x-6=0,x)", "x=1 or x=2 or x=3"],
    ["solve(x^4-5x^2+6=0,x)", "x=-√(3) or x=-√(2) or x=√(2) or x=√(3)"],
    ["solve(x^2+1=0,x)", "false"],
    ["solve(x=x,x)", "true"],
    ["solve((x^2-1)/(x-1)=0,x)", "x=-1"],
    ["solve(1/x+1/(x+1)=1,x)", "x=(1-√(5))/2 or x=(1+√(5))/2"],
    ["solve(e^x=2,x)", "x=ln(2)"],
    ["solve(x^3=2,x)", "x=root(2,3)"],
    ["solve(√(x)=3,x)", "x=9"],
    ["solve(sin(x)=1/2,x)", "x=π/6+2*π*n1 or x=5*π/6+2*π*n1"],
    ["solve(cos(x)=0,x)", "x=π/2+π*n1"],
    ["solve(sin(x)=1/2,x)|0<x<π", "x=π/6 or x=5*π/6"],
    ["solve(x^2=4,x)|x>0", "x=2"],
    ["solve(x^2>4,x)", "x<-2 or x>2"],
    ["solve(x^2<=4,x)", "-2≤x≤2"],
    ["solve(1/x>0,x)", "x>0"],
    ["solve(x+y=3 and x-y=1,{x,y})", "x=2 and y=1"],
    ["solve({2x+y=1,4x+2y=2},{x,y})", "x=1/2-1/2*c1 and y=c1"],
    ["solve(x+y=1 and x+y=2,{x,y})", "false"],
    ["solve(x^2+y^2=25 and y=x+1,{x,y})", "x=-4 and y=-3 or x=3 and y=4"],
    ["solve(x*2_s=10_m,x)", "x=5*_m/_s"],
    ["solve(F=m*a,a)|F=10_N and m=2_kg", "a=5*_m/_s^2"],
    ["solve(1/2*m*v^2=100_J,v)|m=2_kg", "v=-10*_m/_s or v=10*_m/_s"],
    ["solve(x^2=2_m^2,x)", "x=-√(2)*_m or x=√(2)*_m"],
    ["solve(x+2_m=5_km,x)", "x=4998*_m"],
    ["zeros(x^2-2,x)", "{-√(2),√(2)}"],
    ["nSolve(cos(x)=x,x)", "0.739085"],
    ["nSolve(x^2=2,x=-1)", "-1.41421"],
    ["solve(x^2-2.0=0,x)", "x=-1.41421 or x=1.41421"],
  ])("%s → %s", (input, out) => expect(nspire(input)).toBe(out));

  test("equations with unknowns are solved automatically", () => {
    const r = run("x^2-5x+6=0");
    expect(r.result.nspire).toBe("x=2 or x=3");
    expect(r.solvedFor).toEqual(["x"]);
  });
  test("LaTeX output of a solve", () => {
    expect(latex("solve(x^2+x-1=0,x)")).toBe("x=\\frac{-1-\\sqrt{5}}{2}\\text{ or }x=\\frac{-1+\\sqrt{5}}{2}");
    expect(latex("solve(sin(x)=1/2,x)")).toBe(
      "x=\\frac{\\pi}{6}+2\\pi n_{1}\\text{ or }x=\\frac{5\\pi}{6}+2\\pi n_{1}",
    );
  });
  test("solve with stored variables and functions", () => {
    const c = ctx();
    const def = run("f(x):=x^2-3", {}, c);
    c.funcs.set(def.assignment!.name, {
      params: def.assignment!.params!,
      body: { type: "num", value: { e: true, n: 0n, d: 1n } },
    });
    // Use the real definition through the parser:
    const parsed = calculate("f(x):=x^2-3", c);
    expect(parsed.ok).toBe(true);
  });
});

describe("LaTeX input", () => {
  test.each([
    ["\\frac{1}{2}+\\frac{1}{3}", "5/6"],
    ["\\frac12", "1/2"],
    ["2\\cdot 3", "6"],
    ["2\\times 3", "6"],
    ["\\sqrt{16}", "4"],
    ["\\sqrt[3]{27}", "3"],
    ["\\left(1+2\\right)^{2}", "9"],
    ["2^{10}", "1024"],
    ["\\sin\\left(\\frac{\\pi}{6}\\right)", "1/2"],
    ["\\sin^{-1}(1)", "π/2"],
    ["\\log_{2}8", "3"],
    ["\\ln e", "1"],
    ["\\left|-3\\right|", "3"],
    ["|-3|+|2|", "5"],
    ["e^{0}", "1"],
    ["\\pi", "π"],
    ["5\\,\\mathrm{km}", "5000*_m"],
    ["5\\ \\text{km}/\\text{h}", "1.38889*_m/_s"],
    ["5\\,\\mathrm{km/h}", "1.38889*_m/_s"],
    ["\\SI{5}{\\kilo\\meter\\per\\hour}", "1.38889*_m/_s"],
    ["\\qty{9.81}{m/s^2}", "9.81*_m/_s^2"],
    ["10\\,\\mathrm{kg\\,m\\,s^{-2}}", "10*_N"],
    ["10\\,\\frac{\\mathrm{kg}\\cdot\\mathrm{m}}{\\mathrm{s}^{2}}", "10*_N"],
    ["2\\,\\mathrm{k\\Omega}\\cdot 3\\,\\mathrm{mA}", "6*_V"],
    ["5\\,\\mu\\mathrm{m}", "5.ᴇ-6*_m"],
    ["25^{\\circ}\\mathrm{C}", "298.15*_K"],
    ["30^\\circ", "π/6"],
    ["1{,}5", "1.5"],
    ["\\operatorname{solve}\\left(x^{2}=4,x\\right)", "x=-2 or x=2"],
    ["\\text{solve}(x^2=4,x)", "x=-2 or x=2"],
    ["x^2-5x+6=0", "x=2 or x=3"],
    ["\\frac{x}{2}=3", "x=6"],
    ["2x+3=7", "x=2"],
    ["v_0^2=16", "v_0=-4 or v_0=4"],
    ["\\begin{cases} x+y=3 \\\\ x-y=1 \\end{cases}", "x=2 and y=1"],
    ["$x^2 = 9$", "x=-3 or x=3"],
    ["\\binom{5}{2}", "10"],
    ["\\alpha^2=4", "α=-2 or α=2"],
    ["x\\cdot 2\\,\\mathrm{s}=10\\,\\mathrm{m}", "x=5*_m/_s"],
    ["\\mathrm{c_{0}}", "2.99792ᴇ8*_m/_s"],
  ])("%s → %s", (input, out) => expect(nspire(input)).toBe(out));

  test("letters multiply in LaTeX but form names in Nspire text", () => {
    expect(run("xy=2\\mid x=1").result.nspire).toBe("y=2");
    expect(nspire("ab:=3")).toBe("3");
  });
});

describe("Nspire input quirks", () => {
  test.each([
    ["5.*_m", "5.*_m"],
    ["2*3ᴇ2", "600."],
    ["x²=4", "x=-2 or x=2"],
    ["10⁻³", "1/1000"],
    ["3_km@>_mi", "1.86411*_mi"],
    ["3_km▶_mi", "1.86411*_mi"],
    ["solve(x^2=4,x)|x≥0", "x=2"],
    ["sqrt(16)", "4"],
    ["5→a", "5"],
  ])("%s → %s", (input, out) => expect(nspire(input)).toBe(out));
});

describe("round trips between LaTeX and Nspire", () => {
  const cases = [
    "5_km/(2_hr)",
    "solve(x^2+x-1=0,x)",
    "solve(F=m*a,a)|F=10_N and m=2_kg",
    "3_km►_mi",
    "tmpCnv(100_°C,_°F)",
    "√(2)/2+sin(π/3)",
    "solve(x^2>4,x)",
    "solve({2x+y=1,x-y=2},{x,y})",
    "2*_kΩ*3*_mA",
    "1/2*m*v^2|m=2_kg and v=3_m/_s",
    "nSolve(cos(x)=x,x)",
    "_Gc*5.97E24_kg/(6.371E6_m)^2",
    "abs(-3)+log(100)+ln(ℯ)",
    "{1,2,3}*2_m",
    "25_°C►_°F",
    "10_W/(2_A)",
    "5_μF*10_V",
  ];
  test.each(cases)("%s", (input) => {
    const direct = run(input).result.nspire;
    const r = run(input);
    // Nspire → LaTeX → evaluate
    expect(run(r.input.latex).result.nspire).toBe(direct);
    // Nspire → Nspire text → evaluate
    expect(run(r.input.nspire).result.nspire).toBe(direct);
    // Result LaTeX and Nspire text describe the same expression
    const a = translate(r.result.latex, ctx()),
      b = translate(r.result.nspire, ctx());
    expect(a.ok === false ? a.error : a.nspire).toBe(b.ok === false ? b.error : b.nspire);
  });

  test("translate without evaluating", () => {
    const t = translate("\\frac{\\sqrt{x}}{2}+\\SI{3}{\\meter}", ctx());
    expect(t.ok === false ? t.error : t.nspire).toBe("√(x)/2+3*_m");
    const t2 = translate("solve(x^2=4,x)|x>0", ctx());
    expect(t2.ok === false ? t2.error : t2.latex).toBe("\\operatorname{solve}\\left(x^{2}=4,x\\right)\\mid x>0");
  });

  test("ASCII Nspire export", () => {
    const r = run("3_km►_mi", { nspireAscii: true });
    expect(r.input.nspire).toBe("3*_km@>_mi");
    expect(run("√(2)/2+π", { nspireAscii: true }).input.nspire).toBe("sqrt(2)/2+pi");
  });
});

describe("stored definitions", () => {
  test("variables and functions survive a save/replay cycle", () => {
    const c = ctx();
    const store = (src: string) => {
      const r = run(src, {}, c);
      const a = r.assignment!;
      // Replay from the persisted source, like the extension does on launch.
      const replay = run(a.source, {}, c).assignment!;
      if (replay.params) c.funcs.set(replay.name, { params: replay.params, body: replay.body! });
      else c.vars.set(replay.name, replay.value!);
    };
    store("m:=2_kg");
    store("\\frac{1}{3}\\to k");
    store("f(x):=x^2-3");
    store("v_0:=1.5_m/_s");
    expect(run("m*_g", {}, c).result.nspire).toBe("19.6133*_N");
    expect(run("k*3", {}, c).result.nspire).toBe("1");
    expect(run("f(4)", {}, c).result.nspire).toBe("13");
    expect(run("solve(f(x)=0,x)", {}, c).result.nspire).toBe("x=-√(3) or x=√(3)");
    expect(run("1/2*m*v_0^2", {}, c).result.nspire).toBe("2.25*_J");
    expect(run("1/2*m*v^2=9_J", {}, c).result.nspire).toBe("v=-3*_m/_s or v=3*_m/_s");
  });
});

describe("symbolic solve", () => {
  test.each([
    ["solve(f=m/a,m)", "m=a*f"],
    ["solve(f=m/a,a)", "a=m/f"],
    ["solve(v=v0+a*t,t)", "t=(v-v0)/a"],
    ["solve(y=m*x+b,x)", "x=(y-b)/m"],
    ["solve(P*V=n*R*T,T)", "T=P*V/(R*n)"],
    ["solve(x^2=a,x)", "x=-√(a) or x=√(a)"],
    ["solve(1/2*m*v^2=E,v)", "v=-√(2)*√(E)/√(m) or v=√(2)*√(E)/√(m)"],
    ["solve(a*x^2+b*x+c=0,x)", "x=(-b-√(b^2-4*a*c))/(2*a) or x=(√(b^2-4*a*c)-b)/(2*a)"],
    ["solve(e^(k*t)=2,t)", "t=ln(2)/k"],
    ["solve(√(x)=a,x)", "x=a^2"],
    ["solve(sin(x)=a,x)", "x=sin⁻¹(a)"],
    ["solve(x+y=a and x-y=b,{x,y})", "x=(a+b)/2 and y=(a-b)/2"],
    ["solve(system(a*x+y=1,x-y=c),x,y)", "x=(c+1)/(a+1) and y=(1-a*c)/(a+1)"],
    ["solve(F=m*a,a)|m=2", "a=F/2"],
  ])("%s → %s", (input, out) => expect(nspire(input)).toBe(out));

  test("LaTeX output keeps the variable on the left", () => {
    expect(latex("solve(f=m/a,m)")).toBe("m=af");
    expect(latex("solve(a*x^2+b*x+c=0,x)")).toBe(
      "x=\\frac{-b-\\sqrt{b^{2}-4ac}}{2a}\\text{ or }x=\\frac{\\sqrt{b^{2}-4ac}-b}{2a}",
    );
  });
  test("LaTeX input", () => expect(nspire("\\operatorname{solve}\\left(f=\\frac{m}{a},m\\right)")).toBe("m=a*f"));
  test("solve needs the variable when there are several unknowns", () => {
    expect(calculate("f=m/a", ctx()).ok).toBe(false);
  });
});

describe("simplification", () => {
  test.each([
    ["a+a", "2*a"],
    ["2*a*3/a", "6"],
    ["(a^2-b^2)/(a-b)", "a+b"],
    ["expand((a+b)^2)", "a^2+2*a*b+b^2"],
    ["x^2|x=a+1", "a^2+2*a+1"],
  ])("%s → %s", (input, out) => expect(nspire(input)).toBe(out));
});

describe("Nspire functions", () => {
  test.each([
    ["solve(system(x=y*2,y=x+2),x,y)", "x=-4 and y=-2"],
    ["solve(x=y*2 and y=x+2,x,y)", "x=-4 and y=-2"],
    ["\\begin{cases}x=2y\\\\y=x+2\\end{cases}", "x=-4 and y=-2"],
    ["dotP({1,2,3},{4,5,6})", "32"],
    ["dotP([1,2,3],[4,5,6])", "32"],
    ["dotp([1,2],[3,4])", "11"],
    ["crossP([1,0,0],[0,1,0])", "{0,0,1}"],
    ["norm([3,4])", "5"],
    ["unitV([3,4])", "{3/5,4/5}"],
    ["dotP([1,2]_m,[3,4]_N)", "11*_J"],
    ["d(x^3,x)", "3*x^2"],
    ["d(a*sin(x),x)", "a*cos(x)"],
    ["d(x^2,x)|x=3", "6"],
    ["d(x^3,x,2)", "6*x"],
    ["\\frac{d}{dx}\\left(x^{3}\\right)", "3*x^2"],
    ["nDeriv(x^3,x=2)", "12."],
    ["nInt(x^2,x,0,1)", "1/3"],
    ["∫(x^2,x,0,3)", "9"],
    ["\\int_{0}^{\\pi}\\sin(x)\\,dx", "2"],
    ["seq(k^2,k,1,5)", "{1,4,9,16,25}"],
    ["sum(k,k,1,100)", "5050"],
    ["Σ(1/k^2,k,1,3)", "49/36"],
    ["\\sum_{k=1}^{4}k", "10"],
    ["product({1,2,3,4})", "24"],
    ["median({3,1,2,4})", "5/2"],
    ["stDevSamp({2,4,4,4,5,5,7,9})", "4*√(14)/7"],
    ["varPop({2,4,4,4,5,5,7,9})", "4"],
    ["cumSum({1,2,3})", "{1,3,6}"],
    ["dim({1,2,3})", "3"],
    ["augment({1,2},{3})", "{1,2,3}"],
    ["when(2>1,5,6)", "5"],
    ["isPrime(97)", "true"],
    ["intDiv(-7,2)", "-3"],
    ["factor(120)", "2^3*3*5"],
    ["fMin(x^2-2*x,x)", "x=1"],
    ["fMax(-(x-3)^2,x)", "x=3"],
    ["\\begin{pmatrix}1\\\\2\\\\3\\end{pmatrix}\\cdot 2", "{2,4,6}"],
  ])("%s → %s", (input, out) => expect(nspire(input)).toBe(out));
});

describe("large numbers use scientific notation", () => {
  test.each([
    ["2^100", "1.26765ᴇ30"],
    ["1234567", "1.23457ᴇ6"],
    ["123456", "123456"],
    ["_c*1000", "2.99792ᴇ11*_m/_s"],
    ["10^9*_m", "1.ᴇ9*_m"],
  ])("%s → %s", (input, out) => expect(nspire(input)).toBe(out));
  test("exact mode keeps all digits", () =>
    expect(nspire("2^100", { mode: "exact" })).toBe("1267650600228229401496703205376"));
  test("more display digits", () => expect(nspire("1234567", { digits: 8 })).toBe("1234567"));
});

describe("text copied from the TI-Nspire", () => {
  // The Nspire copies the ⁻¹ superscript as the private-use character U+F005.
  test.each([
    ["sin(((1)/(2)))", "π/6"],
    ["cos(0)", "π/2"],
    ["tan(1)", "π/4"],
    ["sinh(0)", "0"],
    ["2", "1/2"],
    ["solve(sin(x)=π/6,x)", "x=1/2"],
  ])("%s → %s", (input, out) => expect(nspire(input)).toBe(out));

  test("the clipboard sample round-trips to LaTeX", () => {
    expect(run("sin(((1)/(2)))").input.latex).toBe("\\arcsin\\left(\\frac{1}{2}\\right)");
  });

  test("unknown private-use symbols name their code point", () => {
    const r = calculate("sin(1)", ctx());
    expect(r.ok === false && r.error).toContain("U+F0FF");
  });
});

describe("angle modes", () => {
  test.each([
    ["sin(30)", "deg", "1/2"],
    ["sin(100)", "grad", "1"],
    ["sin(π/6)", "rad", "1/2"],
    ["sin⁻¹(1)", "deg", "90"],
    ["sin⁻¹(1)", "grad", "100"],
    ["sin⁻¹(1)", "rad", "π/2"],
    ["sin(30_°)", "rad", "1/2"],
    ["sin(π/6_r)", "deg", "1/2"],
    ["cos(100_grad)", "deg", "0"],
    ["90►_r", "deg", "1.5708*_r"],
    ["100►_°", "grad", "90.*_°"],
  ] as const)("%s in %s mode → %s", (input, angle, out) => expect(nspire(input, { angle })).toBe(out));

  test("periodic solutions use the mode's period", () => {
    expect(nspire("solve(sin(x)=1/2,x)", { angle: "deg" })).toBe("x=30+360*n1 or x=150+360*n1");
    expect(nspire("solve(cos(x)=0,x)", { angle: "grad" })).toBe("x=100+200*n1");
  });
});
