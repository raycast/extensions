export interface Fixture {
  pageInfo: PageInfo;
  content: Content[];
}

export interface Content {
  gameweek: Gameweek;
  kickoff: Kickoff;
  provisionalKickoff: Kickoff;
  teams: TeamElement[];
  replay: boolean;
  ground: Ground;
  neutralGround: boolean;
  status: Status;
  phase: string;
  fixtureType: FixtureType;
  extraTime: boolean;
  shootout: boolean;
  goals: any[];
  penaltyShootouts: any[];
  behindClosedDoors: boolean;
  id: number;
  altIds: AltIDS;
}

export interface AltIDS {
  opta: string;
}

export enum FixtureType {
  Regular = "REGULAR",
}

export interface Gameweek {
  id: number;
  compSeason: CompSeason;
  gameweek: number;
  competitionPhase: CompetitionPhase;
}

export interface CompSeason {
  label: Label;
  competition: Competition;
  id: number;
}

export interface Competition {
  abbreviation: Abbreviation;
  description: Description;
  level: Level;
  source: string;
  id: number;
  altIds: AltIDS;
}

export enum Abbreviation {
  EnPR = "EN_PR",
}

export enum Description {
  PremierLeague = "Premier League",
}

export enum Level {
  Sen = "SEN",
}

export enum Label {
  The202122 = "2021/22",
}

export interface CompetitionPhase {
  id: number;
  type: Type;
  gameweekRange: number[];
}

export enum Type {
  L = "L",
}

export interface Ground {
  name: string;
  city: string;
  source: Source;
  id: number;
}

export enum Source {
  Opta = "OPTA",
}

export interface Kickoff {
  completeness: number;
  millis?: number;
  label?: string;
  gmtOffset?: number;
}

export enum Status {
  U = "U",
}

export interface TeamElement {
  team: TeamTeam;
}

export interface TeamTeam {
  name: string;
  club: Club;
  teamType: TeamType;
  shortName: string;
  id: number;
  altIds: AltIDS;
}

export interface Club {
  name: string;
  shortName: string;
  abbr: string;
  id: number;
}

export enum TeamType {
  First = "FIRST",
}

export interface PageInfo {
  page: number;
  numPages: number;
  pageSize: number;
  numEntries: number;
}
