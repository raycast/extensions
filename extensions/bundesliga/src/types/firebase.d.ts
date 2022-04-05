export interface Table {
  competition: Competition;
  creationDateTime: Date;
  entries: Entry[];
  matchday: Competition;
  qualifications: Qualification[];
  season: Competition;
}

export interface Competition {
  id: string;
  name: string;
}

export interface Entry {
  club: Club;
  draws: number;
  gamesPlayed: number;
  goalDifference: number;
  goalsAgainst: number;
  goalsScored: number;
  losses: number;
  points: number;
  qualification: string;
  rank: number;
  subRank: number;
  tendency: Tendency;
  wins: number;
  qualificationColor?: string;
}

export interface Club {
  dflDatalibraryClubId: string;
  id: string;
  logoUrl: string;
  nameFull: string;
  nameShort: string;
  slugifiedFull: string;
  slugifiedSmall: string;
  threeLetterCode: string;
}

export enum Tendency {
  Down = "DOWN",
  Stable = "STABLE",
  Up = "UP",
}

export interface Qualification {
  color: string;
  id: string;
  title: string;
}

export interface Matchday {
  dflDatalibraryCompetitionId: string;
  dflDatalibraryMatchId: string;
  dflDatalibraryMatchdayId: string;
  dflDatalibrarySeasonId: string;
  highlight: Highlight;
  kickOff: string;
  liveBlogUrl: string;
  matchId: string;
  matchStatus: string;
  matchday: number;
  matchdayId: string;
  matchdayLabel: string;
  matchdayRange: MatchdayRange;
  minuteOfPlay: MinuteOfPlay;
  plannedKickOff: string;
  score: Score;
  seasonOrder: number;
  slugs: Slugs;
  stadiumIconUrlBlack: string;
  stadiumIconUrlWhite: string;
  stadiumName: string;
  teams: Teams;
}

export interface Highlight {
  video: Video;
}

export interface Video {
  duration: number;
  videoId: string;
}

export interface MatchdayRange {
  end: string;
  start: string;
}

export interface MinuteOfPlay {
  injuryTime: number;
  minute: number;
}

export interface Score {
  away: TeamScore;
  home: TeamScore;
}

export interface TeamScore {
  halftime: number;
  live: number;
}

export interface Slugs {
  slugLong: string;
  slugShort: string;
}

export interface Teams {
  away: Team;
  home: Team;
}

export interface Team {
  boxOfficeUrl: string;
  dflDatalibraryClubId: string;
  gradientEndColor: string;
  gradientStartColor: string;
  logoUrl: string;
  nameFull: string;
  nameShort: string;
  textColor: string;
  threeLetterCode: string;
}
