export interface ClassType {
  id: string;
  name: string;
  majorWeight: number; // percentage (0-100)
  minorWeight: number; // percentage (0-100)
}

export interface Class {
  id: string;
  name: string;
  classTypeId: string;
  currentQuarter: 1 | 2;
  q1ManualGrade?: number | null;
  q2ManualGrade?: number | null;
}

export interface Assignment {
  id: string;
  classId: string;
  name: string;
  grade: number; // percentage (0-100)
  type: "major" | "minor";
  quarter: 1 | 2;
}

export interface GradeCalculation {
  quarterGrade: number | null;
  semesterGrade: number | null;
}
