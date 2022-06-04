export interface Competition {
  id: number;
  area: {
    id: number;
    name: string;
    code: string;
    flag: string;
  };
  name: string;
  code: string;
  type: string;
  emblem: string;
  plan: string;
  currentSeason: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  };
  numberOfAvailableSeasons: number;
  lastUpdated: string;
}

export enum MatchStatus {
  InPlay = 'IN_PLAY',
  Paused = 'PAUSED',
  Timed = 'TIMED',
  Finished = 'FINISHED',
}

export enum MatchWinner {
  HomeTeam = 'HOME_TEAM',
  AwayTeam = 'AWAY_TEAM',
  Draw = 'DRAW',
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface Match {
  area: {
    id: number;
    name: string;
    code: string;
    flag: string;
  };
  competition: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem: string;
  };
  season: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
    winner: null;
  };
  id: number;
  utcDate: string;
  status: MatchStatus;
  matchday: number;
  stage: string;
  group: null;
  lastUpdated: string;
  homeTeam: Team;
  awayTeam: Team;
  score: {
    winner?: MatchWinner;
    duration: string;
    fullTime: {
      home?: number;
      away?: number;
    };
    halfTime: {
      home?: number;
      away?: number;
    };
  };
}

export interface StandingPosition {
  position: number;
  team: Team;
  playedGames: number;
  form: string;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface Standing {
  stage: string;
  type: string;
  group: string;
  table: StandingPosition[];
}

export interface StandingPositionRowData {
  key: keyof StandingPosition;
  header: string;
}
