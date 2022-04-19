export default interface LeagueInterface {
  copyright: string;
  leagues: LeagueElement[];
}

export interface LeagueElement {
  id: number;
  name: string;
  link: string;
  abbreviation: string;
  nameShort: string;
  seasonState: string;
  hasWildCard: boolean;
  hasSplitSeason: boolean;
  numGames: number;
  hasPlayoffPoints: boolean;
  numTeams: number;
  numWildcardTeams: number;
  seasonDateInfo: SeasonDateInfo;
  season: string;
  orgCode: string;
  conferencesInUse: boolean;
  divisionsInUse: boolean;
  sport: Sport;
  sortOrder: number;
  active: boolean;
}

export interface SeasonDateInfo {
  seasonId: string;
  regularSeasonStartDate: Date;
  regularSeasonEndDate: Date;
  preSeasonStartDate: Date;
  preSeasonEndDate: Date;
  postSeasonStartDate: Date;
  postSeasonEndDate: Date;
  lastDate1stHalf: Date;
  firstDate2ndHalf: Date;
  allStarDate: Date;
}

export interface Sport {
  id: number;
  link: string;
}
