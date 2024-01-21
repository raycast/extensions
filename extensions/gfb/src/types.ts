export type MatchItem = {
  date: Date;
  leagueId: string;
  leagueName: string;
  match: Match;
  matchLink: string;
  winner: string;
};

export type MatchData = MatchItem[];

export type Match = {
  id: string;
  pageUrl: string;
  opponent: {
    id: string;
    name: string;
    score?: number;
  };
  home: {
    id: string;
    name: string;
    score?: number;
  };
  away: {
    id: string;
    name: string;
    score?: number;
  };
  displayTournament: boolean;
  notStarted: boolean;
  tournament: Record<string, unknown>;
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
};

export type MatchStatus = {
  status: {
    cancelled: boolean;
    finished: boolean;
    started: boolean;
  };
};

export type LeaguePair = Record<string, string>;

export interface Preferences {
  cacheExpiryTime: string;
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
