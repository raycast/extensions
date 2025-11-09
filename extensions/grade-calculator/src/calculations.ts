import { Assignment, ClassType, GradeCalculation } from "./types";

export function calculateQuarterGrade(
  assignments: Assignment[],
  quarter: 1 | 2,
  classType: ClassType,
  manualGrade?: number | null,
): number | null {
  // If a manual grade is set for this quarter, use it
  if (manualGrade !== undefined && manualGrade !== null) {
    return manualGrade;
  }
  const quarterAssignments = assignments.filter((a) => a.quarter === quarter);

  if (quarterAssignments.length === 0) {
    return null;
  }

  const majorAssignments = quarterAssignments.filter((a) => a.type === "major");
  const minorAssignments = quarterAssignments.filter((a) => a.type === "minor");

  // If no assignments of a particular type, return null
  if (majorAssignments.length === 0 && minorAssignments.length === 0) {
    return null;
  }

  // Calculate average for each type
  const majorAvg =
    majorAssignments.length > 0 ? majorAssignments.reduce((sum, a) => sum + a.grade, 0) / majorAssignments.length : 0;

  const minorAvg =
    minorAssignments.length > 0 ? minorAssignments.reduce((sum, a) => sum + a.grade, 0) / minorAssignments.length : 0;

  // If only one type exists, return that average
  if (majorAssignments.length === 0) return minorAvg;
  if (minorAssignments.length === 0) return majorAvg;

  // Calculate weighted grade
  const weightedGrade = (majorAvg * classType.majorWeight) / 100 + (minorAvg * classType.minorWeight) / 100;

  return Math.round(weightedGrade * 100) / 100; // Round to 2 decimal places
}

export function calculateSemesterGrade(
  assignments: Assignment[],
  classType: ClassType,
  q1ManualGrade?: number | null,
  q2ManualGrade?: number | null,
): number | null {
  const q1Grade = calculateQuarterGrade(assignments, 1, classType, q1ManualGrade);
  const q2Grade = calculateQuarterGrade(assignments, 2, classType, q2ManualGrade);

  // Need at least one quarter grade
  if (q1Grade === null && q2Grade === null) {
    return null;
  }

  // If only one quarter has grades, return that grade
  if (q1Grade === null) return q2Grade;
  if (q2Grade === null) return q1Grade;

  // Calculate semester average (50% each quarter)
  const semesterGrade = q1Grade * 0.5 + q2Grade * 0.5;

  return Math.round(semesterGrade * 100) / 100; // Round to 2 decimal places
}

export function calculateGrades(
  assignments: Assignment[],
  classType: ClassType,
  currentQuarter: 1 | 2,
  q1ManualGrade?: number | null,
  q2ManualGrade?: number | null,
): GradeCalculation {
  const manualGrade = currentQuarter === 1 ? q1ManualGrade : q2ManualGrade;
  const quarterGrade = calculateQuarterGrade(assignments, currentQuarter, classType, manualGrade);
  const semesterGrade = calculateSemesterGrade(assignments, classType, q1ManualGrade, q2ManualGrade);

  return {
    quarterGrade,
    semesterGrade,
  };
}

export function formatGrade(grade: number | null): string {
  if (grade === null) return "N/A";
  return `${grade.toFixed(2)}%`;
}
