import { Icon } from "@raycast/api";
import { Grade } from "../canvas-api";

export class GradeProcessor {
  static getGradeIcon(grade: string): Icon {
    if (grade === "A" || grade === "A-" || grade === "A+") return Icon.Star;
    if (grade === "B" || grade === "B-" || grade === "B+") return Icon.Checkmark;
    if (grade === "C" || grade === "C-" || grade === "C+") return Icon.ExclamationMark;
    if (grade === "D" || grade === "D-" || grade === "D+") return Icon.Warning;
    if (grade === "F") return Icon.Xmark;
    return Icon.Document; // Default icon for numeric grades or N/A
  }

  static getGradeColor(grade: string): string {
    if (grade === "A" || grade === "A-" || grade === "A+") return "#22c55e"; // Green
    if (grade === "B" || grade === "B-" || grade === "B+") return "#3b82f6"; // Blue
    if (grade === "C" || grade === "C-" || grade === "C+") return "#f59e0b"; // Yellow
    if (grade === "D" || grade === "D-" || grade === "D+") return "#ef4444"; // Red
    if (grade === "F") return "#dc2626"; // Dark red
    return "#6b7280"; // Gray for numeric grades or N/A
  }

  static formatGrade(grade: Grade): string {
    if (grade.grade !== "N/A") {
      return grade.grade;
    }
    return `${grade.score}%`;
  }

  static getGradeDescription(grade: Grade): string {
    if (grade.grade !== "N/A") {
      return `Letter Grade: ${grade.grade}`;
    }
    return `Percentage: ${grade.score}%`;
  }

  static isPassingGrade(grade: Grade): boolean {
    if (grade.grade !== "N/A") {
      return !grade.grade.startsWith("F") && !grade.grade.startsWith("D");
    }
    return grade.score >= 60;
  }
}
