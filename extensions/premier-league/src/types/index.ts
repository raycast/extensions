export interface PremierLeague {
  compSeason: CompSeason;
  timestamp: Timestamp;
  live: boolean;
  dynamicallyGenerated: boolean;
  tables: Table[];
}

export interface CompSeason {
  label: string;
  competition: Competition;
  id: number;
}

export interface Competition {
  abbreviation: string;
  description: string;
  level: string;
  source: string;
  id: number;
  altIds: AltIDS;
}

export interface AltIDS {
  opta: string;
}

export interface Table {
  gameWeek: number;
  entries: Entry[];
}

export interface Entry {
  team: TeamTeam;
  position: number;
  startingPosition: number;
  overall: Away;
  home: Away;
  away: Away;
  annotations?: Annotation[];
  form: Form[];
  next: Next;
  ground: EntryGround;
}

export interface Annotation {
  type: string;
  destination: string;
}

export interface Away {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDifference: number;
  points: number;
}

export interface Form {
  gameweek: Gameweek;
  kickoff: Kickoff;
  provisionalKickoff: Kickoff;
  teams: FormTeam[];
  replay: boolean;
  ground: FormGround;
  neutralGround: boolean;
  status: FormStatus;
  phase: Phase;
  outcome: Outcome;
  attendance?: number;
  clock: Clock;
  fixtureType: FixtureType;
  extraTime: boolean;
  shootout: boolean;
  behindClosedDoors: boolean;
  id: number;
  altIds: AltIDS;
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
  gameweek: number;
}

export interface FormGround {
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
  millis: number;
  label: string;
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

export enum FormStatus {
  C = "C",
}

export interface FormTeam {
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

export interface EntryGround {
  name: string;
  city: string;
  capacity?: number;
  location?: Location;
  source: Source;
  id: number;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Next {
  gameweek: Gameweek;
  kickoff: Kickoff;
  provisionalKickoff: Kickoff;
  teams: NextTeam[];
  replay: boolean;
  ground: FormGround;
  neutralGround: boolean;
  status: NextStatus;
  phase: string;
  fixtureType: FixtureType;
  extraTime: boolean;
  shootout: boolean;
  behindClosedDoors: boolean;
  id: number;
  altIds: AltIDS;
}

export enum NextStatus {
  U = "U",
}

export interface NextTeam {
  team: TeamTeam;
}

export interface Timestamp {
  millis: number;
  label: string;
}
