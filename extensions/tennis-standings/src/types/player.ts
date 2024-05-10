export type Player = {
  ranking: number;
  careerHigh?: number;
  name: string;
  age: number;
  points: number;
  country: string;
  countryRank: number;
  rankingChange: number | null;
  pointsChange: number | null;
  currentTournament: string | null;
  next: number | null;
  max: number | null;
};
