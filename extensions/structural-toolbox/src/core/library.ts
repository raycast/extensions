import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseCSV, numberField, writeCSV } from "./csv";
import { concreteRows, isBundledSectionExample } from "./concrete";
export function migrateLibrary(directory: string) {
  const marker = join(directory, ".library-v2");
  if (existsSync(marker)) return;
  const matFile = join(directory, "materials.csv"),
    secFile = join(directory, "sections.csv");
  const materials = parseCSV(readFileSync(matFile, "utf8")).filter(
    (r) => !(r.id === "Concrete-custom" && !r.E && !r.E0_mean),
  );
  const existing = new Set(materials.map((r) => r.id.toLowerCase()));
  for (const r of concreteRows()) if (!existing.has(r.id.toLowerCase())) materials.push(r);
  const sections = parseCSV(readFileSync(secFile, "utf8")).filter((r) => !isBundledSectionExample(r));
  writeFileSync(matFile, writeCSV(materials));
  writeFileSync(secFile, writeCSV(sections));
  writeFileSync(
    marker,
    "Separate material/section libraries; concrete presets added without overwriting existing IDs.",
  );
}
import { sectionFromRow } from "./sections";
import { Material, Section } from "./types";
export interface Library {
  materials: Material[];
  sections: Section[];
  directory: string;
}
/** One directory can contain any number of material and section catalogues. */
export function libraryCSVFiles(directory: string): string[] {
  const names = readdirSync(directory);
  return [
    "materials.csv",
    ...names.filter((n) => /^materials-.+\.csv$/i.test(n)).sort(),
    "sections.csv",
    ...names.filter((n) => /^sections-.+\.csv$/i.test(n)).sort(),
  ];
}
/** Exact grade matching, optionally prefixed by a material family. Never fuzzy-match grade numbers. */
export function materialFromText(text: string, lib: Library): Material | undefined {
  const compact = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const input = compact(text);
  const exact = lib.materials.find((m) => [m.id, m.id.replace(/^Steel-/i, "")].some((id) => compact(id) === input));
  if (exact) return exact;
  const named = text.trim().match(/^(concrete|steel|timber|wood|sawn|glulam|lvl)\s+(.+)$/i);
  if (!named) return undefined;
  const family = named[1].toLowerCase(),
    grade = materialFromText(named[2], lib);
  if (!grade) return undefined;
  const matches =
    family === "timber" || family === "wood"
      ? /sawn|glulam|lvl/i.test(grade.family)
      : grade.family.toLowerCase() === family;
  return matches ? grade : undefined;
}
export function loadLibrary(directory: string): Library {
  const materialRows = parseCSV(readFileSync(join(directory, "materials.csv"), "utf8"));
  const materialIDs = new Set(materialRows.map((r) => r.id.toLowerCase()));
  for (const name of libraryCSVFiles(directory).filter((n) => /^materials-.+\.csv$/i.test(n)))
    for (const row of parseCSV(readFileSync(join(directory, name), "utf8")))
      if (!materialIDs.has(row.id.toLowerCase())) {
        materialRows.push(row);
        materialIDs.add(row.id.toLowerCase());
      }
  const materials = materialRows.map((raw) => {
    const E = numberField(raw, "E") ?? numberField(raw, "E0_mean"),
      G = numberField(raw, "G") ?? numberField(raw, "G_mean"),
      density = numberField(raw, "density") ?? numberField(raw, "rho_mean");
    for (const [k, v] of Object.entries({ E, G, density }))
      if (v !== null && v <= 0) throw Error(`${raw.id}: ${k} must be positive or blank`);
    return {
      id: raw.id,
      family: raw.family || "Custom",
      E,
      G,
      density,
      status: raw.status || "USER",
      source: raw.standard || raw.source || "User supplied",
      raw,
    };
  });
  const sectionRows = parseCSV(readFileSync(join(directory, "sections.csv"), "utf8"));
  const ids = new Set(sectionRows.map((r) => r.id.toLowerCase()));
  for (const name of readdirSync(directory)
    .filter((n) => /^sections-.+\.csv$/i.test(n))
    .sort())
    for (const row of parseCSV(readFileSync(join(directory, name), "utf8")))
      if (!ids.has(row.id.toLowerCase())) {
        sectionRows.push(row);
        ids.add(row.id.toLowerCase());
      }
  const sections = sectionRows.map(sectionFromRow);
  return { materials, sections, directory };
}
export function usableMaterial(m: Material): void {
  if (m.status === "TEMPLATE")
    throw Error(`${m.id} is a template. Complete it and change its CSV status before calculation.`);
  if (m.family === "CLT" || m.family === "Panel")
    throw Error(
      "Panel/CLT records are available for reference. Supply explicitly derived effective E, A and I as a custom material/section for beam analysis.",
    );
  if (!m.E) throw Error(`${m.id} has no E value`);
}
export function fuzzyScore(query: string, value: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const a = norm(query),
    b = norm(value);
  if (!a) return 1;
  if (a === b) return 100;
  if (b.startsWith(a)) return 80;
  if (b.includes(a)) return 60;
  let j = 0;
  for (const c of b) if (c === a[j]) j++;
  if (j === a.length) return 30;
  // Small typo allowance, names only. Numeric values never use edit distance.
  if (/\d/.test(a)) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let k = 0; k <= b.length; k++) dp[0][k] = k;
  for (let i = 1; i <= a.length; i++)
    for (let k = 1; k <= b.length; k++) {
      dp[i][k] = Math.min(dp[i - 1][k] + 1, dp[i][k - 1] + 1, dp[i - 1][k - 1] + Number(a[i - 1] !== b[k - 1]));
      if (i > 1 && k > 1 && a[i - 1] === b[k - 2] && a[i - 2] === b[k - 1])
        dp[i][k] = Math.min(dp[i][k], dp[i - 2][k - 2] + 1);
    }
  return dp[a.length][b.length] <= Math.max(1, Math.floor(a.length / 5)) ? 20 : 0;
}
export const PROPERTY_UNITS: Record<string, string> = {
  E: "MPa",
  G: "MPa",
  density: "kg/m³",
  E0_mean: "MPa",
  E0_05: "MPa",
  E90_mean: "MPa",
  Em_flat: "MPa",
  G_mean: "MPa",
  G_05: "MPa",
  Gr_mean: "MPa",
  rho_k: "kg/m³",
  rho_mean: "kg/m³",
  b: "mm",
  h: "mm",
  t: "mm",
  tw: "mm",
  tf: "mm",
  d: "mm",
  cy: "mm",
  cz: "mm",
  A: "mm²",
  Ay: "mm²",
  Az: "mm²",
  Iy: "mm⁴",
  Iz: "mm⁴",
  Iyz: "mm⁴",
  J: "mm⁴",
  Wy: "mm³",
  Wz: "mm³",
  Wply: "mm³",
  Wplz: "mm³",
  ry: "mm",
  rz: "mm",
  Iw: "mm⁶",
  mass: "kg/m",
  Imajor: "mm⁴",
  Iminor: "mm⁴",
  principalAngle: "rad",
};
export function propertyUnit(key: string) {
  key = key.replace(/_published$/, "");
  if (["Ecm", "Ecm_formula"].includes(key)) return "MPa";
  if (key.startsWith("epsilon_")) return "‰";
  return PROPERTY_UNITS[key] ?? (/^(fm|ft|fc|fv|fr|ftor)/.test(key) ? "MPa" : "");
}

export function pendingDataNotice(id: string) {
  return id === "GL28h"
    ? "Source review pending: ft0_k is 22.3 MPa here; Swedish Wood lists 22.4 MPa. Existing CSV retained."
    : id === "Kerto-S"
      ? "Source review pending: transverse flatwise compression differs from the manufacturer table. Existing CSV retained."
      : id === "Kerto-Q"
        ? "Source review pending: this record mixes thickness groups, including longitudinal E. Choose the applicable product/thickness before relying on its stiffness. Existing CSV retained."
        : "";
}
