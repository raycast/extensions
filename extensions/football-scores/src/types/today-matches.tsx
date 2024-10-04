export type MatchesResponse = {
  resultSet: ResultSet;
  matches: Match[];
};

export type ResultSet = {
  count: number;
  competitions: string;
  first: string;
  last: string;
  played: number;
};

export type Match = {
  area: Area;
  competition: Competition;
  season: Season;
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: string | null;
  lastUpdated: string;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
  odds: Odds;
};

export type Area = {
  id: number;
  name: string;
  code: string;
  flag: string;
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
  winner: string | null;
};

export type Team = {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
};

export type Score = {
  winner: string | null;
  duration: string;
  fullTime: Time;
  halfTime: Time;
};

export type Time = {
  home: number | null;
  away: number | null;
};

export type Odds = {
  msg: string;
};
