export interface SpringLeague {
  id: number;
  name: string;
  link: string;
  abbreviation: string;
}

export interface Venue {
  id: number;
  name: string;
  link: string;
}

export interface SpringVenue {
  id: number;
  link: string;
}

export interface League {
  id: number;
  name: string;
  link: string;
}

export interface Division {
  id: number;
  name: string;
  link: string;
}

export interface Sport {
  id: number;
  link: string;
  name: string;
}

export interface Team {
  springLeague: SpringLeague;
  allStarStatus: string;
  id: number;
  name: string;
  link: string;
  season: number;
  venue: Venue;
  springVenue: SpringVenue;
  teamCode: string;
  fileCode: string;
  abbreviation: string;
  teamName: string;
  locationName: string;
  firstYearOfPlay: string;
  league: League;
  division: Division;
  sport: Sport;
  shortName: string;
  franchiseName: string;
  clubName: string;
  active: boolean;
}

export default interface Teams {
  copyright: string;
  teams: Team[];
}
