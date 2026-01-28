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
  dateQuality: string;
  dflDatalibraryCompetitionId: string;
  dflDatalibraryMatchId: string;
  dflDatalibraryMatchdayId: string;
  dflDatalibrarySeasonId: string;
  highlight: Highlight;
  kickOff: string;
  liveBlogEntries: LiveBlogEntries;
  liveBlogInfos: LiveBlogInfos;
  liveBlogUrl: string;
  matchId: string;
  matchStatus: MatchS;
  matchday: number;
  matchdayId: string;
  matchdayLabel: string;
  matchdayRange: MatchdayRange;
  minuteOfPlay: MinuteOfPlay;
  plannedKickOff?: string;
  referee: Referee;
  score: Score;
  seasonOrder: number;
  slugs: Slugs;
  stadiumIconUrlBlack: string;
  stadiumIconUrlWhite: string;
  stadiumName: string;
  teams: Teams;
  deltatreMatchId: number;
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

export interface Referee {
  displayName: string;
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

export interface LiveBlogEntries {
  [key: string]: LiveBlogEntryItem;
}

export interface LiveBlogEntryItem {
  conference: boolean;
  detail: LiveBlogEntryItemDetail;
  entryDate: string;
  entryType: string;
  matchSection: MatchS;
  order: number;
  playtime: MinuteOfPlay;
  side: Side;
}

export interface LiveBlogEntryItemDetail {
  in: In;
  out: In;
  score: DetailScore;
  scorer: In;
  xG: number;
  person: In;
  videoId: string;
  duration: number;
  headline: string;
  text: string;
  embedId: string;
  embedPlatform: string;
  copyright: string;
  url: string;
  away: PurpleAway | FluffyAway | TentacledAway;
  home: PurpleAway | FluffyAway | TentacledAway;
  matchFact: boolean;
  title: string;
  type: string;
  metric: string;
  ranking: Ranking[];
  decision: string;
  review: string;
  situation: string;
}

export interface In {
  dflDatalibraryObjectId: string;
  imageUrl: string;
  name: string;
}

export interface LiveBlogInfos {
  awayIsTyping: boolean;
  homeIsTyping: boolean;
  isTyping: boolean;
}

export enum MatchS {
  FinalWhistle = "FINAL_WHISTLE",
  FirstHalf = "FIRST_HALF",
  Half = "HALF",
  PreMatch = "PRE_MATCH",
  SecondHalf = "SECOND_HALF",
}

export interface Ranking {
  person: In;
  rank: number;
  side: Side;
  value: number;
  unit?: string;
}

export interface DetailScore {
  away: number;
  home: number;
}

export enum Side {
  Away = "away",
  Home = "home",
  None = "none",
}

export interface PurpleAway {
  person: In;
  value: number;
}

export interface FluffyAway {
  relativeValue: number;
  value: number;
}

export interface TentacledAway {
  primaryLabel: string;
  primaryValue: number;
  secondaryLabel: string;
  secondaryValue: number;
}

export interface SeasonConfig {
  lastUpdateDateTime: Date;
  matchday: Matchday;
  pre?: string[];
  seasonState: string;
  season: {
    dflDatalibrarySeasonId: string;
    seasonId: string;
    name: string;
    firstMatchdayStart: string;
  };
}
