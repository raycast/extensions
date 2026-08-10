import { authedFetch } from "@/lib/auth";

export type LectureAttendance = {
  id: string;
  professor: {
    lecture_professor_name: string | null;
    training_professor_name: string | null;
    laboratory_professor_name: string | null;
  };
  semester: {
    start: string;
    end: string;
  };
  score: string;
  hours: string;
};

export async function getLectureAttendance(id: string) {
  const res = await authedFetch(`lectures/${id}/attendance`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch lecture attendance");
  }

  const data = (await res.json()) as LectureAttendance;
  if (!data) return null;

  return data;
}

export type AttendanceDetails = {
  success: boolean;
  lecture_info: {
    dates: {
      week_num: string;
      date: string | null;
      method: string | null;
      mod_date: string | null;
    }[];
  };
  students: {
    student_id: string;
    student_name: string;
    attendance: {
      week_num: string;
      status: string | null;
    }[];
    scores: {
      total_score: number;
      attendance_percent: string;
      absentCount: string;
    };
  }[];
};

export async function getLectureAttendanceDetails(id: string) {
  const res = await authedFetch(`lectures/${id}/attendance-detail`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch lecture attendance details");
  }

  const data = (await res.json()) as AttendanceDetails;
  if (!data) return null;

  return data;
}
