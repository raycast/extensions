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
  phase: Phase;
  outcome: Outcome;
  attendance?: number;
  clock?: Clock;
  fixtureType: FixtureType;
  extraTime: boolean;
  shootout: boolean;
  goals: Goal[];
  penaltyShootouts: any[];
  behindClosedDoors: boolean;
  id: number;
  altIds: AltIDS;
}

export interface AltIDS {
  opta: string;
}

export interface Clock {
  secs: number;
  label: string;
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
  description: CompetitionDescription;
  level: Level;
  source: string;
  id: number;
  altIds: AltIDS;
}

export enum Abbreviation {
  EnPR = "EN_PR",
}

export enum CompetitionDescription {
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

export interface Goal {
  personId: number;
  clock: Clock;
  phase: string;
  type: TypeEnum;
  description: TypeEnum;
  assistId?: number;
}

export enum TypeEnum {
  G = "G",
  O = "O",
  P = "P",
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

export enum Outcome {
  A = "A",
  D = "D",
  H = "H",
}

export enum Phase {
  F = "F",
}

export enum Status {
  C = "C",
  L = "L",
  U = "U",
}

export interface TeamElement {
  team: TeamTeam;
  score: number;
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
