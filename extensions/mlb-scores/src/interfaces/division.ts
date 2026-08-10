export default interface DivisionInterface {
  copyright: string;
  divisions: DivisionElement[];
}

export interface DivisionElement {
  id: number;
  name: string;
  season: string;
  nameShort: string;
  link: string;
  abbreviation: string;
  league: League;
  sport: League;
  hasWildcard: boolean;
  sortOrder: number;
  numPlayoffTeams: number;
  active: boolean;
}

export interface League {
  id: number;
  link: string;
}
