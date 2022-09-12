type Team = {
  id: number;
  name: string;
  logo: string;
  link: string;
  rank: number;
  wins: number;
  losses: number;
};

type Conferences = {
  eastern: Array<Team>;
  western: Array<Team>;
};

export type { Team, Conferences };
