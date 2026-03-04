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
];

export const MATERIAL_GRADES: MaterialGrade[] = [
  {
    id: "steel-s235jr",
    familyId: "steel",
    label: "S235JR",
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
    id: "al-7075",
    familyId: "aluminum",
    label: "EN AW-7075",
    densityKgPerM3: 2810,
    referenceLabel: "EN 573-3",
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
