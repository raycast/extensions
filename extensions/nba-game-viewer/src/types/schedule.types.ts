export type Game = {
  id: string;
  name: string;
  shortName: string;
  date: string;
  competitors: Array<Competitor>;
  status: Status;
  stream?: string;
};

export type Competitor = {
  displayName: string;
  abbreviation: string;
  shortName: string;
  logo: string;
  home: string;
  score: string;
};

export type Status = {
  period: number;
  clock: string;
  completed: boolean;
  inProgress: boolean;
};

export type Day = {
  date: string;
  games: Array<Game>;
};
