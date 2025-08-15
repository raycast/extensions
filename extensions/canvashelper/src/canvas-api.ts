import { getCanvasPreferences } from "./preferences";

export interface Course {
  id: number;
  name: string;
  course_code: string;
  enrollment_state: string;
  start_at: string;
  end_at: string;
}

export interface Assignment {
  id: number;
  name: string;
  due_at: string;
  points_possible: number;
  submission_types: string[];
  course_id?: number;
  course_name?: string;
  submission?: {
    id: number;
    submitted_at: string;
    score?: number;
    grade?: string;
  };
}

export interface Grade {
  id: number;
  assignment_id: number;
  assignment_name: string;
  course_id: number;
  course_name: string;
  score: number;
  points_possible: number;
  grade: string;
  submitted_at?: string;
  graded_at?: string;
}

export interface CanvasEvent {
  id: number;
  type: string;
  title: string;
  start_at: string;
  end_at: string;
  assignment?: Assignment;
}

// Canvas API response types
export interface CanvasAssignmentResponse {
  id: number;
  name: string;
  due_at: string;
  points_possible: number;
  submission_types: string[];
}

export interface CanvasEnrollmentResponse {
  id: number;
  user_id: number;
  course_id: number;
  grades?: {
    current_score: number | null;
    current_grade: string | null;
    final_score: number | null;
    final_grade: string | null;
  };
}

export interface CanvasUserProfileResponse {
  id: number;
  name: string;
  short_name: string;
  sortable_name: string;
  sis_user_id: string | null;
  integration_id: string | null;
  login_id: string;
  email: string;
  avatar_url: string;
  locale: string | null;
  time_zone: string;
  bio: string | null;
}

class CanvasAPI {
  private baseUrl: string;
  private token: string;

  constructor() {
    const prefs = getCanvasPreferences();
    this.baseUrl = prefs.canvasUrl;
    if (this.baseUrl.endsWith("/")) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
    this.token = prefs.apiToken;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async getCourses(): Promise<Course[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/courses?enrollment_state=active`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch courses: ${response.statusText}`);
    }

    return response.json() as Promise<Course[]>;
  }

  async getUpcomingEvents(daysAhead: number = 30): Promise<CanvasEvent[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const response = await fetch(
      `${this.baseUrl}/api/v1/users/self/upcoming_events?start_date=${now.toISOString()}&end_date=${futureDate.toISOString()}`,
      { headers: this.getHeaders() },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch upcoming events: ${response.statusText}`);
    }

    return response.json() as Promise<CanvasEvent[]>;
  }

  async getClosestDueAssignments(limit: number = 5): Promise<Assignment[]> {
    try {
      // Get all active courses
      const courses = await this.getCourses();
      const allAssignments: Assignment[] = [];

      // Fetch assignments for each course
      for (const course of courses) {
        try {
          const response = await fetch(
            `${this.baseUrl}/api/v1/courses/${course.id}/assignments?include[]=submission&include[]=score_statistics&per_page=50`,
            { headers: this.getHeaders() },
          );

          if (response.ok) {
            const assignments = (await response.json()) as CanvasAssignmentResponse[];
            for (const assignment of assignments) {
              if (assignment.due_at && new Date(assignment.due_at) > new Date()) {
                allAssignments.push({
                  id: assignment.id,
                  name: assignment.name,
                  due_at: assignment.due_at,
                  points_possible: assignment.points_possible || 0,
                  submission_types: assignment.submission_types || [],
                  course_id: course.id,
                  course_name: course.name,
                });
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch assignments for course ${course.name}:`, error);
        }
      }

      // Sort by due date (closest first) and return top N
      return allAssignments.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()).slice(0, limit);
    } catch (error) {
      console.error("Error fetching closest due assignments:", error);
      throw error;
    }
  }

  async getAssignments(courseId: number): Promise<Assignment[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/courses/${courseId}/assignments`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch assignments: ${response.statusText}`);
    }

    return response.json() as Promise<Assignment[]>;
  }

  async getUserProfile(): Promise<CanvasUserProfileResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/users/self/profile`, { headers: this.getHeaders() });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    return response.json() as Promise<CanvasUserProfileResponse>;
  }

  async getGrades(): Promise<Grade[]> {
    const courses = await this.getCourses();
    const courseGrades: Grade[] = [];

    for (const course of courses) {
      try {
        // Use enrollments endpoint to get grades
        const response = await fetch(
          `${this.baseUrl}/api/v1/courses/${course.id}/enrollments?user_id=self&include[]=grades`,
          { headers: this.getHeaders() },
        );

        if (response.ok) {
          const enrollments = (await response.json()) as CanvasEnrollmentResponse[];

          if (enrollments.length > 0 && enrollments[0].grades) {
            const grades = enrollments[0].grades;

            // Use current_score instead of final_score
            if (grades.current_score !== null && grades.current_score !== undefined) {
              courseGrades.push({
                id: course.id,
                assignment_id: 0, // Course-level grade
                assignment_name: "Course Grade",
                course_id: course.id,
                course_name: course.name,
                score: grades.current_score,
                points_possible: 100,
                grade: grades.current_grade || "N/A",
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch grades for course ${course.name}:`, error);
      }
    }

    return courseGrades;
  }

  getCourseUrl(courseId: number): string {
    return `${this.baseUrl}/courses/${courseId}`;
  }

  getCourseGradesUrl(courseId: number): string {
    return `${this.baseUrl}/courses/${courseId}/grades`;
  }

  getCourseAssignmentsUrl(courseId: number): string {
    return `${this.baseUrl}/courses/${courseId}/assignments`;
  }

  getCourseModulesUrl(courseId: number): string {
    return `${this.baseUrl}/courses/${courseId}/modules`;
  }

  getCourseFilesUrl(courseId: number): string {
    return `${this.baseUrl}/courses/${courseId}/files`;
  }

  getAssignmentUrl(assignmentId: number): string {
    return `${this.baseUrl}/assignments/${assignmentId}`;
  }

  getDashboardUrl(): string {
    return `${this.baseUrl}/dashboard`;
  }

  async setCourseNickname(courseId: number, nickname: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/users/self/course_nicknames/${courseId}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({
          nickname: nickname,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set course nickname: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error setting course nickname:", error);
      throw error;
    }
  }
}

export default CanvasAPI;
