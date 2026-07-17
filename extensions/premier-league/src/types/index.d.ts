export interface EPLContent<T> {
  content: T[];
  pageInfo: PageInfo;
}

export interface EPLPagination<T> {
  pagination: Pagination;
  data: T[];
}

export interface EPLMetadata {
  metadata: Metadata;
}

export interface EPLAward {
  manager_awards: Player[];
  player_awards: Player[];
}

export interface EPLPlayerStats {
  stats: { [key: string]: number };
  player: Player;
}

export interface EPLStandings {
  matchweek: number;
  tables: Table[];
  season: SeasonInfo;
  competition: Competition;
  deductions: unknown[];
  live: boolean;
}

export interface EPLMatchEvents {
  awayTeam: TeamEvents;
  homeTeam: TeamEvents;
}

export interface EPLMatchLineups {
  home_team: TeamLineup;
  away_team: TeamLineup;
}

export interface EPLMatchOfficials {
  matchId: string;
  matchOfficials: MatchOfficial[];
}

export interface EPLTeamSquad {
  players: Player[];
  id: EPLCompetition;
  team: Team;
}

export interface Career {
  seasonsInPremierLeague: string[];
  firstPremierLeagueFixtureId: string;
  seasonsAtCurrentTeam: string[];
}

export interface Country {
  isoCode: string;
  country: string;
  demonym: null | string;
}

export interface Team {
  name: string;
  id: string;
  shortName: string;
  abbr: string;
  loan?: number;
  score: number;
  halfTimeScore: number;
  redCards: number;
}

export interface Dates {
  joinedClub: string;
  birth: string;
}

export interface Player {
  currentTeam: Team;
  date: string;
  country: Country;
  shirtNum: string | number;
  weight: number;
  dates: Dates;
  type: string;
  countryOfBirth: string;
  name: AwardName;
  id: string;
  position: string;
  preferredFoot?: string;
  height: number;
  career: Career;
  role: string;
  firstName: string;
  lastName: string;
  isCaptain: boolean;
  knownName?: string;
  subPosition?: string;
}

export interface PlayerSeasonId {
  competitionId: string;
  seasonId: string;
  playerId: string;
}

export interface AwardName {
  last: string;
  display: string;
  first: string;
  known?: string;
}

export interface Competition {
  code: string;
  name: string;
  id: string;
}

export interface Table {
  entries: Entry[];
}

export interface Entry {
  away: TeamStats;
  overall: TeamStats;
  team: Team;
  home: TeamStats;
  form?: Fixture[];
  next?: Fixture;
}

export interface TeamStats {
  goalsFor: number;
  lost: number;
  won: number;
  position: number;
  drawn: number;
  goalsAgainst: number;
  played: number;
  points: number;
  startingPosition?: number;
}

export interface TeamForm extends Team {
  next: Fixture;
  form: Fixture[];
}

export interface Fixture {
  kickoffTimezone: string;
  competitionId: string;
  period: string;
  matchWeek: number;
  kickoff: string;
  awayTeam: Team;
  seasonInfo: SeasonInfo;
  competition: string;
  clock: string;
  kickoffTimezoneString: string;
  season: string;
  homeTeam: Team;
  ground: string;
  resultType: string;
  matchId: string;
  attendance?: number;
}

export interface SeasonInfo {
  name: string;
  id: string;
}

export interface EPLCompetition {
  competitionId: string;
  seasonId: string;
  competitionLabel: string;
  seasons: Season[];
}

export interface Season {
  seasonId: string;
  label: string;
  annotations: Annotation[];
  qualification: Qualification[];
  relegation: string[];
}

export interface Annotation {
  teamId?: string;
  comment: string;
}

export interface Qualification {
  competitionId: string;
  label: string;
  positions: string[];
  teamIds?: string[];
}

export interface Club {
  name: string;
  stadium: Stadium;
  id: string;
  shortName: string;
  abbr: string;
}

export interface Stadium {
  country: string;
  city: string;
  name: string;
  capacity: number;
}

export interface Pagination {
  _limit: number;
  _prev: null;
  _next: null;
}

export interface TeamLineup {
  players: Player[];
  teamId: string;
  formation: Formation;
  managers: Player[];
}

export interface Formation {
  subs: string[];
  teamId: string;
  lineup: Array<string[]>;
  formation: string;
}

export interface TeamEvents {
  cards: MatchEvent[];
  subs: MatchEvent[];
  name: string;
  id: string;
  shortName: string;
  goals: MatchEvent[];
}

export interface MatchEvent {
  period: string;
  time: string;
  type: string;
  playerId: string;
  timestamp: string;
  goalType: string;
  assistPlayerId: null | string;
  playerOnId: string;
  playerOffId: string;
}

export interface MatchCommentary {
  player1: string;
  team1: string;
  comment: string;
  time: string;
  type: string;
  timestamp: Date;
  player2?: string;
  team2?: string;
}

export interface MatchOfficial {
  official: Official;
  type: string;
}

export interface Official {
  firstName: string;
  lastName: string;
  name: string;
}

export interface EPLContentReport {
  pageInfo: PageInfo;
  content: Content[];
}

export interface Content {
  id: number;
  accountId: number;
  type: string;
  title: string;
  description: null;
  date: Date;
  location: string;
  coordinates: number[];
  commentsOn: boolean;
  copyright: null;
  publishFrom: number;
  publishTo: number;
  tags: Tag[];
  platform: string;
  language: string;
  additionalInfo: unknown;
  canonicalUrl: string;
  references: Reference[];
  related: unknown[];
  metadata: ContentMetadata;
  titleTranslations: null;
  lastModified: number;
  titleUrlSegment: string;
  visibilityOrder: unknown[];
  body: string;
  author: null;
  subtitle: null;
  summary: null;
  hotlinkUrl: null;
  duration: number;
  contentSummary: null;
  leadMedia: null;
  imageUrl: null;
  onDemandUrl: null;
}

export interface ContentMetadata {
  awayTeamMatchReportLinkText: string;
  awayTeamMatchReportURL: string;
  awayTeamOptaID: string;
  homeTeamMatchReportLinkText: string;
  homeTeamMatchReportURL: string;
  homeTeamOptaID: string;
}

export interface Reference {
  label: null;
  id: number;
  type: string;
  sid: string;
}

export interface Tag {
  id: number;
  label: string;
}

export interface PageInfo {
  page: number;
  numPages: number;
  pageSize: number;
  numEntries: number;
}

export interface EPLPlayerSearch {
  found: number;
  hits: Hit[];
}

export interface Hit {
  contentType: string;
  data: Data;
  contentReference: null;
}

export interface Data {
  context: string;
  type: string;
  language: string;
  objectId: number;
  title: string;
  tags: unknown[];
  customFields: unknown;
  visibility: string;
  objectSid: string;
  otherFields: OtherFields;
  imageUrl: unknown[];
}

export interface OtherFields {
  teamName: string;
  country: string;
  user_group_restricted: string;
  teamId: string;
  last_name: string;
  teamShortName: string;
  position: string;
  teamAbbr: string;
  first_name: string;
  knownName: string;
}

export interface Metadata {
  club_established: string;
  club_instagram_handle: string;
  club_shop: string;
  club_stadium: string;
  club_tiktok_handle: string;
  club_website: string;
  club_x_handle: string;
  shirt_url: string;
}
