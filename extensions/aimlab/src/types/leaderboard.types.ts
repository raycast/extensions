type Leaderboard = {
  profiles: Array<Profile>;
  data: Array<LeaderboardData>;
  source: string;
  metadata: {
    offset: number;
    rows: number;
    totalRows: number;
  };
};

type Profile = {
  username: string;
  rank: {
    displayName: string;
    tier: string;
    level: number;
    minSkill: number;
    maxSkill: number;
  };
};

type LeaderboardData = {
  user_id: string;
  username: string;
  countries: [];
  total_score: number;
  rank: number;
  avg_score: number;
};

export type { Leaderboard, Profile, LeaderboardData };
