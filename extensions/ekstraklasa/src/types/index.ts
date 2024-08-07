export enum MATCH_RESULT {
  LOST = 0,
  DRAW = 1,
  WON = 2,
  UNKNOWN = 3,
}

export type Standing = {
  position: number;
  teamName: string;
  logoUrl: string;
  lastResults: MATCH_RESULT[];
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  teamPoints: number;
};

export type Table = {
  standings: Standing[];
};
