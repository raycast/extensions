import type { FormulaValues } from "./formulas";
export const engineeringIDs = ["torsion-sv", "torsion-warping", "ltb"];
export const engineeringFields: Record<string, { title: string; unit: string; power?: number }> = {
  T: { title: "Torque", unit: "kN·m" },
  G: { title: "Shear modulus", unit: "MPa" },
  J: { title: "Torsion constant", unit: "mm4", power: 4 },
  Iw: { title: "Warping constant", unit: "mm6", power: 6 },
  Wt: { title: "Torsional stress modulus", unit: "mm3", power: 3 },
  Ww: { title: "Warping stress modulus", unit: "mm4", power: 4 },
  E05: { title: "5th percentile E0,05", unit: "MPa" },
  G05: { title: "5th percentile G0,05", unit: "MPa" },
  fy: { title: "Product/thickness yield strength fy", unit: "MPa" },
  fc: { title: "Characteristic compression fc0,k", unit: "MPa" },
  fm: { title: "Characteristic bending fm,k", unit: "MPa" },
  alphaY: { title: "EC3 alpha about y (or u)", unit: "" },
  alphaZ: { title: "EC3 alpha about z (or v)", unit: "" },
  alphaLT: { title: "EC3 general LTB alphaLT", unit: "" },
  betaC: { title: "EC5 beta_c", unit: "" },
  Ky: { title: "Effective-length factor y (or u)", unit: "" },
  Kz: { title: "Effective-length factor z (or v)", unit: "" },
  C1: { title: "Moment coefficient C1", unit: "" },
  C2: { title: "Load-height coefficient C2", unit: "" },
  zg: { title: "Signed load height above shear centre", unit: "mm" },
  kLT: { title: "Lateral length factor k", unit: "" },
  kw: { title: "Warping length factor kw", unit: "" },
};
export function engineeringKeys(id: string) {
  return id === "euler"
    ? ["Ky", "Kz", "fy", "fc", "E05", "alphaY", "alphaZ", "betaC"]
    : id === "ltb"
      ? ["J", "Iw", "E05", "G05", "fy", "fm", "C1", "C2", "zg", "kLT", "kw", "alphaLT"]
      : id === "torsion-warping"
        ? ["J", "Iw", "Wt", "Ww"]
        : id === "torsion-sv"
          ? ["L", "J", "Wt"]
          : [];
}
export const engineeringKeywordValues: Record<string, Partial<FormulaValues>> = {
  "cantilever restrained": { torqueCase: 0 },
  "cantilever free": { torqueCase: 1 },
  "fork free": { torqueCase: 2 },
  "both restrained": { torqueCase: 3 },
  "uniform moment": { ltbCase: 0 },
  udl: { ltbCase: 1 },
  point: { ltbCase: 2 },
  "custom coefficients": { ltbCase: 3 },
  "elastic modulus": { modulusBasis: 0 },
  "plastic modulus": { modulusBasis: 1 },
  "effective modulus": { modulusBasis: 2 },
  "gross area": { areaBasis: 0 },
  "effective area": { areaBasis: 1 },
};
