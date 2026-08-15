export interface PlayerDetailsResponse {
  copyright: string;
  people: Person[];
}

export interface Person {
  id: number;
  fullName: string;
  link: string;
  firstName: string;
  lastName: string;
  primaryNumber: string;
  birthDate: string;
  currentAge: number;
  birthCity: string;
  birthStateProvince: string;
  birthCountry: string;
  height: string;
  weight: number;
  active: boolean;
  currentTeam: Team;
  primaryPosition: Position;
  useName: string;
  useLastName: string;
  middleName?: string;
  boxscoreName: string;
  nickName?: string;
  gender: string;
  isPlayer: boolean;
  isVerified: boolean;
  draftYear?: number;
  pronunciation?: string;
  stats: Stat[];
}

export interface Team {
  springLeague?: SpringLeague;
  allStarStatus: string;
  id: number;
  name: string;
  link: string;
  season: number;
  venue: Venue;
  springVenue: SpringVenue;
  teamCode: string;
  fileCode: string;
  abbreviation: string;
  teamName: string;
  locationName: string;
  firstYearOfPlay: string;
  league: League;
  division: Division;
  sport: Sport;
  shortName: string;
  franchiseName: string;
  clubName: string;
  active: boolean;
}

export interface SpringLeague {
  id: number;
  name: string;
  link: string;
  abbreviation: string;
}

export interface Venue {
  id: number;
  name: string;
  link: string;
}

export interface SpringVenue {
  id: number;
  link: string;
}

export interface League {
  id: number;
  name: string;
  link: string;
  abbreviation?: string;
  nameShort?: string;
  seasonState?: string;
  hasWildCard?: boolean;
  hasSplitSeason?: boolean;
  numGames?: number;
  hasPlayoffPoints?: boolean;
  numTeams?: number;
  numWildcardTeams?: number;
  seasonDateInfo?: SeasonDateInfo;
  season?: string;
  orgCode?: string;
  conferencesInUse?: boolean;
  divisionsInUse?: boolean;
  sport?: Sport;
  sortOrder?: number;
  active?: boolean;
}

export interface SeasonDateInfo {
  seasonId: string;
  preSeasonStartDate: string;
  preSeasonEndDate: string;
  seasonStartDate: string;
  springStartDate: string;
  springEndDate: string;
  regularSeasonStartDate: string;
  lastDate1stHalf: string;
  allStarDate: string;
  firstDate2ndHalf: string;
  regularSeasonEndDate: string;
  postSeasonStartDate: string;
  postSeasonEndDate: string;
  seasonEndDate: string;
  offseasonStartDate: string;
  offSeasonEndDate: string;
  seasonLevelGamedayType: string;
  gameLevelGamedayType: string;
  qualifierPlateAppearances: number;
  qualifierOutsPitched: number;
}

export interface Division {
  id: number;
  name: string;
  link: string;
}

export interface Sport {
  id: number;
  link: string;
  name?: string;
  abbreviation?: string;
}

export interface Position {
  code: string;
  name: string;
  type: string;
  abbreviation: string;
}

export interface Stat {
  type: TypeClass;
  group: Group;
  exemptions: any[];
  splits: Split[];
}

export interface TypeClass {
  displayName: string;
}

export interface Group {
  displayName: string;
}

export interface Split {
  season: string;
  stat: SplitStat;
  team: Team;
  player?: Player;
  league: League;
  sport: Sport;
  gameType: string;
}

export interface SplitStat {
  // Shared stats
  gamesPlayed: number;
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
  numberOfPitches: number;

  // Hitting stats
  avg?: string;
  atBats?: number;
  obp?: string;
  slg?: string;
  ops?: string;
  caughtStealing?: number;
  stolenBases?: number;
  stolenBasePercentage?: string;
  groundIntoDoublePlay?: number;
  plateAppearances?: number;
  totalBases?: number;
  rbi?: number;
  leftOnBase?: number;
  sacBunts?: number;
  sacFlies?: number;
  babip?: string;
  groundOutsToAirouts?: string;
  catchersInterference?: number;
  atBatsPerHomeRun?: string;
  extraBaseHits?: number;
  gidp?: number;
  gidpOpp?: number;
  pitchesPerPlateAppearance?: string;
  walksPerPlateAppearance?: string;
  strikeoutsPerPlateAppearance?: string;
  homeRunsPerPlateAppearance?: string;
  walksPerStrikeout?: string;
  iso?: string;
  reachedOnError?: number;
  walkOffs?: number;
  flyOuts?: number;
  totalSwings?: number;
  swingAndMisses?: number;
  ballsInPlay?: number;
  popOuts?: number;
  lineOuts?: number;
  flyHits?: number;
  popHits?: number;
  lineHits?: number;
  groundHits?: number;

  // Pitching stats
  wins?: number;
  losses?: number;
  era?: string;
  whip?: string;
  inningsPitched?: string;
  earnedRuns?: number;
  gamesStarted?: number;
  strikeoutsPer9Inn?: string;
  walksPer9Inn?: string;
  homeRunsPer9?: string;
  saves?: number;
  saveOpportunities?: number;
  holds?: number;
  blownSaves?: number;
  completeGames?: number;
  shutouts?: number;
  wildPitches?: number;
  balks?: number;
  hitBatsmen?: number;
  inheritedRunners?: number;
  inheritedRunnersScored?: number;
  battersFaced?: number;
  outs?: number;
  gamesPitched?: number;
  qualityStarts?: number;
  pitchesThrown?: number;
  balls?: number;
  strikes?: number;
  strikePercentage?: string;
  pitchesPerInning?: string;
  runsScoredPer9?: string;
  strikeoutWalkRatio?: string;
}

export interface Player {
  id: number;
  fullName: string;
  link: string;
}

export default PlayerDetailsResponse;
