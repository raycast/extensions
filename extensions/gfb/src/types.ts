export type MatchItem = {
  date: string;
  leagueId: string;
  leagueName: string;
  match: {
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
      utcTime: string;
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
  matchLink: string;
  winner: string;
};

export type MatchData = MatchItem[];

export type MatchStatus = {
  status: {
    cancelled: boolean;
    finished: boolean;
    started: boolean;
  };
};

export type LeaguePair = Record<string, string>;
