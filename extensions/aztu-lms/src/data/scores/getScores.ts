import { authedFetch } from "@/lib/auth";

export type TotalScore = {
  results: {
    sem_code: string;
    attend_cnt: string;
    require_cnt: string;
    total_score: string;
    require_score: string;
    div_score: string;
    avg_total: string;
    avg_score: string;
    semester_name: string;
    avg_total2: number;
  }[];
  summary: {
    t_attend_cnt: number;
    t_require_cnt: number;
    t_total_score: number;
    t_require_score: number;
    t_avg_total: number;
    t_div_score: number;
    t_avg_score: number;
    unfinished_count: number;
  };
};

export async function getTotalScores() {
  const response = await authedFetch("scores", { method: "GET", body: null });

  const data = (await response.json()) as TotalScore;

  if (!data.results) return null;

  return data;
}
