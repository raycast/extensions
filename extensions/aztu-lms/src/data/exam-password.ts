import { authedFetch } from "@/lib/auth";

export type ExamPassword = { success: boolean; data: number };

export async function getExamPassword() {
  const response = await authedFetch("exam-password", { method: "GET" });
  const data = (await response.json()) as ExamPassword;

  if (!data || !data.success) return null;

  return data;
}
