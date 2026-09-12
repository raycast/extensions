export enum Category {
  All = "All",
  UpcomingMatches = "Upcoming Matches",
  PrevFixtures = "Previous Fixtures",
  Squad = "Squad",
}

export type Country = {
  name: string;
  image_path: string;
};

export type Player = {
  id: string;
  name: string;
  date_of_birth: string;
  image_path: string;
  jersey_number: number | null;
  position?: string;
  country: Country;
};

export type Team = {
  id: string;
  name: string;
  image_path: string;
  players: Player[];
};

export type Season = {
  id: string;
  name: string;
  is_active: boolean;
};

export type League = {
  id: string;
  name: string;
  image_path: string;
  season?: Season;
};

export type Participant = {
  name: string;
  image_path: string;
};

export enum Location {
  Home = "home",
  Away = "away",
}

export enum Result {
  Win = "win",
  Loss = "loss",
  Draw = "draw",
}

export type Fixture = {
  id: string;
  name: string;
  starting_at: Date;
  league: League;
  venue: string;
  location: Location;
  result?: Result;
  participants: {
    host: Participant;
    away: Participant;
  };
  score?: {
    host_goals: number | null;
    away_goals: number | null;
  };
  tvstations?: {
    name: string;
    url: string;
  }[];
};

export type Standing = {
  name: string;
  img_path: string;
  position: number;
  points: number;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  recentForm: {
    name: string;
    result: "W" | "L" | "D";
  }[];
};

export type HookResponse<T, K> = {
  data: T[];
  error: string | null;
  isLoading: boolean;
  revalidate: K;
};
