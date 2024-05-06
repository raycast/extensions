interface Country {
  alpha2: string;
  alpha3: string;
  name: string;
}

interface Team {
  name: string;
  slug: string;
  shortName: string;
  gender: string;
  sport: {
    id: number;
    name: string;
    slug: string;
  };
  userCount: number;
  nameCode: string;
  ranking: number;
  disabled: boolean;
  national: boolean;
  type: number;
  id: number;
  country: Country;
  teamColors: {
    primary: string | null;
    secondary: string | null;
    text: string | null;
  };
}

interface PlayerDetails {
  rowName: string;
  ranking: number;
  points: number;
  id: number;
  bestRanking?: number | null;
  bestRankingDateTimestamp?: string | null;
  category: string;
  country: Country;
  disabled: string | null;
  displayInverseHomeAwayTeams: string | null;
  firstName: string | null;
  gender: string;
  lastName: string | null;
  name: string;
  nameCode: string;
  national: boolean;
  position: string | null;
  shortName: string;
  slug: string;
  sport: {
    id: number;
    name: string;
    slug: string;
  };
  team: Team | null;
  teamColors: {
    primary: string | null;
    secondary: string | null;
    text: string | null;
  };
  type: number;
  userCount: number;
}

export type { PlayerDetails };
