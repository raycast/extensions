export type PlayerDetailData = {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  shortName?: string;
  imageUrl?: string;
  birthdate?: {
    utcTime: string;
    timezone: string;
  };
  meta?: {
    personId: number;
    position: string;
    positionDescription?: string;
    foot?: string;
    height?: number;
    weight?: number;
    country?: {
      id: string;
      name: string;
      countryCode: string;
    };
    nationalTeam?: {
      id: number;
      name: string;
      countryCode: string;
    };
  };
  primaryTeam?: {
    id: number;
    name: string;
    shortName?: string;
    teamColorPrimary?: string;
    teamColorSecondary?: string;
    teamColorText?: string;
  };
  careerHistory?: {
    careerItems?: CareerItem[];
    careerTitles?: CareerTitle[];
  };
  statSeasons?: StatSeason[];
  recentMatches?: RecentMatch[];
  nextMatch?: NextMatch;
  trophies?: Trophy[];
  news?: NewsItem[];
  marketValue?: MarketValue[];
  transferHistory?: TransferHistoryItem[];
};

export type CareerItem = {
  seasonName: string;
  seasonId: number;
  teamId: number;
  teamName: string;
  teamShortName?: string;
  leagueId: number;
  leagueName: string;
  appearances: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  rating?: number;
  yellowCards?: number;
  redCards?: number;
  startDate?: string;
  endDate?: string;
  onLoan?: boolean;
};

export type CareerTitle = {
  tournamentId: number;
  tournamentName: string;
  seasonName: string;
  teamId: number;
  teamName: string;
  titleType: string;
};

export type StatSeason = {
  seasonId: number;
  seasonName: string;
  tournamentId: number;
  tournamentName: string;
  teamId: number;
  teamName: string;
  stats: PlayerStats;
};

export type PlayerStats = {
  appearances: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  rating?: number;
  yellowCards?: number;
  redCards?: number;
  saves?: number;
  cleanSheets?: number;
  shotsOnTarget?: number;
  totalShots?: number;
  passAccuracy?: number;
  totalPasses?: number;
  keyPasses?: number;
  crosses?: number;
  tackles?: number;
  interceptions?: number;
  fouls?: number;
  offsides?: number;
};

export type RecentMatch = {
  id: number;
  date: string;
  status: string;
  finished: boolean;
  started: boolean;
  cancelled: boolean;
  scoreStr: string;
  home: {
    id: number;
    name: string;
    shortName: string;
  };
  away: {
    id: number;
    name: string;
    shortName: string;
  };
  tournament: {
    id: number;
    name: string;
    leagueId: number;
  };
  playerStats?: {
    rating?: number;
    minutesPlayed?: number;
    goals?: number;
    assists?: number;
    yellowCards?: number;
    redCards?: number;
    substitute?: boolean;
  };
};

export type NextMatch = {
  id: number;
  date: string;
  home: {
    id: number;
    name: string;
    shortName: string;
  };
  away: {
    id: number;
    name: string;
    shortName: string;
  };
  tournament: {
    id: number;
    name: string;
    leagueId: number;
  };
};

export type Trophy = {
  seasonId: number;
  seasonName: string;
  tournamentId: number;
  tournamentName: string;
  teamId: number;
  teamName: string;
  trophyType: string;
};

export type NewsItem = {
  id: string;
  title: string;
  teaser: string;
  imageUrl?: string;
  sourceStr: string;
  gmtTime: string;
  link: string;
};

export type MarketValue = {
  value: number;
  currency: string;
  date: string;
  provider: string;
};

export type TransferHistoryItem = {
  id: number;
  fromTeamId?: number;
  fromTeamName?: string;
  toTeamId: number;
  toTeamName: string;
  date: string;
  transferType: string;
  fee?: {
    feeText: string;
    localizedFeeText: string;
    value: number;
    currency: string;
  };
  onLoan: boolean;
  fromDate?: string;
  toDate?: string;
};

// Simplified player data for lists and search results
export type PlayerOverview = {
  id: number;
  name: string;
  shortName?: string;
  position?: string;
  age?: number;
  nationality?: string;
  teamId?: number;
  teamName?: string;
  imageUrl?: string;
  marketValue?: number;
  rating?: number;
};
