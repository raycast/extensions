export enum GradeSystem {
  FONT = "Fontainebleau",
  V_SCALE = "V-Scale",
}

// Conversion tables
const fontToVScale: Record<string, string> = {
  "4": "V0-",
  "4+": "V0",
  "5": "V1",
  "5+": "V2",
  "6a": "V3",
  "6a+": "V3/V4",
  "6b": "V4",
  "6b+": "V4/V5",
  "6c": "V5",
  "6c+": "V5/V6",
  "7a": "V6",
  "7a+": "V7",
  "7b": "V8",
  "7b+": "V8/V9",
  "7c": "V9",
  "7c+": "V10",
  "8a": "V11",
  "8a+": "V12",
  "8b": "V13",
  "8b+": "V14",
  "8c": "V15",
  "8c+": "V16",
  "9a": "V17",
};

const vScaleToFont: Record<string, string> = {
  "0-": "4",
  "0": "4+",
  "1": "5",
  "2": "5+",
  "3": "6a",
  "4": "6b",
  "5": "6c",
  "6": "7a",
  "7": "7a+",
  "8": "7b",
  "9": "7c",
  "10": "7c+",
  "11": "8a",
  "12": "8a+",
  "13": "8b",
  "14": "8b+",
  "15": "8c",
  "16": "8c+",
  "17": "9a",
};

/**
 * Identifies the grading system from a grade string
 */
export function identifyGradeSystem(grade: string): GradeSystem | null {
  const cleanedGrade = grade.toLowerCase().trim();

  // Check if it's a Font grade (contains a letter)
  if (/[a-z]/i.test(cleanedGrade) && !cleanedGrade.startsWith("v")) {
    return GradeSystem.FONT;
  }

  // Check if it's a V-scale grade (starts with 'v' or is just a number)
  if (cleanedGrade.startsWith("v") || /^\d+(-|\+)?$/.test(cleanedGrade)) {
    return GradeSystem.V_SCALE;
  }

  return null;
}

/**
 * Checks if a grade is valid in the specified system
 */
export function isValidGrade(grade: string, system: GradeSystem): boolean {
  const cleanedGrade = grade.trim();

  if (system === GradeSystem.FONT) {
    return cleanedGrade in fontToVScale;
  } else if (system === GradeSystem.V_SCALE) {
    // Remove 'v' prefix if present
    const vGrade = cleanedGrade.toLowerCase().startsWith("v") ? cleanedGrade.substring(1) : cleanedGrade;

    return vGrade in vScaleToFont;
  }

  return false;
}

/**
 * Converts a climbing grade from one system to another
 */
export function convertGrade(grade: string, fromSystem: GradeSystem, toSystem: GradeSystem): string {
  if (fromSystem === toSystem) {
    return grade; // No conversion needed
  }

  const cleanedGrade = grade.trim();

  if (fromSystem === GradeSystem.FONT && toSystem === GradeSystem.V_SCALE) {
    return fontToVScale[cleanedGrade] || "Unknown";
  } else if (fromSystem === GradeSystem.V_SCALE && toSystem === GradeSystem.FONT) {
    // Remove 'v' prefix if present
    const vGrade = cleanedGrade.toLowerCase().startsWith("v") ? cleanedGrade.substring(1) : cleanedGrade;

    return vScaleToFont[vGrade] || "Unknown";
  }

  return "Unknown";
}
