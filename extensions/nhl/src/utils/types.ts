// Common types used across multiple responses
export type Timezone = {
  timezone: "America/New_York" | "America/Chicago" | "America/Denver" | "America/Los_Angeles";
};

export type TeamInfo = {
  id: number;
  name: {
    default: string;
    fr?: string;
  };
  commonName?: {
    default: string;
  };
  placeNameWithPreposition?: {
    default: string;
    fr?: string;
  };
  abbrev: string;
  logo: string;
};

export type Venue = {
  default: string;
};

export type TvBroadcast = {
  id: number;
  market: string;
  countryCode: string;
  network: string;
  sequenceNumber: number;
};

export type PeriodDescriptor = {
  number: number;
  periodType: string;
  maxRegulationPeriods: number;
};

export type Clock = {
  timeRemaining: string;
  secondsRemaining: number;
  running: boolean;
  inIntermission: boolean;
};

export type GameState = "OFF" | "LIVE" | "FUT" | "CRIT" | "PRE";

// Types for the scoreboard response
export type ScoreboardResponse = {
  focusedDate: string;
  focusedDateCount: number;
  gamesByDate: GamesByDate[];
};

export type GamesByDate = {
  date: string;
  games: Game[];
};

export type Game = {
  id: number;
  season: number;
  gameType: number;
  gameDate: string;
  gameCenterLink: string;
  venue: Venue;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  tvBroadcasts: TvBroadcast[];
  gameState: GameState;
  gameScheduleState: string;
  awayTeam: TeamInfo & {
    score?: number;
    sog?: number;
    record?: string;
  };
  homeTeam: TeamInfo & {
    score?: number;
    sog?: number;
    record?: string;
  };
  ticketsLink: string;
  ticketsLinkFr?: string;
  period?: number;
  periodDescriptor?: PeriodDescriptor;
  clock?: Clock;
  threeMinRecap?: string;
  threeMinRecapFr?: string;
  otInUse: boolean;
  summary?: GameSummary;
};

export type SortedGames = {
  pastGames: Game[];
  todayGames: Game[];
  futureGames: Game[];
};

// Types for the gamecenter landing response
export type GamecenterLandingResponse = {
  id: number;
  season: number;
  gameType: number;
  limitedScoring: boolean;
  gameDate: string;
  venue: Venue;
  venueLocation: {
    default: string;
  };
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  venueTimezone: string;
  tvBroadcasts: TvBroadcast[];
  gameState: GameState;
  gameScheduleState: string;
  awayTeam: TeamInfo & {
    record: string;
  };
  homeTeam: TeamInfo & {
    record: string;
  };
  shootoutInUse: boolean;
  maxPeriods: number;
  regPeriods: number;
  otInUse: boolean;
  tiesInUse: boolean;
  ticketsLink: string;
  ticketsLinkFr: string;
  matchup: Matchup;
};

export type Matchup = {
  season: number;
  gameType: number;
  teamLeaders: TeamLeaders;
  goalieComparison: GoalieComparison;
  last10Record: Last10Record;
  skaterSeasonStats: SkaterSeasonStat[];
  goalieSeasonStats: GoalieSeasonStat[];
};

export type TeamLeaders = {
  context: string;
  contextSeason: number;
  leaders: Leader[];
};

export type Leader = {
  category: string;
  awayLeader: PlayerLeader;
  homeLeader: PlayerLeader;
};

export type PlayerLeader = {
  playerId: number;
  name: {
    default: string;
  };
  firstName: {
    default: string;
  };
  lastName: {
    default: string;
  };
  sweaterNumber: number;
  positionCode: string;
  headshot: string;
  value: number;
};

export type GoalieComparison = {
  homeTeam: GoalieTeamStats;
  awayTeam: GoalieTeamStats;
};

export type GoalieTeamStats = {
  teamTotals: {
    record: string;
    gaa: number;
    savePctg: number;
    shutouts: number;
  };
  leaders: GoalieLeader[];
};

export type GoalieLeader = PlayerLeader & {
  gamesPlayed: number;
  seasonPoints: number;
  record: string;
  gaa: number;
  savePctg: number;
  shutouts: number;
};

export type Last10Record = {
  awayTeam: TeamRecord;
  homeTeam: TeamRecord;
};

export type TeamRecord = {
  record: string;
  streakType: string;
  streak: number;
  pastGameResults: PastGameResult[];
};

export type PastGameResult = {
  opponentAbbrev: string;
  gameResult: string;
};

export type SkaterSeasonStat = {
  playerId: number;
  teamId: number;
  sweaterNumber: number;
  name: {
    default: string;
    cs?: string;
    de?: string;
    es?: string;
    fi?: string;
    sk?: string;
    sv?: string;
  };
  position: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  avgPoints: number;
  avgTimeOnIce: string;
  gameWinningGoals: number;
  shots: number;
  shootingPctg: number;
  faceoffWinningPctg: number;
  powerPlayGoals: number;
  blockedShots: number;
  hits: number;
};

export type GoalieSeasonStat = {
  playerId: number;
  teamId: number;
  sweaterNumber: number;
  name: {
    default: string;
  };
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  shotsAgainst: number;
  goalsAgainst: number;
  goalsAgainstAvg: number;
  savePctg: number;
  shutouts: number;
  saves: number;
  toi: string;
};

// Types for the gamecenter right-rail response
export type GamecenterRightRailResponse = {
  seasonSeries: SeasonSeries[];
  seasonSeriesWins: {
    awayTeamWins: number;
    homeTeamWins: number;
  };
  gameInfo: GameInfo;
  gameVideo?: GameVideo;
  linescore?: Linescore;
  shotsByPeriod?: Period[];
  teamGameStats?: TeamGameStat[] | TeamSeasonStat[];
  gameReports?: GameReports;
  teamSeasonStats: TeamSeasonStats;
  last10Record: Last10Record;
};

export type SeasonSeries = {
  id: number;
  season: number;
  gameType: number;
  gameDate: string;
  startTimeUTC: string;
  easternUTCOffset: string;
  venueUTCOffset: string;
  gameState: GameState;
  gameScheduleState: string;
  awayTeam: {
    id: number;
    abbrev: string;
    logo: string;
    score?: number;
  };
  homeTeam: {
    id: number;
    abbrev: string;
    logo: string;
    score?: number;
  };
  gameCenterLink: string;
};

export type GameInfo = {
  referees?: Official[];
  linesmen?: Official[];
  awayTeam: {
    headCoach: {
      default: string;
    };
    scratches?: ScratchPlayer[];
  };
  homeTeam: {
    headCoach: {
      default: string;
    };
    scratches?: ScratchPlayer[];
  };
};

export type TeamSeasonStats = {
  awayTeam: TeamStats;
  homeTeam: TeamStats;
};

export type TeamStats = {
  ppPctg: number;
  pkPctg: number;
  faceoffWinningPctg: number;
  goalsForPerGamePlayed: number;
  goalsAgainstPerGamePlayed: number;
  ppPctgRank: number;
  pkPctgRank: number;
  faceoffWinningPctgRank: number;
  goalsForPerGamePlayedRank: number;
  goalsAgainstPerGamePlayedRank: number;
};

// Types for the player landing response
export type PlayerLandingResponse = {
  playerId: number;
  isActive: boolean;
  currentTeamId: number;
  currentTeamAbbrev: string;
  fullTeamName: {
    default: string;
    fr: string;
  };
  teamCommonName: {
    default: string;
  };
  teamPlaceNameWithPreposition: {
    default: string;
    fr: string;
  };
  firstName: {
    default: string;
  };
  lastName: {
    default: string;
  };
  teamLogo: string;
  sweaterNumber: number;
  position: string;
  headshot: string;
  heroImage: string;
  heightInInches: number;
  heightInCentimeters: number;
  weightInPounds: number;
  weightInKilograms: number;
  birthDate: string;
  birthCity: {
    default: string;
    sk?: string;
  };
  birthStateProvince: {
    default: string;
  };
  birthCountry: string;
  shootsCatches: string;
  draftDetails: DraftDetails;
  playerSlug: string;
  inTop100AllTime: number;
  inHHOF: number;
  featuredStats: FeaturedStats;
  careerTotals: CareerTotals;
  shopLink: string;
  twitterLink: string;
  watchLink: string;
  last5Games: Last5Game[];
  seasonTotals: SeasonTotal[];
  awards: Award[];
  currentTeamRoster: CurrentTeamRosterPlayer[];
};

export type DraftDetails = {
  year: number;
  teamAbbrev: string;
  round: number;
  pickInRound: number;
  overallPick: number;
};

export type FeaturedStats = {
  season: number;
  regularSeason: {
    subSeason: PlayerStats;
    career: PlayerStats;
  };
};

export type PlayerStats = {
  assists: number;
  gameWinningGoals: number;
  gamesPlayed: number;
  goals: number;
  otGoals: number;
  pim: number;
  plusMinus: number;
  points: number;
  powerPlayGoals: number;
  powerPlayPoints: number;
  shootingPctg: number;
  shorthandedGoals: number;
  shorthandedPoints: number;
  shots: number;
};

export type CareerTotals = {
  regularSeason: PlayerStats & {
    avgToi: string;
    faceoffWinningPctg: number;
  };
  playoffs: PlayerStats & {
    avgToi: string;
    faceoffWinningPctg: number;
  };
};

export type Last5Game = {
  assists: number;
  gameDate: string;
  gameId: number;
  gameTypeId: number;
  goals: number;
  homeRoadFlag: string;
  opponentAbbrev: string;
  pim: number;
  plusMinus: number;
  points: number;
  powerPlayGoals: number;
  shifts: number;
  shorthandedGoals: number;
  shots: number;
  teamAbbrev: string;
  toi: string;
};

export type SeasonTotal = {
  assists: number;
  gameTypeId: number;
  gamesPlayed: number;
  goals: number;
  leagueAbbrev: string;
  pim?: number;
  points: number;
  season: number;
  sequence: number;
  teamName: {
    default: string;
    cs?: string;
    de?: string;
    fi?: string;
    sk?: string;
    sv?: string;
  };
  teamCommonName?: {
    default: string;
    cs?: string;
    de?: string;
    fi?: string;
    sk?: string;
    sv?: string;
  };
  gameWinningGoals?: number;
  plusMinus?: number;
  powerPlayGoals?: number;
  shorthandedGoals?: number;
  shootingPctg?: number;
  shots?: number;
  avgToi?: string;
  faceoffWinningPctg?: number;
  otGoals?: number;
  powerPlayPoints?: number;
  shorthandedPoints?: number;
};

export type Award = {
  trophy: {
    default: string;
  };
  seasons: {
    seasonId: number;
  }[];
};

export type CurrentTeamRosterPlayer = {
  playerId: number;
  lastName: {
    default: string;
  };
  firstName: {
    default: string;
  };
  playerSlug: string;
};

export type GameOfficials = {
  referees: Official[];
  linesmen: Official[];
};

export type Official = {
  default: string;
};

export type ScratchPlayer = {
  id: number;
  firstName: {
    default: string;
    cs?: string;
    sk?: string;
  };
  lastName: {
    default: string;
    cs?: string;
    sk?: string;
  };
};

export type GameVideo = {
  threeMinRecap: number;
  threeMinRecapFr: number;
  condensedGame: number;
  condensedGameFr: number;
};

export type Period = {
  periodDescriptor: PeriodDescriptor;
  away: number;
  home: number;
};

export type Linescore = {
  byPeriod: Period[];
  totals: {
    away: number;
    home: number;
  };
};

export type TeamGameStat = {
  category: GameStringCategory;
  awayValue: number | string;
  homeValue: number | string;
};

export type TeamSeasonStat = {
  category: GameStringCategory | string;
  awayValue: number;
  homeValue: number;
};

export type GameStringCategory =
  | "linescore"
  | "sog"
  | "faceoffWinningPctg"
  | "powerPlay"
  | "powerPlayPctg"
  | "takeaways"
  | "giveaways"
  | "hits"
  | "pim"
  | "blockedShots"
  | "gameStats"
  | "goalsForPerGamePlayed"
  | "goalsAgainstPerGamePlayed"
  | "ppPctg"
  | "pkPctg"
  | "ppPctgRank"
  | "pkPctgRank"
  | "faceoffWinningPctgRank"
  | "goalsForPerGamePlayedRank"
  | "goalsAgainstPerGamePlayedRank";

export type GameStrings = Record<GameStringCategory, Record<LanguageKey, string>>;

export type LanguageKey = "default" | "fr";

export type GameReports = {
  gameSummary: string;
  eventSummary: string;
  playByPlay: string;
  faceoffSummary: string;
  faceoffComparison: string;
  rosters: string;
  shotSummary: string;
  shiftChart: string;
  toiAway: string;
  toiHome: string;
};

export type Goal = {
  situationCode: string;
  strength: string;
  playerId: number;
  firstName: {
    default: string;
  };
  lastName: {
    default: string;
  };
  name: {
    default: string;
  };
  teamAbbrev: {
    default: string;
  };
  headshot: string;
  highlightClipSharingUrl: string;
  highlightClipSharingUrlFr: string;
  highlightClip: number;
  highlightClipFr: number;
  discreteClip: number;
  discreteClipFr: number;
  goalsToDate: number;
  awayScore: number;
  homeScore: number;
  leadingTeamAbbrev?: {
    default: string;
  };
  timeInPeriod: string;
  shotType: string;
  goalModifier: string;
  assists: Array<{
    playerId: number;
    firstName: {
      default: string;
    };
    lastName: {
      default: string;
    };
    name: {
      default: string;
    };
    assistsToDate: number;
  }>;
  pptReplayUrl: string;
  homeTeamDefendingSide: string;
};

export type Penalty = {
  timeInPeriod: string;
  type: string;
  duration: number;
  committedByPlayer: string;
  teamAbbrev: {
    default: string;
  };
  drawnBy: string;
  descKey: string;
};

export type PeriodSummary = {
  periodDescriptor: PeriodDescriptor;
  goals: Goal[];
};

export type PenaltySummary = {
  periodDescriptor: PeriodDescriptor;
  penalties: Penalty[];
};

export type GameSummary = {
  scoring: PeriodSummary[];
  // shootout: any[]; // Add more specific type if needed
  threeStars?: PlayerOnIce[]; // Add more specific type if needed
  penalties: PenaltySummary[];
  iceSurface: {
    awayTeam: TeamIceSurface;
    homeTeam: TeamIceSurface;
  };
};

export type PlayerOnIce = {
  playerId: number;
  star?: number;
  name: {
    default: string;
    cs?: string;
    fi?: string;
    sk?: string;
  };
  sweaterNumber: number;
  sweaterNo?: number;
  positionCode: string;
  position?: string;
  teamAbbrev?: string;
  headshot: string;
  totalSOI: number;
  goals?: number;
  assists?: number;
  points?: number;
};

export type TeamIceSurface = {
  forwards: PlayerOnIce[];
  defensemen: PlayerOnIce[];
  goalies: PlayerOnIce[];
  penaltyBox: PlayerOnIce[];
};
