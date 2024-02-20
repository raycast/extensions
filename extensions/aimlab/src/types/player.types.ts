type Player = {
  id: string;
  username: string;
  ranking: Ranking;
  skillScores: Array<SkillScores>;
};

type Ranking = {
  rank: {
    displayName: string;
    tier: string;
    level: number;
    minSkill: number;
    maxSkill: number;
  };
  skill: number;
};

type SkillScores = {
  name: string;
  score: number;
};

export type { Player, Ranking, SkillScores };
