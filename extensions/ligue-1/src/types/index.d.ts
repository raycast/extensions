export interface Player {
  id: string;
  name: string;
  img: string;
  position: string;
  number: string;
}

export interface L1Standings {
  competitionType: string;
  season: number;
  standings: { [key: string]: Standing };
}

export interface L1Matches {
  matches: Match[];
}

export interface L1GameWeeks {
  nearestGameWeeks: NearestGameWeeks;
}

export interface Standing {
  clubId: string;
  clubIdentity: ClubIdentity;
  againstGoals: number;
  forGoals: number;
  goalsDifference: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  points: number;
  gameWeekStartingRank: number;
  rank: number;
  rankDelta: number;
  seasonResults: unknown[];
  allSeasonResults: unknown[];
  higherWinsInARow: number;
  qualifiedFor?: string;
}

export interface Match {
  matchId: string;
  championshipId: number;
  gameWeekNumber: number;
  date: Date;
  dateTimeUnknown: boolean;
  period: string;
  isLive: boolean;
  broadcasters: Broadcasters;
  home: Club;
  away: Club;
}

export interface Club {
  clubId: string;
  score: number;
  clubIdentity: ClubIdentity;
}

export interface ClubIdentity {
  id: string;
  name: string;
  officialName: string;
  shortName: string;
  displayName: string;
  businessName: string;
  trigram: string;
  primaryColor: string;
  secondaryColor: string;
  assets: Assets;
  preferMonochromeLogo: boolean;
}

export interface Assets {
  logo: Logo;
  whiteLogo: Logo;
}

export interface Logo {
  small: string;
  medium: string;
  large: string;
}

export interface NearestGameWeeks {
  currentGameWeek: TGameWeek;
  nextGameWeek: TGameWeek;
}

export interface TGameWeek {
  gameWeekNumber: number;
  matchesIds: string[];
  startDate: Date;
  endDate: Date;
  displayEndDate: Date;
  lastRegularMatchDate: Date;
}
