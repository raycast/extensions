export type DbInfo = {
  bestReportedTier: string;
  confidence: string;
  score: number;
  tier: string;
  total: number;
  trendingTier: string;
};

export type SteamGame = {
  appid: number;
  name: string;
  score: number;
};
