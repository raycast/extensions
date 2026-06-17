export type Summoner = {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIcon: number;
  displayName: string | null;
  platform: string;
  team: string | null;
  role: "PRO" | "PLAYER";
};

export type SummonerWithAssets = Summoner & {
  playerIcon: string;
  profileIcon: string;
  teamIcon?: string;
};

export type ChampionImage = {
  full: string;
};

export type Champion = {
  id: string;
  name: string;
  image: ChampionImage;
};

export type ChampionResponse = {
  data: Record<string, Champion>;
};
