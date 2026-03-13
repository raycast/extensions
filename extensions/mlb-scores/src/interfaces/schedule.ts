export default interface ScheduleInterface {
  copyright: string;
  totalItems: number;
  totalEvents: number;
  totalGames: number;
  totalGamesInProgress: number;
  dates: DateElement[];
}

export interface DateElement {
  date: Date;
  totalItems: number;
  totalEvents: number;
  totalGames: number;
  totalGamesInProgress: number;
  games: Game[];
}

export interface Game {
  gamePk: number;
  link: string;
  gameType: GameType;
  season: string;
  gameDate: Date;
  officialDate: Date;
  status: Status;
  teams: Teams;
  venue: Venue;
  content: Content;
  gameNumber: number;
  publicFacing: boolean;
  doubleHeader: DoubleHeader;
  gamedayType: GamedayType;
  tiebreaker: DoubleHeader;
  calendarEventID: string;
  seasonDisplay: string;
  dayNight: DayNight;
  scheduledInnings: number;
  reverseHomeAwayStatus: boolean;
  inningBreakLength: number;
  gamesInSeries: number;
  seriesGameNumber: number;
  seriesDescription: SeriesDescription;
  recordSource: RecordSource;
  ifNecessary: DoubleHeader;
  ifNecessaryDescription: IfNecessaryDescription;
  resumedFrom?: Date;
  resumedFromDate?: Date;
}

export interface Content {
  link: string;
}

export enum DayNight {
  Day = "day",
  Night = "night",
}

export enum DoubleHeader {
  N = "N",
}

export enum GameType {
  R = "R",
}

export enum GamedayType {
  L = "L",
  P = "P",
}

export enum IfNecessaryDescription {
  NormalGame = "Normal Game",
}

export enum RecordSource {
  S = "S",
}

export enum SeriesDescription {
  RegularSeason = "Regular Season",
}

export interface Status {
  abstractGameState: AbstractGameState;
  codedGameState: string;
  detailedState: string;
  statusCode: string;
  startTimeTBD: boolean;
  abstractGameCode: GamedayType;
  reason?: string;
}

export enum AbstractGameState {
  Live = "Live",
  Preview = "Preview",
}

export interface Teams {
  away: Away;
  home: Away;
}

export interface Away {
  leagueRecord: LeagueRecord;
  score?: number;
  team: Venue;
  splitSquad: boolean;
  seriesNumber: number;
}

export interface LeagueRecord {
  wins: number;
  losses: number;
  pct: string;
}

export interface Venue {
  id: number;
  name: string;
  link: string;
}
