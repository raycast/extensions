type TaskLeaderboard = {
  data: Array<TaskLeaderboardData>;
  source: string;
  metadata: {
    offset: number;
    rows: number;
    totalRows: number;
  };
};

type TaskLeaderboardData = {
  user_id: string;
  username: string;
  country: string;
  score: number;
  ended_at: string;
  task_duration: number;
  targets: number;
  kills: number;
  shots_fired: number;
  shots_hit: number;
  shots_hit_head: number;
  shots_hit_body: number;
  accuracy: number;
  shots_per_kill: number;
  time_per_kill: number;
  custom: object;
  play_id: string;
  rank: number;
  avg_score: number;
};

export type { TaskLeaderboard, TaskLeaderboardData };
