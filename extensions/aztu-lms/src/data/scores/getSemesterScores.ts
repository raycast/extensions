import { authedFetch } from "@/lib/auth";

export type SemesterScores = {
  results: Array<{
    semester_name: string;
    major_type: string;
    lecture_name: string;
    score: string;
    total_score_new: number;
    last_score: string;
    total_score: string;
    grade: string;
    again_yn: string;
  }>;
};

export async function getSemesterScores(semCode: string) {
  const response = await authedFetch(`scores/${semCode}`, {
    method: "GET",
    body: null,
  });

  const data = (await response.json()) as SemesterScores;

  if (!data.results) return null;

  return data;
}
