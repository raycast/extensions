export default interface FeedInterface {
  copyright: string;
  gamePk: number;
  link: string;
  metaData: MetaData;
  gameData: GameData;
  liveData: LiveData;
}

export interface GameData {
  game: Game;
  datetime: Datetime;
  status: Status;
  teams: GameDataTeams;
  players: { [key: string]: Player };
  venue: Venue;
  officialVenue: OfficialVenue;
  weather: Weather;
  gameInfo: GameInfo;
  review: Review;
  flags: Flags;
  probablePitchers: ProbablePitchers;
  officialScorer: OfficialScorer;
  primaryDatacaster: OfficialScorer;
}

export interface Datetime {
  dateTime: Date;
  originalDate: Date;
  officialDate: Date;
  dayNight: string;
  time: string;
  ampm: string;
}

export interface Flags {
  noHitter: boolean;
  perfectGame: boolean;
  awayTeamNoHitter: boolean;
  awayTeamPerfectGame: boolean;
  homeTeamNoHitter: boolean;
  homeTeamPerfectGame: boolean;
}

export interface Game {
  pk: number;
  type: AbstractGameCodeEnum;
  doubleHeader: DoubleHeader;
  id: string;
  gamedayType: GamedayType;
  tiebreaker: DoubleHeader;
  gameNumber: number;
  calendarEventID: string;
  season: string;
  seasonDisplay: string;
}

export enum DoubleHeader {
  N = "N",
}

export enum GamedayType {
  C = "C",
  CF = "CF",
  Dh = "DH",
  LF = "LF",
  P = "P",
  Ph = "PH",
  RF = "RF",
  Score = "score",
  Ss = "SS",
  The1B = "1B",
  The2B = "2B",
  The3B = "3B",
}

export enum AbstractGameCodeEnum {
  A = "A",
  B = "B",
  C = "C",
  Ch = "CH",
  D = "D",
  E = "E",
  F = "F",
  FS = "FS",
  Fc = "FC",
  Ff = "FF",
  H = "H",
  Kc = "KC",
  L = "L",
  M = "M",
  R = "R",
  S = "S",
  Si = "SI",
  Sl = "SL",
  T = "T",
  TypeB = "*B",
  V = "V",
  W = "W",
  X = "X",
  P = "P",
}

export interface GameInfo {
  attendance: number;
  firstPitch: Date;
  gameDurationMinutes: number;
}

export interface OfficialScorer {
  id: number;
  fullName: string;
  link: string;
}

export interface OfficialVenue {
  id: number;
  link: string;
}

export interface Player {
  id: number;
  fullName: string;
  link: string;
  firstName: string;
  lastName: string;
  primaryNumber: string;
  birthDate: Date;
  currentAge: number;
  birthCity: string;
  birthCountry: Country;
  height: string;
  weight: number;
  active: boolean;
  primaryPosition: Position;
  useName: string;
  middleName?: string;
  boxscoreName: string;
  nickName?: string;
  gender: AbstractGameCodeEnum;
  isPlayer: boolean;
  isVerified: boolean;
  draftYear?: number;
  pronunciation?: string;
  mlbDebutDate: Date;
  batSide: BatSide;
  pitchHand: BatSide;
  nameFirstLast: string;
  nameSlug: string;
  firstLastName: string;
  lastFirstName: string;
  lastInitName: string;
  initLastName: string;
  fullFMLName: string;
  fullLFMName: string;
  strikeZoneTop: number;
  strikeZoneBottom: number;
  birthStateProvince?: string;
  nameMatrilineal?: string;
  nameTitle?: string;
}

export interface BatSide {
  code: AbstractGameCodeEnum;
  description: Description;
}

export enum Description {
  Active = "Active",
  AutomaticBall = "Automatic Ball",
  Ball = "Ball",
  BallInDirt = "Ball In Dirt",
  CalledStrike = "Called Strike",
  Changeup = "Changeup",
  Cutter = "Cutter",
  Foul = "Foul",
  FoulTip = "Foul Tip",
  FourSeamFastball = "Four-Seam Fastball",
  HitByPitch = "Hit By Pitch",
  InPlayNoOut = "In play, no out",
  InPlayOutS = "In play, out(s)",
  InPlayRunS = "In play, run(s)",
  KnuckleCurve = "Knuckle Curve",
  Left = "Left",
  MissedBunt = "Missed Bunt",
  Right = "Right",
  Sinker = "Sinker",
  Slider = "Slider",
  Splitter = "Splitter",
  SwingingStrike = "Swinging Strike",
  SwingingStrikeBlocked = "Swinging Strike (Blocked)",
  Switch = "Switch",
}

export enum Country {
  Cuba = "Cuba",
  Curacao = "Curacao",
  DominicanRepublic = "Dominican Republic",
  Mexico = "Mexico",
  PuertoRico = "Puerto Rico",
  Usa = "USA",
  Venezuela = "Venezuela",
}

export interface Position {
  code: string;
  name: PrimaryPositionName;
  type: PrimaryPositionType;
  abbreviation: GamedayType;
}

export enum PrimaryPositionName {
  Catcher = "Catcher",
  DesignatedHitter = "Designated Hitter",
  FirstBase = "First Base",
  Outfielder = "Outfielder",
  PinchHitter = "Pinch Hitter",
  Pitcher = "Pitcher",
  SecondBase = "Second Base",
  Shortstop = "Shortstop",
  ThirdBase = "Third Base",
}

export enum PrimaryPositionType {
  Catcher = "Catcher",
  Hitter = "Hitter",
  Infielder = "Infielder",
  Outfielder = "Outfielder",
  Pitcher = "Pitcher",
}

export interface ProbablePitchers {
  away: OfficialScorer;
  home: OfficialScorer;
}

export interface Review {
  hasChallenges: boolean;
  away: ReviewAway;
  home: ReviewAway;
}

export interface ReviewAway {
  used: number;
  remaining: number;
}

export interface Status {
  abstractGameState: string;
  codedGameState: AbstractGameCodeEnum;
  detailedState: string;
  statusCode: AbstractGameCodeEnum;
  startTimeTBD: boolean;
  abstractGameCode: AbstractGameCodeEnum;
}

export interface GameDataTeams {
  away: PurpleAway;
  home: PurpleAway;
}

export interface PurpleAway {
  id: number;
  name: AwayName;
  link: Link;
  season: number;
  venue: Division;
  springVenue: OfficialVenue;
  teamCode: string;
  fileCode: string;
  abbreviation: string;
  teamName: string;
  locationName: string;
  firstYearOfPlay: string;
  league: Division;
  division: Division;
  sport: Division;
  shortName: string;
  record: Record;
  franchiseName: string;
  clubName: string;
  springLeague: Division;
  allStarStatus: DoubleHeader;
  active: boolean;
}

export interface Division {
  id: number;
  name: string;
  link: string;
  abbreviation?: Abbreviation;
}

export enum Abbreviation {
  Cl = "CL",
  Gl = "GL",
}

export enum Link {
  APIV1Teams117 = "/api/v1/teams/117",
  APIV1Teams119 = "/api/v1/teams/119",
}

export enum AwayName {
  HoustonAstros = "Houston Astros",
  LosAngelesDodgers = "Los Angeles Dodgers",
}

export interface Record {
  gamesPlayed: number;
  wildCardGamesBack: string;
  leagueGamesBack: string;
  springLeagueGamesBack: string;
  sportGamesBack: string;
  divisionGamesBack: string;
  conferenceGamesBack: string;
  leagueRecord: LeagueRecord;
  records: number;
  divisionLeader: boolean;
  wins: number;
  losses: number;
  winningPercentage: string;
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
  location: Location;
  timeZone: TimeZone;
  fieldInfo: FieldInfo;
  active: boolean;
}

export interface FieldInfo {
  capacity: number;
  turfType: string;
  roofType: string;
  leftLine: number;
  leftCenter: number;
  center: number;
  rightCenter: number;
  rightLine: number;
}

export interface Location {
  address1: string;
  city: string;
  state: string;
  stateAbbrev: string;
  postalCode: string;
  defaultCoordinates: DefaultCoordinates;
  country: Country;
  phone: string;
}

export interface DefaultCoordinates {
  latitude: number;
  longitude: number;
}

export interface TimeZone {
  id: string;
  offset: number;
  tz: string;
}

export interface Weather {
  condition: string;
  temp: string;
  wind: string;
}

export interface LiveData {
  plays: Plays;
  linescore: Linescore;
  boxscore: Boxscore;
  decisions: Decisions;
  leaders: Leaders;
}

export interface Boxscore {
  teams: BoxscoreTeams;
  officials: Official[];
  info: NoteElement[];
}

export interface NoteElement {
  label: string;
  value?: string;
}

export interface Official {
  official: OfficialScorer;
  officialType: string;
}

export interface BoxscoreTeams {
  away: FluffyAway;
  home: Home;
}

export interface FluffyAway {
  team: Team;
  teamStats: TeamStats;
  players: AwayPlayers;
  batters: number[];
  pitchers: number[];
  bench: number[];
  bullpen: number[];
  battingOrder: number[];
  info: AwayInfo[];
}

export interface AwayInfo {
  title: string;
  fieldList: NoteElement[];
}

export interface AwayPlayers {
  [index: string]: Player;
}

export interface GameStatus {
  isCurrentBatter: boolean;
  isCurrentPitcher: boolean;
  isOnBench: boolean;
  isSubstitute: boolean;
}

export interface SeasonStatsClass {
  batting: Batting;
  pitching: SeasonStatsPitching;
  fielding: Fielding;
}

export interface Batting {
  gamesPlayed?: number;
  flyOuts: number;
  groundOuts: number;
  runs: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  strikeOuts: number;
  baseOnBalls: number;
  intentionalWalks: number;
  hits: number;
  hitByPitch: number;
  avg?: string;
  atBats: number;
  obp?: string;
  slg?: string;
  ops?: string;
  caughtStealing: number;
  stolenBases: number;
  stolenBasePercentage: BattingStolenBasePercentage;
  groundIntoDoublePlay: number;
  groundIntoTriplePlay: number;
  plateAppearances: number;
  totalBases: number;
  rbi: number;
  leftOnBase: number;
  sacBunts: number;
  sacFlies: number;
  babip?: string;
  catchersInterference: number;
  pickoffs: number;
  atBatsPerHomeRun: string;
  note?: string;
}

export enum BattingStolenBasePercentage {
  Empty = ".---",
  The000 = ".000",
  The1000 = "1.000",
  The500 = ".500",
  The667 = ".667",
  The700 = ".700",
  The900 = ".900",
  The909 = ".909",
}

export interface Fielding {
  assists: number;
  putOuts: number;
  errors: number;
  chances: number;
  fielding?: string;
  caughtStealing: number;
  passedBall: number;
  stolenBases: number;
  stolenBasePercentage: FieldingStolenBasePercentage;
  pickoffs: number;
  gamesStarted?: number;
}

export enum FieldingStolenBasePercentage {
  Empty = ".---",
  The1000 = "1.000",
  The645 = ".645",
  The746 = ".746",
  The800 = ".800",
}

export interface SeasonStatsPitching {
  gamesPlayed: number;
  gamesStarted: number;
  groundOuts: number;
  airOuts: number;
  runs: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  strikeOuts: number;
  baseOnBalls: number;
  intentionalWalks: number;
  hits: number;
  hitByPitch: number;
  atBats: number;
  obp?: string;
  caughtStealing: number;
  stolenBases: number;
  stolenBasePercentage: string;
  era?: string;
  inningsPitched: string;
  wins: number;
  losses: number;
  saves: number;
  saveOpportunities: number;
  holds: number;
  blownSaves: number;
  earnedRuns: number;
  whip?: string;
  outs: number;
  gamesPitched: number;
  completeGames: number;
  shutouts: number;
  hitBatsmen: number;
  balks: number;
  wildPitches: number;
  pickoffs: number;
  groundOutsToAirouts?: string;
  rbi: number;
  winPercentage?: string;
  gamesFinished: number;
  strikeoutWalkRatio?: string;
  strikeoutsPer9Inn?: string;
  walksPer9Inn?: string;
  hitsPer9Inn?: string;
  runsScoredPer9: string;
  homeRunsPer9: string;
  inheritedRunners: number;
  inheritedRunnersScored: number;
  catchersInterference: number;
  sacBunts: number;
  sacFlies: number;
  numberOfPitches?: number;
  battersFaced?: number;
  pitchesThrown?: number;
  balls?: number;
  strikes?: number;
  strikePercentage?: string;
  pitchesPerInning?: string;
  note?: string;
  flyOuts?: number;
}

export interface PurpleStats {
  batting: number;
  pitching: number;
  fielding: number;
}

export interface Player {
  person: OfficialScorer;
  jerseyNumber: string;
  position: Position;
  stats: SeasonStatsClass | PurpleStats | FluffyStats;
  status: BatSide;
  parentTeamId: number;
  battingOrder?: string;
  seasonStats: SeasonStatsClass;
  gameStatus: GameStatus;
  allPositions?: Position[];
}

export interface FluffyStats {
  batting: Batting;
  pitching: number;
  fielding: Fielding;
}

export interface Team {
  id: number;
  name: AwayName;
  link: Link;
  springLeague: Division;
  allStarStatus: DoubleHeader;
}

export interface TeamStats {
  batting: Batting;
  pitching: TeamStatsPitching;
  fielding: Fielding;
}

export interface TeamStatsPitching {
  groundOuts: number;
  airOuts: number;
  runs: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  strikeOuts: number;
  baseOnBalls: number;
  intentionalWalks: number;
  hits: number;
  hitByPitch: number;
  atBats: number;
  obp: string;
  caughtStealing: number;
  stolenBases: number;
  stolenBasePercentage: BattingStolenBasePercentage;
  era: string;
  inningsPitched: string;
  saveOpportunities: number;
  earnedRuns: number;
  whip: string;
  battersFaced: number;
  outs: number;
  completeGames: number;
  shutouts: number;
  hitBatsmen: number;
  balks: number;
  wildPitches: number;
  pickoffs: number;
  groundOutsToAirouts: string;
  rbi: number;
  runsScoredPer9: string;
  homeRunsPer9: string;
  inheritedRunners: number;
  inheritedRunnersScored: number;
  catchersInterference: number;
  sacBunts: number;
  sacFlies: number;
}

export interface Home {
  team: Team;
  teamStats: TeamStats;
  players: HomePlayers;
  batters: number[];
  pitchers: number[];
  bench: number[];
  bullpen: number[];
  battingOrder: number[];
  info: AwayInfo[];
  note: NoteElement[];
}

export interface HomePlayers {
  [index: string]: Player;
}

export interface Decisions {
  winner: OfficialScorer;
  loser: OfficialScorer;
  save: OfficialScorer;
}

export interface Leaders {
  hitDistance: number;
  hitSpeed: number;
  pitchSpeed: number;
}

export interface Linescore {
  currentInning: number;
  currentInningOrdinal: string;
  inningState: string;
  inningHalf: string;
  isTopInning: boolean;
  scheduledInnings: number;
  innings: Inning[];
  teams: LinescoreTeams;
  defense: Defense;
  offense: Offense;
  balls: number;
  strikes: number;
  outs: number;
}

export interface Defense {
  pitcher: OfficialScorer;
  catcher: OfficialScorer;
  first: OfficialScorer;
  second: OfficialScorer;
  third: OfficialScorer;
  shortstop: OfficialScorer;
  left: OfficialScorer;
  center: OfficialScorer;
  right: OfficialScorer;
  batter: OfficialScorer;
  onDeck: OfficialScorer;
  inHole: OfficialScorer;
  battingOrder: number;
  team: Division;
}

export interface Inning {
  num: number;
  ordinalNum: string;
  home: InningAway;
  away: InningAway;
}

export interface InningAway {
  runs: number;
  hits: number;
  errors: number;
  leftOnBase: number;
}

export interface Offense {
  batter: OfficialScorer;
  onDeck: OfficialScorer;
  inHole: OfficialScorer;
  pitcher: OfficialScorer;
  battingOrder: number;
  team: Division;
  first: Player;
  second: Player;
  third: Player;
}

export interface LinescoreTeams {
  home: InningAway;
  away: InningAway;
}

export interface Plays {
  allPlays: AllPlay[];
  currentPlay: CurrentPlay;
  scoringPlays: number[];
  playsByInning: PlaysByInning[];
}

export interface AllPlay {
  result: Result;
  about: About;
  count: Count;
  matchup: AllPlayMatchup;
  pitchIndex: number[];
  actionIndex: number[];
  runnerIndex: number[];
  runners: Runner[];
  playEvents: AllPlayPlayEvent[];
  playEndTime: Date;
  atBatIndex: number;
}

export interface About {
  atBatIndex: number;
  halfInning: HalfInning;
  isTopInning: boolean;
  inning: number;
  startTime: Date;
  endTime: Date;
  isComplete: boolean;
  isScoringPlay: boolean;
  hasReview: boolean;
  hasOut: boolean;
  captivatingIndex: number;
}

export enum HalfInning {
  Bottom = "bottom",
  Top = "top",
}

export interface Count {
  balls: number;
  strikes: number;
  outs: number;
}

export interface AllPlayMatchup {
  batter: OfficialScorer;
  batSide: BatSide;
  pitcher: OfficialScorer;
  pitchHand: BatSide;
  postOnFirst?: OfficialScorer;
  batterHotColdZones: Zone[];
  pitcherHotColdZones: Zone[];
  splits: Splits;
  postOnSecond?: OfficialScorer;
  postOnThird?: OfficialScorer;
  batterHotColdZoneStats?: BatterHotColdZoneStats;
}

export interface BatterHotColdZoneStats {
  stats: StatElement[];
}

export interface StatElement {
  type: Group;
  group: Group;
  splits: Split[];
}

export interface Group {
  displayName: string;
}

export interface Split {
  stat: SplitStat;
}

export interface SplitStat {
  name: string;
  zones: Zone[];
}

export interface Zone {
  zone: string;
  color: Color;
  temp: Temp;
  value: string;
}

export enum Color {
  RGBA15018825555 = "rgba(150, 188, 255, .55)",
  RGBA214415255 = "rgba(214, 41, 52, .55)",
  RGBA23414715355 = "rgba(234, 147, 153, .55)",
  RGBA255255255055 = "rgba(255, 255, 255, 0.55)",
  RGBA69023855 = "rgba(6, 90, 238, .55)",
}

export enum Temp {
  Cold = "cold",
  Cool = "cool",
  Hot = "hot",
  Lukewarm = "lukewarm",
  Warm = "warm",
}

export interface Splits {
  batter: Batter;
  pitcher: Pitcher;
  menOnBase: MenOnBase;
}

export enum Batter {
  VsLHP = "vs_LHP",
  VsRHP = "vs_RHP",
}

export enum MenOnBase {
  Empty = "Empty",
  Loaded = "Loaded",
  MenOn = "Men_On",
  Risp = "RISP",
}

export enum Pitcher {
  VsLHB = "vs_LHB",
  VsRHB = "vs_RHB",
}

export interface AllPlayPlayEvent {
  details: PlayEventDetails;
  count: Count;
  index: number;
  startTime: Date;
  endTime?: Date;
  isPitch: boolean;
  type: PlayEventType;
  player?: OfficialVenue;
  pitchData?: PitchData;
  playId?: string;
  pitchNumber?: number;
  hitData?: HitData;
  actionPlayId?: string;
  isBaseRunningPlay?: boolean;
  isSubstitution?: boolean;
  position?: Position;
  battingOrder?: string;
  replacedPlayer?: OfficialVenue;
}

export interface PlayEventDetails {
  description: string;
  event?: string;
  eventType?: string;
  awayScore?: number;
  homeScore?: number;
  isScoringPlay?: boolean;
  hasReview: boolean;
  call?: BatSide;
  code?: string;
  ballColor?: BallColor;
  trailColor?: TrailColor;
  isInPlay?: boolean;
  isStrike?: boolean;
  isBall?: boolean;
  type?: BatSide;
  fromCatcher?: boolean;
  runnerGoing?: boolean;
}

export enum BallColor {
  RGBA170211110 = "rgba(170, 21, 11, 1.0)",
  RGBA268619010 = "rgba(26, 86, 190, 1.0)",
  RGBA391613910 = "rgba(39, 161, 39, 1.0)",
}

export enum TrailColor {
  RGBA0025410 = "rgba(0, 0, 254, 1.0)",
  RGBA08525410 = "rgba(0, 85, 254, 1.0)",
  RGBA119015210 = "rgba(119, 0, 152, 1.0)",
  RGBA152010110 = "rgba(152, 0, 101, 1.0)",
  RGBA153171010 = "rgba(153, 171, 0, 1.0)",
  RGBA18803310 = "rgba(188, 0, 33, 1.0)",
  RGBA50022110 = "rgba(50, 0, 221, 1.0)",
}

export interface HitData {
  launchSpeed: number;
  launchAngle: number;
  totalDistance: number;
  trajectory: Trajectory;
  hardness: Hardness;
  location: string;
  coordinates: HitDataCoordinates;
}

export interface HitDataCoordinates {
  coordX: number;
  coordY: number;
}

export enum Hardness {
  Hard = "hard",
  Medium = "medium",
  Soft = "soft",
}

export enum Trajectory {
  FlyBall = "fly_ball",
  GroundBall = "ground_ball",
  LineDrive = "line_drive",
  Popup = "popup",
}

export interface PitchData {
  startSpeed?: number;
  endSpeed?: number;
  strikeZoneTop: number;
  strikeZoneBottom: number;
  coordinates: { [key: string]: number };
  breaks: Breaks;
  zone?: number;
  typeConfidence?: number;
  plateTime?: number;
  extension?: number;
}

export interface Breaks {
  breakAngle?: number;
  breakLength?: number;
  breakY?: number;
  spinRate?: number;
  spinDirection?: number;
}

export enum PlayEventType {
  Action = "action",
  Pickoff = "pickoff",
  Pitch = "pitch",
}

export interface Result {
  type: ResultType;
  event: string;
  eventType: string;
  description: string;
  rbi: number;
  awayScore: number;
  homeScore: number;
}

export enum ResultType {
  AtBat = "atBat",
}

export interface Runner {
  movement: Movement;
  details: RunnerDetails;
  credits: CreditElement[];
}

export interface CreditElement {
  player: OfficialVenue;
  position: Position;
  credit: CreditEnum;
}

export enum CreditEnum {
  FAssist = "f_assist",
  FDeflection = "f_deflection",
  FFieldedBall = "f_fielded_ball",
  FPutout = "f_putout",
  FThrowingError = "f_throwing_error",
}

export interface RunnerDetails {
  event: string;
  eventType: string;
  movementReason: null | string;
  runner: OfficialScorer;
  responsiblePitcher: OfficialVenue | null;
  isScoringEvent: boolean;
  rbi: boolean;
  earned: boolean;
  teamUnearned: boolean;
  playIndex: number;
}

export interface Movement {
  originBase: GamedayType | null;
  start: GamedayType | null;
  end: GamedayType | null;
  outBase: GamedayType | null;
  isOut: boolean;
  outNumber: number | null;
}

export interface CurrentPlay {
  result: Result;
  about: About;
  count: Count;
  matchup: CurrentPlayMatchup;
  pitchIndex: number[];
  actionIndex: number[];
  runnerIndex: number[];
  runners: Runner[];
  playEvents: CurrentPlayPlayEvent[];
  playEndTime: Date;
  atBatIndex: number;
}

export interface CurrentPlayMatchup {
  batter: OfficialScorer;
  batSide: BatSide;
  pitcher: OfficialScorer;
  pitchHand: BatSide;
  batterHotColdZoneStats: BatterHotColdZoneStats;
  batterHotColdZones: Zone[];
  pitcherHotColdZones: Zone[];
  splits: Splits;
}

export interface CurrentPlayPlayEvent {
  details: PlayEventDetails;
  count: Count;
  pitchData?: PitchData;
  index: number;
  playId?: string;
  pitchNumber?: number;
  startTime: Date;
  endTime?: Date;
  isPitch: boolean;
  type: PlayEventType;
  player?: OfficialVenue;
  hitData?: HitData;
}

export interface PlaysByInning {
  startIndex: number;
  endIndex: number;
  top: number[];
  bottom: number[];
  hits: Hits;
}

export interface Hits {
  away: AwayElement[];
  home: AwayElement[];
}

export interface AwayElement {
  team: Team;
  inning: number;
  pitcher: OfficialScorer;
  batter: OfficialScorer;
  coordinates: AwayCoordinates;
  type: AwayType;
  description: string;
}

export interface AwayCoordinates {
  x: number;
  y: number;
}

export enum AwayType {
  H = "H",
  O = "O",
}

export interface MetaData {
  wait: number;
  timeStamp: string;
  gameEvents: string[];
  logicalEvents: string[];
}
