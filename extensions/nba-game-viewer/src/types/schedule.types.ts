type Day = {
  date: string;
  games: Array<Game>;
};

type Game = {
  id: string;
  name: string;
  shortName: string;
  time: string;
  competitors: Array<Competitor>;
  status: Status;
  stream: string;
};

type Competitor = {
  displayName: string;
  shortName: string;
  logo: string;
  home: string;
};

type Status = {
  period: number;
  clock: number;
  completed: boolean;
  inProgress: boolean;
};

export type { Day, Game, Competitor, Status };
