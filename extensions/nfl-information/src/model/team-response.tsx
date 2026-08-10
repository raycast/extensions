export interface TeamResponse {
  sports: SportsItem[];
}
export interface SportsItem {
  id: string;
  uid: string;
  name: string;
  slug: string;
  leagues: LeaguesItem[];
}
export interface LeaguesItem {
  id: string;
  uid: string;
  name: string;
  abbreviation: string;
  shortName: string;
  slug: string;
  teams: TeamsItem[];
  year: number;
  season: Season;
}
export interface TeamsItem {
  team: Team;
}
export interface Team {
  id: string;
  uid: string;
  slug: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  name: string;
  nickname: string;
  location: string;
  color: string;
  alternateColor: string;
  isActive: boolean;
  isAllStar: boolean;
  logos: LogosItem[];
  links: LinksItem[];
}
export interface LogosItem {
  href: string;
  alt: string;
  rel: string[];
  width: number;
  height: number;
}
export interface LinksItem {
  language: string;
  rel: string[];
  href: string;
  text: string;
  shortText: string;
  isExternal: boolean;
  isPremium: boolean;
  isHidden: boolean;
}
export interface Season {
  year: number;
  displayName: string;
}
