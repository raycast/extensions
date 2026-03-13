// Match detail types for comprehensive match information

export type MatchDetailTeam = {
  id: number;
  name: string;
  shortName: string;
  score: number;
  formation?: string;
  color?: string;
  coach?: {
    id: number;
    name: string;
  };
};

export type MatchDetailPlayer = {
  id: number;
  name: string;
  shortName: string;
  position: string;
  shirtNumber: number;
  isSubstitute: boolean;
  minutesPlayed?: number;
  events?: MatchEvent[];
  rating?: number;
};

export type MatchEvent = {
  id: string;
  type: "goal" | "card" | "substitution" | "penalty" | "own_goal" | "var";
  minute: number;
  minuteExtra?: number;
  playerId: number;
  playerName: string;
  assistPlayerId?: number;
  assistPlayerName?: string;
  cardType?: "yellow" | "red";
  substitutionType?: "in" | "out";
};

export type MatchStats = {
  possession?: {
    home: number;
    away: number;
  };
  shots?: {
    home: number;
    away: number;
  };
  shotsOnTarget?: {
    home: number;
    away: number;
  };
  corners?: {
    home: number;
    away: number;
  };
  fouls?: {
    home: number;
    away: number;
  };
  yellowCards?: {
    home: number;
    away: number;
  };
  redCards?: {
    home: number;
    away: number;
  };
  offsides?: {
    home: number;
    away: number;
  };
  passes?: {
    home: number;
    away: number;
  };
  passAccuracy?: {
    home: number;
    away: number;
  };
};

export type MatchReferee = {
  id: number;
  name: string;
  country?: string;
};

export type MatchVenue = {
  id: number;
  name: string;
  city: string;
  country: string;
  capacity?: number;
};

export type MatchDetailStatus = {
  utcTime: string;
  started: boolean;
  cancelled: boolean;
  finished: boolean;
  ongoing: boolean | null;
  postponed: boolean;
  abandoned: boolean;
  liveTime: {
    short: string;
    long: string;
    maxTime: number;
  } | null;
  reason: {
    short: string;
    long: string;
  } | null;
};

export type MatchDetailData = {
  id: number;
  home: MatchDetailTeam;
  away: MatchDetailTeam;
  status: MatchDetailStatus;
  tournament: {
    id: number;
    name: string;
    leagueId: number;
    round?: string;
    season?: string;
  };
  venue?: MatchVenue;
  referee?: MatchReferee;
  events?: MatchEvent[];
  lineups?: {
    home: MatchDetailPlayer[];
    away: MatchDetailPlayer[];
  };
  substitutions?: MatchEvent[];
  stats?: MatchStats;
  attendance?: number;
  weather?: {
    temperature: number;
    description: string;
  };
};

// Simplified view model for display
export type MatchSummary = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  time: string;
  tournament: string;
  venue?: string;
};
