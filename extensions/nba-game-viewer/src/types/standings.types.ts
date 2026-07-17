export type StandingsResponse = {
  name: string;
  abbreviation: string;
  children: Array<ConferenceStanding>;
};

export type ConferenceStanding = {
  name: string;
  abbreviation: string;
  standings: {
    name: string;
    entries: Array<TeamStanding>;
  };
};

export type TeamStanding = {
  team: {
    id: number;
    location: string;
    name: string;
    abbreviation: string;
    displayName: string;
    logos: Array<{ href: string }>;
    links: Array<{ href: string }>;
  };
  stats: Array<Stat>;
};

export type Stat = {
  name: string;
  value: number;
  displayName: string;
  description: string;
  abbreviation: string;
  displayValue: string;
};

export type Team = {
  id: number;
  name: string;
  logo: string;
  link: string;
  seed?: number;
  wins?: number;
  losses?: number;
};
