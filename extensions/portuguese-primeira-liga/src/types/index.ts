export interface Table {
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

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface Preferences {
  apiKey: string;
}

export interface Newspaper {
  title: string | undefined;
  cover: string | undefined;
  url: string | undefined;
  name: string | undefined;
}
