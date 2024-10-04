export type LeagueStandingsResponse = {
  competition: Competition;
  season: Season;
  standings: Standing[];
};

export type Competition = {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string;
};

export type Season = {
  id: number;
  startDate: string;
  endDate: string;
  currentMatchday: number;
  winner: Winner | null;
};

export type Winner = {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  address: string;
  website: string;
  founded: number;
  clubColors: string;
  venue: string | null;
  lastUpdated: string;
};

export type Standing = {
  stage: string;
  type: string;
  group: string;
  table: Table[];
};

export type Table = {
  position: number;
  team: Team;
  playedGames: number;
  form: string | null;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type Team = {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
};
