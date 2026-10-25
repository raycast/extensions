import { Material, RecordRow } from "./types";
/** First-generation EN1992-1-1:2004 Table 3.1, 28-day normal-weight quartzite concrete. No design resistance factors. */
export function concreteRows(): RecordRow[] {
  const fcks = [12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90],
    cubes = [15, 20, 25, 30, 37, 45, 50, 55, 60, 67, 75, 85, 95, 105];
  const E = [27, 29, 30, 31, 33, 34, 35, 36, 37, 38, 39, 41, 42, 44];
  return fcks.map((fck, i) => {
    const fcm = fck + 8,
      fctm = fck <= 50 ? 0.3 * fck ** (2 / 3) : 2.12 * Math.log(1 + fcm / 10),
      Ecm = E[i] * 1000;
    return Object.fromEntries(
      Object.entries({
        id: `C${fck}/${cubes[i]}`,
        family: "Concrete",
        group: "Normal-weight concrete",
        standard: "EN 1992-1-1:2004 Table 3.1 and 3.1.3",
        source: "https://www.phd.eng.br/wp-content/uploads/2015/12/en.1992.1.1.2004.pdf",
        E: Ecm,
        Ecm,
        G: Ecm / 2.4,
        nu: 0.2,
        density: 2400,
        fck,
        fck_cube: cubes[i],
        fcm,
        fctm,
        fctk_005: 0.7 * fctm,
        fctk_095: 1.3 * fctm,
        Ecm_formula: 22000 * (fcm / 10) ** 0.3,
        epsilon_c1: Math.min(0.7 * fcm ** 0.31, 2.8),
        epsilon_cu1: fck <= 50 ? 3.5 : 2.8 + 27 * ((98 - fcm) / 100) ** 4,
        epsilon_c2: fck <= 50 ? 2 : 2 + 0.085 * (fck - 50) ** 0.53,
        epsilon_cu2: fck <= 50 ? 3.5 : 2.6 + 35 * ((90 - fck) / 100) ** 4,
        n: fck <= 50 ? 2 : 1.4 + 23.4 * ((90 - fck) / 100) ** 4,
        epsilon_c3: fck <= 50 ? 1.75 : 1.75 + (0.55 * (fck - 50)) / 40,
        epsilon_cu3: fck <= 50 ? 3.5 : 2.6 + 35 * ((90 - fck) / 100) ** 4,
        status: "EN",
        notes:
          "28-day normal-weight quartzite concrete. E uses rounded Table 3.1 Ecm; Ecm_formula shows the unrounded equation. G=E/[2(1+nu)] with uncracked nu=0.2. Density 2400 kg/m³ is an editable plain-concrete assumption; choose an appropriate reinforced/effective density for self-weight. Strengths are reference properties only; no EC2 design checks. Strain fields are per mille (‰). Cracking, creep and aggregate corrections are not applied.",
      }).map(([k, v]) => [k, String(v)]),
    );
  });
}
export function isBundledSectionExample(raw: RecordRow) {
  return (
    raw.family === "General geometry" &&
    raw.source === "Geometry formulas" &&
    [
      "Custom rectangle 100x300",
      "Custom circle 200",
      "Custom rhs 200x100x6",
      "Custom shs 100x6",
      "Custom chs 114.3x5",
      "Custom i 300x150x8x12",
      "Custom t 200x150x8x12",
      "Custom channel 200x100x8x12",
      "Custom angle 100x100x8x8",
    ].includes(raw.id)
  );
}
export function isLegacyPlaceholder(m: Material) {
  return (m.id === "Concrete-custom" && m.E === null) || m.status === "TEMPLATE";
}
