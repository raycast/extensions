export interface Game {
  id: string;
  homeTeam: NBATeam;
  awayTeam: NBATeam;
  status: {
    state: string;
    description: string;
    quarter: number;
  };
  lastPlay: string;
}

export type PlayerTotal = {
  shortName: string;
  total: string;
};

export type Team = {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo: string;
  record: string;
};

export interface NBATeam extends Team {
  stats: {
    score: string;
    fieldGoalPct: string;
    threePointPct: string;
    freeThrowPct: string;
    teamRebounds: string;
    teamAssists: string;
  };
  leaders: {
    points: PlayerTotal;
    rebounds: PlayerTotal;
  };
}
