export interface EPLClub {
  pageInfo: PageInfo;
  content: TeamTeam[];
}

export interface EPLFixture {
  pageInfo: PageInfo;
  content: Content[];
}

export interface EPLPlayer {
  pageInfo: PageInfo;
  content: PlayerContent[];
}

export interface EPLStaff {
  compSeason: CompSeason;
  team: TeamTeam;
  players: PlayerContent[];
  officials: Official[];
}

export interface EPLStanding {
  compSeason: CompSeason;
  timestamp: Timestamp;
  live: boolean;
  dynamicallyGenerated: boolean;
  tables: Table[];
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

export interface Table {
  gameWeek: number;
  entries: Entry[];
}

export interface Entry {
  team: TeamTeam;
  position: number;
  startingPosition: number;
  overall: Stats;
  home: Stats;
  away: Stats;
  annotations?: Annotation[];
  form: Content[];
  next: Content;
  ground: Ground;
}

export interface Annotation {
  type: string;
  destination: string;
}

export interface Stats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDifference: number;
  points: number;
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
  capacity?: number;
  location?: Location;
  source: Source;
  id: number;
}

export interface Location {
  latitude: number;
  longitude: number;
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
  grounds: Ground[];
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

export interface Timestamp {
  millis: number;
  label: string;
}

export interface PlayerContent {
  // active: null;
  age: string;
  altIds: AltIDS;
  appearances: number;
  assists?: number;
  awards?: Awards;
  birth: Birth;
  cleanSheets: number;
  currentTeam?: TeamTeam;
  // debut: Timestamp;
  goals?: number;
  goalsConceded?: number;
  height?: number;
  id: number;
  info: Info;
  joinDate?: Timestamp;
  keyPasses?: number;
  latestPosition: LatestPosition;
  // leaveDate: null;
  // metadata: null;
  name: Name;
  nationalTeam?: NationalTeam;
  playerId: number;
  previousTeam?: TeamTeam;
  saves?: number;
  shots?: number;
  tackles?: number;
  // teamHistory: null;
  weight?: number;
}

export interface Birth {
  date: Timestamp;
  country: NationalTeam;
  place?: string;
}

export interface NationalTeam {
  isoCode: string;
  country: string;
  demonym?: string;
}

export interface Info {
  position: Position;
  shirtNum?: number;
  positionInfo: string;
  loan?: boolean;
}

export enum Position {
  D = "Defender",
  F = "Forward",
  G = "Goalkeeper",
  M = "Midfielder",
}

export interface Name {
  display: string;
  first: string;
  last: string;
  middle?: string;
}

export interface Awards {
  GOLDEN_GLOVE?: Award[];
  CHAMPIONS?: Award[];
  PLAYER_OF_THE_MONTH?: Award[];
  GOAL_OF_THE_MONTH?: Award[];
  GOLDEN_BOOT?: Award[];
  PLAYER_OF_THE_SEASON?: Award[];
}

export interface Award {
  date: CHAMPIONDate;
  compSeason: CHAMPIONCompSeason;
  notes?: string;
}

export interface CHAMPIONCompSeason {
  label: string;
  id: number;
}

export interface CHAMPIONDate {
  year: number;
  month: number;
  day: number;
}

export enum LatestPosition {
  Defender = "DEFENDER",
  Forward = "FORWARD",
  Goalkeeper = "GOALKEEPER",
  Midfielder = "MIDFIELDER",
}

export interface EPLPlayerSearch {
  status: Status;
  hits: Hits;
}

export interface Hits {
  cursor: null;
  found: number;
  hit: Hit[];
  start: number;
}

export interface Hit {
  id: string;
  contentType: string;
  response: PlayerContent;
}
