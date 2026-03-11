import type { MaterialGrade, MetalFamily } from "./types";

export const METAL_FAMILIES: MetalFamily[] = [
  {
    id: "steel",
    label: "Steel",
    referenceLabel: "EN 10025",
  },
  {
    id: "stainless_steel",
    label: "Stainless Steel",
    referenceLabel: "EN 10088",
  },
  {
    id: "aluminum",
    label: "Aluminum",
    referenceLabel: "EN 573",
  },
  {
    id: "copper",
    label: "Copper & Copper Alloys",
    referenceLabel: "EN 1652 / EN 12163",
  },
  {
    id: "titanium",
    label: "Titanium",
    referenceLabel: "ASTM B265 / EN 10204",
  },
  {
    id: "cast_iron",
    label: "Cast Iron",
    referenceLabel: "EN 1561",
  },
];

export const MATERIAL_GRADES: MaterialGrade[] = [
  /* ------------------------------------------------------------------ */
  /*  Steel — EN 10025                                                   */
  /* ------------------------------------------------------------------ */
  {
    id: "steel-s235jr",
    familyId: "steel",
    label: "S235JR",
    densityKgPerM3: 7850,
    referenceLabel: "EN 10025-2",
  },
  {
    id: "steel-s275jr",
    familyId: "steel",
    label: "S275JR",
    densityKgPerM3: 7850,
    referenceLabel: "EN 10025-2",
  },
  {
    id: "steel-s355jr",
    familyId: "steel",
    label: "S355JR",
    densityKgPerM3: 7850,
    referenceLabel: "EN 10025-2",
  },
  {
    id: "steel-s420m",
    familyId: "steel",
    label: "S420M",
    densityKgPerM3: 7850,
    referenceLabel: "EN 10025-4",
  },
  {
    id: "steel-s460m",
    familyId: "steel",
    label: "S460M",
    densityKgPerM3: 7850,
    referenceLabel: "EN 10025-4",
  },

  /* ------------------------------------------------------------------ */
  /*  Stainless Steel — EN 10088                                         */
  /* ------------------------------------------------------------------ */
  {
    id: "stainless-304",
    familyId: "stainless_steel",
    label: "1.4301 (AISI 304)",
    densityKgPerM3: 7930,
    referenceLabel: "EN 10088-2",
  },
  {
    id: "stainless-316",
    familyId: "stainless_steel",
    label: "1.4401 (AISI 316)",
    densityKgPerM3: 8000,
    referenceLabel: "EN 10088-2",
  },
  {
    id: "stainless-316l",
    familyId: "stainless_steel",
    label: "1.4404 (AISI 316L)",
    densityKgPerM3: 8000,
    referenceLabel: "EN 10088-2",
  },
  {
    id: "stainless-duplex-2205",
    familyId: "stainless_steel",
    label: "1.4462 (Duplex 2205)",
    densityKgPerM3: 7800,
    referenceLabel: "EN 10088-2",
  },

  /* ------------------------------------------------------------------ */
  /*  Aluminum — EN 573                                                  */
  /* ------------------------------------------------------------------ */
  {
    id: "al-6060",
    familyId: "aluminum",
    label: "EN AW-6060",
    densityKgPerM3: 2700,
    referenceLabel: "EN 573-3",
  },
  {
    id: "al-6082",
    familyId: "aluminum",
    label: "EN AW-6082",
    densityKgPerM3: 2700,
    referenceLabel: "EN 573-3",
  },
  {
    id: "al-6061",
    familyId: "aluminum",
    label: "EN AW-6061",
    densityKgPerM3: 2700,
    referenceLabel: "EN 573-3",
  },
  {
    id: "al-5754",
    familyId: "aluminum",
    label: "EN AW-5754",
    densityKgPerM3: 2660,
    referenceLabel: "EN 573-3",
  },
  {
    id: "al-3003",
    familyId: "aluminum",
    label: "EN AW-3003",
    densityKgPerM3: 2730,
    referenceLabel: "EN 573-3",
  },
  {
    id: "al-7075",
    familyId: "aluminum",
    label: "EN AW-7075",
    densityKgPerM3: 2810,
    referenceLabel: "EN 573-3",
  },

  /* ------------------------------------------------------------------ */
  /*  Copper & Copper Alloys                                             */
  /* ------------------------------------------------------------------ */
  {
    id: "cu-c11000",
    familyId: "copper",
    label: "Copper C11000 (ETP)",
    densityKgPerM3: 8960,
    referenceLabel: "EN 13599",
  },
  {
    id: "cu-brass-cw614n",
    familyId: "copper",
    label: "Brass CW614N (CuZn39Pb3)",
    densityKgPerM3: 8500,
    referenceLabel: "EN 12163",
  },
  {
    id: "cu-bronze-cw453k",
    familyId: "copper",
    label: "Bronze CW453K (CuSn8)",
    densityKgPerM3: 8800,
    referenceLabel: "EN 12163",
  },

  /* ------------------------------------------------------------------ */
  /*  Titanium                                                           */
  /* ------------------------------------------------------------------ */
  {
    id: "ti-grade2",
    familyId: "titanium",
    label: "Titanium Grade 2 (CP Ti)",
    densityKgPerM3: 4510,
    referenceLabel: "ASTM B265 / EN 10204",
  },
  {
    id: "ti-grade5",
    familyId: "titanium",
    label: "Titanium Grade 5 (Ti-6Al-4V)",
    densityKgPerM3: 4430,
    referenceLabel: "ASTM B265 / EN 10204",
  },

  /* ------------------------------------------------------------------ */
  /*  Cast Iron                                                          */
  /* ------------------------------------------------------------------ */
  {
    id: "ci-gjl-250",
    familyId: "cast_iron",
    label: "EN-GJL-250 (Grey Cast Iron)",
    densityKgPerM3: 7200,
    referenceLabel: "EN 1561",
  },
  {
    id: "ci-gjl-300",
    familyId: "cast_iron",
    label: "EN-GJL-300 (Grey Cast Iron)",
    densityKgPerM3: 7250,
    referenceLabel: "EN 1561",
  },
];

export function getMaterialGradeById(
  gradeId: string,
): MaterialGrade | undefined {
  return MATERIAL_GRADES.find((grade) => grade.id === gradeId);
}

export function getMaterialGradesByFamily(
  familyId: MetalFamily["id"],
): MaterialGrade[] {
  return MATERIAL_GRADES.filter((grade) => grade.familyId === familyId);
}
