import { Assignment, Course } from "../canvas-api";

export interface CourseAssignments {
  course: Course;
  nextDue: Assignment | null;
  lastCompleted: Assignment | null;
}

export class AssignmentProcessor {
  static processCourseAssignments(course: Course, assignments: Assignment[]): CourseAssignments {
    // Find next due assignment (not submitted, due in future)
    const futureAssignments = assignments
      .filter((a) => a.due_at && new Date(a.due_at) > new Date())
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

    const nextDue = futureAssignments.length > 0 ? futureAssignments[0] : null;

    // Find last completed assignment (submitted, most recent)
    const completedAssignments = assignments
      .filter((a) => a.submission && a.submission.submitted_at)
      .sort(
        (a, b) => new Date(b.submission!.submitted_at!).getTime() - new Date(a.submission!.submitted_at!).getTime(),
      );

    const lastCompleted = completedAssignments.length > 0 ? completedAssignments[0] : null;

    return {
      course,
      nextDue,
      lastCompleted,
    };
  }

  static getAssignmentStatus(assignment: Assignment): {
    isOverdue: boolean;
    isDueSoon: boolean;
    isCompleted: boolean;
    daysUntilDue: number;
  } {
    const now = new Date();
    const dueDate = new Date(assignment.due_at);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isOverdue: dueDate < now && !assignment.submission?.submitted_at,
      isDueSoon: daysUntilDue <= 3 && daysUntilDue >= 0,
      isCompleted: !!assignment.submission?.submitted_at,
      daysUntilDue,
    };
  }

  static formatDueDate(dueDate: string): string {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} ago`;
    } else if (diffDays === 0) {
      return "Due today";
    } else if (diffDays === 1) {
      return "Due tomorrow";
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return date.toLocaleDateString();
    }
  }

  static getAssignmentPriority(assignment: Assignment): number {
    const status = this.getAssignmentStatus(assignment);

    if (status.isOverdue) return 1; // Highest priority
    if (status.isDueSoon) return 2; // High priority
    if (status.isCompleted) return 4; // Lowest priority
    return 3; // Medium priority
  }
}
