import { Num, ONE, div, fl, mul, parseDecimal } from "./num";

// Dimension vector: exponents of [m, kg, s, A, K, mol, cd]. During solve() extra
// slots past index 6 track the (yet unknown) dimension of each unknown.
export type Dim = number[];
export const BASE_COUNT = 7;
export const DIMLESS: Dim = [0, 0, 0, 0, 0, 0, 0];

export function dimMul(a: Dim, b: Dim): Dim {
  const n = Math.max(a.length, b.length);
  const r: Dim = [];
  for (let i = 0; i < n; i++) r.push(clean((a[i] ?? 0) + (b[i] ?? 0)));
  return r;
}
export function dimDiv(a: Dim, b: Dim): Dim {
  return dimMul(a, dimScale(b, -1));
}
export function dimScale(a: Dim, k: number): Dim {
  return a.map((x) => clean(x * k));
}
export function dimEq(a: Dim, b: Dim): boolean {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > 1e-9) return false;
  return true;
}
export function isDimless(a: Dim): boolean {
  return a.every((x) => Math.abs(x) < 1e-9);
}
function clean(x: number): number {
  const r = Math.round(x * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r;
}

const D = (m = 0, kg = 0, s = 0, A = 0, K = 0, mol = 0, cd = 0): Dim => [m, kg, s, A, K, mol, cd];

export type UnitKind = "unit" | "const";

export interface UnitDef {
  /** Nspire name without the leading underscore, e.g. "km", "°C", "Gc". */
  nspire: string;
  /** LaTeX for the unit symbol, placed inside \mathrm{...}. */
  tex: string;
  factor: Num;
  dim: Dim;
  kind: UnitKind;
  category: string;
  desc: string;
  /** Angle units keep a flag so trig functions know the value is already in radians. */
  angle?: boolean;
  /** Extra Nspire spellings and LaTeX spellings accepted on input. */
  aliases?: string[];
  texAliases?: string[];
}

/** Factor spec: product/quotient of decimal literals and "pi", e.g. "0.45359237*9.80665/0.3048". */
function f(spec: string | number): Num {
  if (typeof spec === "number") return parseDecimal(String(spec));
  let acc: Num = ONE;
  for (const m of spec.matchAll(/([*/]?)([^*/]+)/g)) {
    const tok = m[2].trim();
    const v = tok === "pi" ? fl(Math.PI) : tok.startsWith("~") ? fl(Number(tok.slice(1))) : parseDecimal(tok);
    acc = m[1] === "/" ? div(acc, v) : mul(acc, v);
  }
  return acc;
}

type Row = [nspire: string, tex: string, factor: string | number, dim: Dim, desc: string, extra?: Partial<UnitDef>];

function group(category: string, kind: UnitKind, rows: Row[]): UnitDef[] {
  return rows.map(([nspire, tex, factor, dim, desc, extra]) => ({
    nspire,
    tex,
    factor: f(factor),
    dim,
    kind,
    category,
    desc,
    ...extra,
  }));
}

const L = D(1),
  M = D(0, 1),
  T = D(0, 0, 1),
  AREA = D(2),
  VOL = D(3),
  VEL = D(1, 0, -1),
  FORCE = D(1, 1, -2),
  ENERGY = D(2, 1, -2),
  POWER = D(2, 1, -3),
  PRESSURE = D(-1, 1, -2),
  TEMP = D(0, 0, 0, 0, 1),
  CURRENT = D(0, 0, 0, 1),
  CHARGE = D(0, 0, 1, 1),
  VOLT = D(2, 1, -3, -1),
  OHM = D(2, 1, -3, -2),
  FARAD = D(-2, -1, 4, 2),
  HENRY = D(2, 1, -2, -2),
  WEBER = D(2, 1, -2, -1),
  TESLA = D(0, 1, -2, -1),
  SIEMENS = D(-2, -1, 3, 2),
  FREQ = D(0, 0, -1),
  DOSE = D(2, 0, -2);

// Factors are exact where the definition is exact; "~" marks measured values.
export const UNITS: UnitDef[] = [
  ...group("Length", "unit", [
    ["m", "m", 1, L, "meter"],
    ["km", "km", 1000, L, "kilometer"],
    ["cm", "cm", "0.01", L, "centimeter"],
    ["mm", "mm", "0.001", L, "millimeter"],
    ["μm", "\\mu m", "1E-6", L, "micrometer", { aliases: ["μ"] }],
    ["nm", "nm", "1E-9", L, "nanometer"],
    ["Å", "\\mathring{A}", "1E-10", L, "angstrom", { texAliases: ["Å", "\\AA", "\\angstrom"] }],
    ["fm", "fm", "1E-15", L, "fermi"],
    ["ft", "ft", "0.3048", L, "foot"],
    ["in", "in", "0.0254", L, "inch"],
    ["yd", "yd", "0.9144", L, "yard"],
    ["mi", "mi", "1609.344", L, "mile"],
    ["Nmi", "nmi", 1852, L, "nautical mile", { aliases: ["nmi"] }],
    ["mil", "mil", "0.0000254", L, "mil"],
    ["rod", "rod", "5.0292", L, "rod"],
    ["fath", "fath", "1.8288", L, "fathom"],
    ["au", "au", 149597870700, L, "astronomical unit", { texAliases: ["AU"] }],
    ["ltyr", "ly", "9460730472580800", L, "light year"],
    ["pc", "pc", "~3.0856775814913673E16", L, "parsec"],
  ]),
  ...group("Area", "unit", [
    ["acre", "acre", "4046.8564224", AREA, "acre"],
    ["ha", "ha", 10000, AREA, "hectare"],
  ]),
  ...group("Volume", "unit", [
    ["l", "L", "0.001", VOL, "liter", { aliases: ["L", "liter"], texAliases: ["l", "\\liter", "\\litre"] }],
    ["ml", "mL", "1E-6", VOL, "milliliter", { aliases: ["mL"], texAliases: ["ml"] }],
    ["gal", "gal", "0.003785411784", VOL, "US gallon"],
    ["qt", "qt", "0.000946352946", VOL, "US quart"],
    ["pt", "pt", "0.000473176473", VOL, "US pint"],
    ["cup", "cup", "0.0002365882365", VOL, "US cup"],
    ["floz", "fl\\,oz", "0.0000295735295625", VOL, "US fluid ounce", { texAliases: ["floz", "fl.oz", "fl oz"] }],
    ["tbsp", "tbsp", "0.00001478676478125", VOL, "tablespoon"],
    ["tsp", "tsp", "0.00000492892159375", VOL, "teaspoon"],
    ["galUK", "gal_{UK}", "0.00454609", VOL, "UK gallon"],
    ["flozUK", "fl\\,oz_{UK}", "0.0000284130625", VOL, "UK fluid ounce"],
  ]),
  ...group("Mass", "unit", [
    ["kg", "kg", 1, M, "kilogram"],
    ["gm", "g", "0.001", M, "gram"],
    ["mg", "mg", "1E-6", M, "milligram"],
    ["μg", "\\mu g", "1E-9", M, "microgram"],
    ["lb", "lb", "0.45359237", M, "pound"],
    ["oz", "oz", "0.028349523125", M, "ounce"],
    ["ton", "ton", "907.18474", M, "short ton"],
    ["mton", "t", 1000, M, "metric ton", { aliases: ["tonne"] }],
    ["slug", "slug", "0.45359237*9.80665/0.3048", M, "slug"],
    ["amu", "u", "~1.66053906660E-27", M, "atomic mass unit", { texAliases: ["Da", "amu"] }],
  ]),
  ...group("Time", "unit", [
    ["s", "s", 1, T, "second", { aliases: ["sec"] }],
    ["ms", "ms", "0.001", T, "millisecond"],
    ["μs", "\\mu s", "1E-6", T, "microsecond"],
    ["ns", "ns", "1E-9", T, "nanosecond"],
    ["min", "min", 60, T, "minute"],
    ["hr", "h", 3600, T, "hour", { texAliases: ["hr", "\\hour"] }],
    ["day", "d", 86400, T, "day", { texAliases: ["day", "\\day"] }],
    ["week", "wk", 604800, T, "week", { texAliases: ["week"] }],
    ["yr", "yr", 31557600, T, "year (365.25 d)", { texAliases: ["a", "y"] }],
  ]),
  ...group("Velocity", "unit", [
    ["knot", "kn", "1852/3600", VEL, "knot", { texAliases: ["knot", "kt"] }],
    ["mph", "mph", "0.44704", VEL, "miles per hour"],
    ["kph", "kph", "1000/3600", VEL, "kilometers per hour"],
  ]),
  ...group("Temperature", "unit", [
    ["K", "K", 1, TEMP, "kelvin", { aliases: ["°K"] }],
    ["°C", "^{\\circ}C", 1, TEMP, "degree Celsius", { texAliases: ["°C", "℃", "\\celsius", "\\degreeCelsius"] }],
    ["°F", "^{\\circ}F", "5/9", TEMP, "degree Fahrenheit", { texAliases: ["°F", "℉", "\\fahrenheit"] }],
    ["°R", "^{\\circ}R", "5/9", TEMP, "degree Rankine", { texAliases: ["°R"] }],
  ]),
  ...group("Current", "unit", [
    ["A", "A", 1, CURRENT, "ampere"],
    ["mA", "mA", "0.001", CURRENT, "milliampere"],
    ["μA", "\\mu A", "1E-6", CURRENT, "microampere"],
    ["kA", "kA", 1000, CURRENT, "kiloampere"],
  ]),
  ...group("Amount & Luminosity", "unit", [
    ["mol", "mol", 1, D(0, 0, 0, 0, 0, 1), "mole"],
    ["cd", "cd", 1, D(0, 0, 0, 0, 0, 0, 1), "candela"],
  ]),
  ...group("Force", "unit", [
    ["N", "N", 1, FORCE, "newton"],
    ["kN", "kN", 1000, FORCE, "kilonewton"],
    ["dyne", "dyn", "1E-5", FORCE, "dyne", { texAliases: ["dyne"] }],
    ["lbf", "lbf", "0.45359237*9.80665", FORCE, "pound force"],
    ["kgf", "kgf", "9.80665", FORCE, "kilogram force"],
    ["tonf", "tonf", "2000*0.45359237*9.80665", FORCE, "ton force"],
  ]),
  ...group("Energy", "unit", [
    ["J", "J", 1, ENERGY, "joule"],
    ["kJ", "kJ", 1000, ENERGY, "kilojoule"],
    ["erg", "erg", "1E-7", ENERGY, "erg"],
    ["cal", "cal", "4.1868", ENERGY, "calorie (IT)"],
    ["kcal", "kcal", "4186.8", ENERGY, "kilocalorie", { aliases: ["Cal"] }],
    ["Btu", "Btu", "1055.05585262", ENERGY, "British thermal unit", { texAliases: ["BTU"] }],
    ["eV", "eV", "1.602176634E-19", ENERGY, "electron volt"],
    ["kWh", "kWh", 3600000, ENERGY, "kilowatt hour", { texAliases: ["kW\\,h", "kW h", "kW·h"] }],
    ["ftlb", "ft\\,lbf", "0.3048*0.45359237*9.80665", ENERGY, "foot-pound", { texAliases: ["ftlb", "ft·lbf"] }],
    ["latm", "L\\,atm", "101.325", ENERGY, "liter-atmosphere", { texAliases: ["latm"] }],
  ]),
  ...group("Power", "unit", [
    ["W", "W", 1, POWER, "watt"],
    ["kW", "kW", 1000, POWER, "kilowatt"],
    ["MW", "MW", 1000000, POWER, "megawatt"],
    ["hp", "hp", "550*0.3048*0.45359237*9.80665", POWER, "horsepower"],
  ]),
  ...group("Pressure", "unit", [
    ["Pa", "Pa", 1, PRESSURE, "pascal"],
    ["kPa", "kPa", 1000, PRESSURE, "kilopascal"],
    ["MPa", "MPa", 1000000, PRESSURE, "megapascal"],
    ["bar", "bar", 100000, PRESSURE, "bar"],
    ["atm", "atm", 101325, PRESSURE, "atmosphere"],
    ["torr", "Torr", "101325/760", PRESSURE, "torr", { texAliases: ["torr"] }],
    ["mmHg", "mmHg", "133.322387415", PRESSURE, "millimeter of mercury"],
    ["inHg", "inHg", "3386.388640341", PRESSURE, "inch of mercury"],
    ["mmH2O", "mmH_{2}O", "9.80665", PRESSURE, "millimeter of water"],
    ["inH2O", "inH_{2}O", "249.08891", PRESSURE, "inch of water"],
    ["psi", "psi", "0.45359237*9.80665/0.0254/0.0254", PRESSURE, "pound per square inch"],
  ]),
  ...group("Electricity & Magnetism", "unit", [
    ["C", "C", 1, CHARGE, "coulomb"],
    ["V", "V", 1, VOLT, "volt"],
    ["mV", "mV", "0.001", VOLT, "millivolt"],
    ["kV", "kV", 1000, VOLT, "kilovolt"],
    ["Ω", "\\Omega", 1, OHM, "ohm", { aliases: ["ohm"], texAliases: ["Ω", "\\ohm"] }],
    ["kΩ", "k\\Omega", 1000, OHM, "kilohm"],
    ["MΩ", "M\\Omega", 1000000, OHM, "megohm"],
    ["F", "F", 1, FARAD, "farad"],
    ["μF", "\\mu F", "1E-6", FARAD, "microfarad"],
    ["nF", "nF", "1E-9", FARAD, "nanofarad"],
    ["pF", "pF", "1E-12", FARAD, "picofarad"],
    ["H", "H", 1, HENRY, "henry"],
    ["mH", "mH", "0.001", HENRY, "millihenry"],
    ["μH", "\\mu H", "1E-6", HENRY, "microhenry"],
    ["Wb", "Wb", 1, WEBER, "weber"],
    ["T", "T", 1, TESLA, "tesla"],
    ["Gs", "Gs", "0.0001", TESLA, "gauss", { texAliases: ["\\gauss"] }],
    ["S", "S", 1, SIEMENS, "siemens", { aliases: ["mho"] }],
  ]),
  ...group("Frequency", "unit", [
    ["Hz", "Hz", 1, FREQ, "hertz"],
    ["kHz", "kHz", 1000, FREQ, "kilohertz"],
    ["MHz", "MHz", 1000000, FREQ, "megahertz"],
    ["GHz", "GHz", 1000000000, FREQ, "gigahertz"],
  ]),
  ...group("Angle", "unit", [
    ["r", "rad", 1, DIMLESS, "radian", { angle: true, texAliases: ["\\radian"] }],
    ["°", "^{\\circ}", "pi/180", DIMLESS, "degree", { angle: true, texAliases: ["°", "\\degree", "deg"] }],
    ["'", "'", "pi/10800", DIMLESS, "arc minute", { angle: true, texAliases: ["\\arcminute"] }],
    ['"', "''", "pi/648000", DIMLESS, "arc second", { angle: true, texAliases: ['"', "\\arcsecond"] }],
    ["grad", "grad", "pi/200", DIMLESS, "gradian", { angle: true, aliases: ["gon"], texAliases: ["gon"] }],
  ]),
  ...group("Radiation", "unit", [
    ["Gy", "Gy", 1, DOSE, "gray"],
    ["Sv", "Sv", 1, DOSE, "sievert"],
    ["rad", "rd", "0.01", DOSE, "rad (absorbed dose)"],
    ["rem", "rem", "0.01", DOSE, "rem"],
    ["Bq", "Bq", 1, FREQ, "becquerel"],
    ["Ci", "Ci", "3.7E10", FREQ, "curie"],
    ["R", "R", "0.000258", D(0, -1, 1, 1), "roentgen"],
  ]),
  ...group("Viscosity", "unit", [
    ["P", "P", "0.1", D(-1, 1, -1), "poise"],
    ["St", "St", "0.0001", D(2, 0, -1), "stokes"],
  ]),
  ...group("Constants", "const", [
    ["c", "c_{0}", 299792458, VEL, "speed of light"],
    ["Cc", "k_{e}", "~8.9875517923E9", D(3, 1, -4, -2), "Coulomb constant"],
    ["g", "g_{n}", "9.80665", D(1, 0, -2), "standard gravity"],
    ["Gc", "G", "~6.67430E-11", D(3, -1, -2), "gravitational constant"],
    ["h", "h_{P}", "~6.62607015E-34", D(2, 1, -1), "Planck constant"],
    ["k", "k_{B}", "~1.380649E-23", D(2, 1, -2, 0, -1), "Boltzmann constant"],
    ["Me", "m_{e}", "~9.1093837015E-31", M, "electron rest mass"],
    ["Mn", "m_{n}", "~1.67492749804E-27", M, "neutron rest mass"],
    ["Mp", "m_{p}", "~1.67262192369E-27", M, "proton rest mass"],
    ["Na", "N_{A}", "~6.02214076E23", D(0, 0, 0, 0, 0, -1), "Avogadro constant"],
    ["q", "q_{e}", "~1.602176634E-19", CHARGE, "elementary charge"],
    ["Rb", "a_{0}", "~5.29177210903E-11", L, "Bohr radius"],
    ["Rc", "R_{c}", "~8.314462618", D(2, 1, -2, 0, -1, -1), "molar gas constant"],
    ["Rdb", "R_{\\infty}", "~10973731.568160", D(-1), "Rydberg constant"],
    ["Vm", "V_{m}", "~0.02241396954", D(3, 0, 0, 0, 0, -1), "molar volume (STP)"],
    ["ε0", "\\varepsilon_{0}", "~8.8541878128E-12", D(-3, -1, 4, 2), "vacuum permittivity"],
    ["σ", "\\sigma_{SB}", "~5.670374419E-8", D(0, 1, -3, 0, -4), "Stefan-Boltzmann constant"],
    ["φ0", "\\Phi_{0}", "~2.067833848E-15", WEBER, "magnetic flux quantum"],
    ["μ0", "\\mu_{0}", "~1.25663706212E-6", D(1, 1, -2, -2), "vacuum permeability"],
    ["μb", "\\mu_{B}", "~9.2740100783E-24", D(2, 0, 0, 1), "Bohr magneton"],
  ]),
];

const PREFIXES: [string, string][] = [
  ["Y", "1E24"],
  ["Z", "1E21"],
  ["E", "1E18"],
  ["P", "1E15"],
  ["T", "1E12"],
  ["G", "1E9"],
  ["M", "1E6"],
  ["k", "1E3"],
  ["h", "1E2"],
  ["da", "1E1"],
  ["d", "1E-1"],
  ["c", "1E-2"],
  ["m", "1E-3"],
  ["μ", "1E-6"],
  ["n", "1E-9"],
  ["p", "1E-12"],
  ["f", "1E-15"],
  ["a", "1E-18"],
];

// Bases that accept any SI prefix: [nspire base, tex base, nspire name of the base unit].
const PREFIXABLE: [string, string, string][] = [
  ["m", "m", "m"],
  ["g", "g", "gm"],
  ["s", "s", "s"],
  ["A", "A", "A"],
  ["K", "K", "K"],
  ["mol", "mol", "mol"],
  ["cd", "cd", "cd"],
  ["N", "N", "N"],
  ["J", "J", "J"],
  ["W", "W", "W"],
  ["Pa", "Pa", "Pa"],
  ["Hz", "Hz", "Hz"],
  ["C", "C", "C"],
  ["V", "V", "V"],
  ["Ω", "\\Omega", "Ω"],
  ["F", "F", "F"],
  ["H", "H", "H"],
  ["T", "T", "T"],
  ["Wb", "Wb", "Wb"],
  ["S", "S", "S"],
  ["l", "L", "l"],
  ["L", "L", "l"],
  ["eV", "eV", "eV"],
  ["Gy", "Gy", "Gy"],
  ["Sv", "Sv", "Sv"],
  ["Bq", "Bq", "Bq"],
  ["bar", "bar", "bar"],
];

const byNspire = new Map<string, UnitDef>();
const byTexKey = new Map<string, UnitDef>();

/** Normalizes a LaTeX unit spelling to a lookup key ("\\mu m" -> "μm", "c_{0}" -> "c_0"). */
export function texKey(s: string): string {
  return s
    .replace(/\\mathring\s*\{?\s*A\s*\}?/g, "Å")
    .replace(/\\(mathrm|text|textrm|operatorname|rm)\b/g, "")
    .replace(/\\mu\b|\\micro\b|µ/g, "μ")
    .replace(/\\Omega\b|Ω/g, "Ω")
    .replace(/\\varepsilon\b|\\epsilon\b/g, "ε")
    .replace(/\\sigma\b/g, "σ")
    .replace(/\\Phi\b|\\phi\b|\\varphi\b/g, "Φ")
    .replace(/\\infty\b/g, "∞")
    .replace(/\^\s*\{?\s*\\circ\s*\}?|\\circ\b|\\degree\b|\\textdegree\b/g, "°")
    .replace(/\\AA\b|Å/g, "Å")
    .replace(/\\[,;:! ]|~|\s+/g, "")
    .replace(/[{}]/g, "");
}

function register(u: UnitDef) {
  byNspire.set(u.nspire, u);
  for (const a of u.aliases ?? []) if (!byNspire.has(a)) byNspire.set(a, u);
  for (const t of [u.tex, ...(u.texAliases ?? [])]) {
    const k = texKey(t);
    if (!byTexKey.has(k)) byTexKey.set(k, u);
  }
}
UNITS.forEach(register);

function prefixed(name: string, tex: boolean): UnitDef | undefined {
  for (const [p, pf] of PREFIXES) {
    if (!name.startsWith(p) || name.length === p.length) continue;
    const rest = name.slice(p.length);
    const base = PREFIXABLE.find(([nb, tb]) => (tex ? texKey(tb) : nb) === rest);
    if (!base) continue;
    const baseUnit = byNspire.get(base[2]);
    if (!baseUnit) continue;
    const pTex = p === "μ" ? "\\mu " : p;
    const def: UnitDef = {
      nspire: p + base[0],
      tex: pTex + base[1],
      factor: mul(parseDecimal(pf), baseUnit.factor),
      dim: baseUnit.dim,
      kind: "unit",
      category: baseUnit.category,
      desc: `${p}-${baseUnit.desc}`,
    };
    return def;
  }
  return undefined;
}

/** Looks up a unit by its Nspire name (without underscore). */
export function lookupNspire(name: string): UnitDef | undefined {
  name = name.replace(/µ/g, "μ").replace(/Ω/g, "Ω");
  const u = byNspire.get(name) ?? prefixed(name, false);
  if (u && !byNspire.has(u.nspire)) register(u);
  return u;
}

/** Looks up a unit from a LaTeX spelling (content of \mathrm{...} or a siunitx macro). */
export function lookupTex(s: string): UnitDef | undefined {
  const k = texKey(s);
  const u = byTexKey.get(k) ?? prefixed(k, true);
  if (u && !byNspire.has(u.nspire)) register(u);
  return u;
}

/** Derived SI units used for display, like the Nspire's default units. */
export const DEFAULT_DERIVED: string[] = ["N", "J", "W", "Pa", "C", "V", "Ω", "F", "H", "Wb", "T", "S"];

/** Base unit display order and names (kg first like the Nspire). */
export const BASE_DISPLAY: { idx: number; nspire: string }[] = [
  { idx: 1, nspire: "kg" },
  { idx: 0, nspire: "m" },
  { idx: 2, nspire: "s" },
  { idx: 3, nspire: "A" },
  { idx: 4, nspire: "K" },
  { idx: 5, nspire: "mol" },
  { idx: 6, nspire: "cd" },
];

export const SIPREFIX_HINT = PREFIXES.map((p) => p[0]);

export function unitsWithDim(dim: Dim): UnitDef[] {
  return UNITS.filter((u) => u.kind === "unit" && dimEq(u.dim, dim) && !u.angle);
}
