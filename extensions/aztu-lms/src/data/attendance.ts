import { authedFetch } from "@/lib/auth";

export type Attendance = {
  lecture_id: string;
  lecture_name: string;
  total_weeks: number;
  attended_weeks: number;
  absent_weeks: number;
  attendance_percent: string;
  attendance_score: number;
};

export async function getAttendance() {
  const response = await authedFetch("attendance", { method: "GET" });
  const data = (await response.json()) as Attendance[];

  if (!(data instanceof Array)) return null;

  return data;
}
