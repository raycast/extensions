export type MatchItem = {
  date: Date;
  leagueId: string;
  leagueName: string;
  away: {
    name: string;
    score?: number;
  };
  home: {
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
  matchLink: string;
  winner: string;
};

export type MatchData = MatchItem[];

export type LeaguePair = Record<string, string>;

export interface Preferences {
  cacheExpiryTime: string;
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
}
