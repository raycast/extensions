export type Venue = {
  address: {
    city: string;
    state: string;
  };
  fullName: string;
  indoor: boolean;
  id: string;
};

export type Game = {
  id: string;
  name: string;
  shortName: string;
  date: string;
  venue: Venue;
  tickets: {
    summary: string;
    numberAvailable: number;
    links: {
      href: string;
    }[];
  }[];
  competitors: Array<Competitor>;
  status: Status;
  stream?: string;
};

export type Competitor = {
  id: string;
  displayName: string;
  abbreviation: string;
  shortName: string;
  logo: string;
  color: string;
  alternateColor: string;
  home: string;
  score: number;
  linescores: {
    value: number;
  }[];
  records: {
    summary: string;
    name: string;
    type: string;
    abbreviation?: string;
  }[];
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
