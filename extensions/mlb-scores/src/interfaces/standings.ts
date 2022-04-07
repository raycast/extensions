export default interface StandingsInterface {
  copyright: string;
  records: Record[];
}

export interface Record {
  standingsType: string;
  league: Division;
  division: Division;
  sport: Division;
  lastUpdated: Date;
  teamRecords: TeamRecord[];
}

export interface Division {
  id: number;
  link: string;
}

export interface TeamRecord {
  team: Team;
  season: string;
  streak: Streak;
  divisionRank: string;
  leagueRank: string;
  sportRank: string;
  gamesPlayed: number;
  gamesBack: string;
  wildCardGamesBack: string;
  leagueGamesBack: string;
  springLeagueGamesBack: EGamesBack;
  sportGamesBack: string;
  divisionGamesBack: string;
  conferenceGamesBack: EGamesBack;
  leagueRecord: LeagueRecordElement;
  lastUpdated: Date;
  records: Records;
  runsAllowed: number;
  runsScored: number;
  divisionChamp: boolean;
  divisionLeader: boolean;
  hasWildcard: boolean;
  clinched: boolean;
  eliminationNumber: string;
  magicNumber?: string;
  wins: number;
  losses: number;
  runDifferential: number;
  winningPercentage: string;
  wildCardRank?: string;
  wildCardEliminationNumber?: string;
  wildCardLeader?: boolean;
}

export enum EGamesBack {
  Empty = "-",
}

export interface LeagueRecordElement {
  wins: number;
  losses: number;
  pct: string;
  division?: Team;
  type?: string;
  league?: Team;
}

export interface Team {
  id: number;
  name: string;
  link: string;
}

export interface Records {
  splitRecords: LeagueRecordElement[];
  divisionRecords: LeagueRecordElement[];
  overallRecords: LeagueRecordElement[];
  leagueRecords: LeagueRecordElement[];
  expectedRecords: LeagueRecordElement[];
}

export interface Streak {
  streakType: StreakType;
  streakNumber: number;
  streakCode: string;
}

export enum StreakType {
  Losses = "losses",
  WINS = "wins",
}
