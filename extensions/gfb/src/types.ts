export type MatchItem = {
  date: Date;
  leagueId: number;
  leagueName: string;
  away: {
    id: string;
    name: string;
    score?: number;
  };
  home: {
    id: string;
    name: string;
    score?: number;
  };
  status: {
    utcTime: Date;
    started: boolean;
    cancelled: boolean;
    finished: boolean;
    scoreStr?: string;
    reason?: {
      short: string;
      shortKey: string;
      long: string;
      longKey: string;
    };
  };
  pageUrl: string;
  matchLink: string;
  winner: string;
};

export type MatchData = MatchItem[];

export type LeagueData = {
  overview?: {
    leagueOverviewMatches: MatchItem[];
  };
  details?: {
    name: string;
  };
};

export type Preferences = {
  startDateOffset: string;
  endDateOffset: string;
  team1: string;
  league1: string;
  team2: string;
  league2: string;
  team3: string;
  league3: string;
  team4: string;
  league4: string;
  team5: string;
  league5: string;
};
