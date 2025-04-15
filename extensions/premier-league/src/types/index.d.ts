export interface EPLContent<T> {
  content: T[];
  pageInfo: PageInfo;
}

export interface EPLFixtureEvents {
  events: EPLContent<FixtureEvent>;
  fixture: Fixture;
}

export interface FixtureEvent {
  assistId: number;
  clock?: Timestamp;
  description: string;
  id: number;
  persionId: number;
  phase?: string;
  playerIds?: number[];
  score: Score;
  teamId: number;
  text: string;
  time?: Timestamp;
  type: string;
}

export interface EPLAward {
  compSeason: CompSeason;
  monthAwards: Record<string, Award[]>;
  seasonAwards: Award[];
}

export interface EPLStaff {
  compSeason: CompSeason;
  officials: Player[];
  players: Player[];
  team: Team;
}

export interface EPLPlayer {
  entity: Player;
  stats: Stat[];
}

export interface Stat {
  additionalInfo: unknown;
  description: string;
  name: string;
  value: number;
}

export interface EPLStanding {
  compSeason: CompSeason;
  dynamicallyGenerated: boolean;
  live: boolean;
  tables: Table[];
  timestamp: Timestamp;
}

export interface Award {
  apiTeam?: Team;
  award: string;
  awardTypeId: number;
  official?: Player;
  player?: Player;
  relatedContent: RelatedContent[];
}

export interface RelatedContent {
  reference: string;
  type: string;
}

export interface Fixture {
  _source: string;
  altIds: AltIDS;
  attendance?: number;
  behindClosedDoors: boolean;
  clock?: Timestamp;
  events: FixtureEvent[];
  extraTime: boolean;
  fixtureType: string;
  gameweek: Gameweek;
  goals: FixtureEvent[];
  ground: Ground;
  halfTimeScore: Score;
  id: number;
  kickoff: Timestamp;
  matchOfficials: MatchOfficial[];
  metadata: Record<string, unknown>;
  neutralGround: boolean;
  outcome: string;
  penaltyShootouts: unknown[];
  phase: string;
  provisionalKickoff: Timestamp;
  replay: boolean;
  shootout: boolean;
  status: string;
  teamLists: TeamList[];
  teams: TeamScore[];
}

export interface TeamList {
  formation: Formation;
  lineup: Player[];
  substitutes: Player[];
  teamId: number;
}

export interface Formation {
  label: string;
  players: Array<number[]>;
}

export interface MatchOfficial {
  birth: Birth;
  id: number;
  matchOfficialId: number;
  name: Name;
  role: string;
}

export interface Score {
  awayScore: number;
  homeScore: number;
}

export interface Table {
  entries: Entry[];
  gameWeek: number;
}

export interface Entry {
  annotations?: Annotation[];
  away: Stats;
  form: Fixture[];
  ground: Ground;
  home: Stats;
  next: Fixture;
  overall: Stats;
  position: number;
  startingPosition: number;
  team: Team;
}

export interface Annotation {
  destination: string;
  type: string;
  description: string;
}

export interface Stats {
  drawn: number;
  goalsAgainst: number;
  goalsDifference: number;
  goalsFor: number;
  lost: number;
  played: number;
  points: number;
  won: number;
}

export interface AltIDS {
  opta: string;
}

export interface Gameweek {
  competitionPhase: CompetitionPhase;
  compSeason: CompSeason;
  gameweek: number;
  id: number;
}

export interface CompSeason {
  competition: Competition;
  id: number;
  label: string;
}

export interface Competition {
  abbreviation: string;
  altIds: AltIDS;
  description: string;
  id: number;
  level: string;
  source: string;
}

export interface CompetitionPhase {
  gameweekRange: number[];
  id: number;
  type: string;
}

export interface Ground {
  capacity?: number;
  city: string;
  id: number;
  location?: Location;
  name: string;
  source: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface TeamScore {
  score: number;
  team: Team;
}

export interface Team {
  altIds: AltIDS;
  club: Club;
  grounds: Ground[];
  id: number;
  metadata: {
    club_highlights_internal_description: string;
    club_highlights_internal_url: string;
    communities_facebook: string;
    communities_instagram: string;
    communities_twitter: string;
    communities_URL: string;
    communities_youtube: string;
  };
  name: string;
  shortName: string;
  teamType: string;
}

export interface Club {
  abbr: string;
  id: number;
  name: string;
  shortName: string;
}

export interface PageInfo {
  numEntries: number;
  numPages: number;
  page: number;
  pageSize: number;
}

export interface Timestamp {
  completeness?: number;
  gmtOffset?: number;
  label?: string;
  millis?: number;
  secs?: number;
}

export interface Player {
  active: boolean;
  age: string;
  altIds: AltIDS;
  appearances: number;
  assists?: number;
  awards?: Record<string, PlayerAward[]>;
  birth: Birth;
  captain: boolean;
  cleanSheets: number;
  currentTeam?: Team;
  // debut: Timestamp;
  goals?: number;
  goalsConceded?: number;
  height?: number;
  id: number;
  info: Info;
  joinDate?: Timestamp;
  keyPasses?: number;
  latestPosition: string;
  // leaveDate: null;
  matchPosition: Position;
  matchShirtNumber: number;
  // metadata: null;
  name: Name;
  nationalTeam?: Country;
  officialId: number;
  playerId: number;
  previousTeam?: Team;
  role: string;
  saves?: number;
  shots?: number;
  tackles?: number;
  // teamHistory: null;
  weight?: number;
}

export interface Birth {
  country: Country;
  date: Timestamp;
  place?: string;
}

export interface Country {
  country: string;
  demonym?: string;
  isoCode: string;
}

export interface Info {
  loan?: boolean;
  position: string;
  positionInfo: string;
  shirtNum?: number;
}

export interface Name {
  display: string;
  first: string;
  last: string;
  middle?: string;
}

export interface PlayerAward {
  compSeason: CompSeason;
  date: Date | number[];
  notes?: string;
}

export interface Date {
  day: number;
  month: number;
  year: number;
}

export interface EPLPlayerSearch {
  hits: Hits;
  status: string;
}

export interface Hits {
  cursor: null;
  found: number;
  hit: Hit[];
  start: number;
}

export interface Hit {
  contentType: string;
  id: string;
  response: Player;
}
