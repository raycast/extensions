// Team detail types based on actual Fotmob API response structure

export type TeamDetails = {
  id: number;
  type: string;
  name: string;
  latestSeason?: string;
  shortName?: string;
  country?: string;
  primaryLeagueId?: number;
  primaryLeagueName?: string;
  canSyncCalendar?: boolean;
};

export type Venue = {
  id: number;
  name: string;
  lat: number;
  long: number;
  capacity: number;
  city: string;
  country: {
    name: string;
    code: string;
  };
  opened?: number;
};

export type TeamColors = {
  primary: string;
  secondary: string;
  text: string;
};

export type TeamForm = {
  result: "W" | "D" | "L";
  resultString: string;
  imageUrl: string;
  linkToMatch: string;
  date: {
    utcTime: string;
  };
  tournament: {
    name: string;
    leagueId: number;
  };
  opponent: {
    id: number;
    name: string;
  };
  home: {
    isOurTeam: boolean;
  };
  score: string;
};

export type TableEntry = {
  id: number;
  name: string;
  shortName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scoresStr: string;
  goalConDiff: number;
  pts: number;
  idx: number;
  qualColor?: string;
  featuredInMatch?: boolean;
  deduction?: number;
  ongoing?: unknown[];
  nameForURL?: string;
};

export type LeagueTable = {
  all: TableEntry[];
  home: TableEntry[];
  away: TableEntry[];
  form: TableEntry[];
};

export type TopPlayer = {
  id: number;
  name: string;
  goals: number;
  assists: number;
  rating: number;
  positionId: number;
  ccode: string;
  cname: string;
  injured: boolean;
  timeSubbed: number;
  stats: {
    FotMob_rating: {
      avgRating: number;
      goalsPer90: number;
      assistsPer90: number;
    };
  };
};

export type MatchFixture = {
  id: number;
  pageUrl: string;
  opponent: {
    id: number;
    name: string;
    score: number;
  };
  home: {
    id: number;
    name: string;
    score: number;
  };
  away: {
    id: number;
    name: string;
    score: number;
  };
  displayTournament: boolean;
  result?: number;
  notStarted: boolean;
  tournament: {
    name: string;
    leagueId: number;
  };
  status: {
    utcTime: string;
    finished: boolean;
    started: boolean;
    cancelled: boolean;
    awarded?: boolean;
    scoreStr?: string;
    ongoing?: boolean;
    liveTime?: {
      short: string;
      maxTime: number;
    };
    reason?: {
      short: string;
      shortKey: string;
      long: string;
      longKey: string;
    };
  };
};

export type SquadMember = {
  id: number;
  name: string;
  position: {
    strPosShort: string;
    strPos: string;
  };
  shirtNo: number;
  age: number;
  height: number;
  weight: number;
  marketValue: string;
  birthDate: {
    utcTime: string;
  };
  country: {
    name: string;
    code: string;
  };
  primaryPosition?: {
    strPosShort: string;
    strPos: string;
  };
  injured: boolean;
  suspended: boolean;
  teamId: number;
};

export type TransferData = {
  type: string;
  data: {
    transfers: {
      transfersIn: Array<{
        name: string;
        playerId: number;
        transferId: number;
        transferType: string;
        fromClub: string;
        fromClubId: number;
        toClub: string;
        toClubId: number;
        fee: {
          feeText: string;
          localizedFeeText: string;
          value: string;
        };
        contractExtension: boolean;
        onLoan: boolean;
        fromDate: string;
        toDate: string;
        marketValue: string;
      }>;
      transfersOut: Array<{
        name: string;
        playerId: number;
        transferId: number;
        transferType: string;
        fromClub: string;
        fromClubId: number;
        toClub: string;
        toClubId: number;
        fee: {
          feeText: string;
          localizedFeeText: string;
          value: string;
        };
        contractExtension: boolean;
        onLoan: boolean;
        fromDate: string;
        toDate: string;
        marketValue: string;
      }>;
    };
  };
};

export type TeamStats = {
  teamId: number;
  primaryLeagueId: number;
  primarySeasonId: number;
  players: TopPlayer[];
  teams?: unknown[];
  tournamentId: number;
  tournamentSeasons: unknown[];
};

export type TeamOverview = {
  season: string;
  selectedSeason: string;
  table?: LeagueTable;
  topPlayers: TopPlayer[];
  venue: Venue;
  coachHistory: unknown[];
  overviewFixtures: MatchFixture[];
  nextMatch?: MatchFixture;
  lastMatch?: MatchFixture;
  teamForm: TeamForm[];
  hasOngoingMatch: boolean;
  previousFixturesUrl: string;
  teamColors: TeamColors;
  lastLineupStats?: unknown;
  newsSummary?: unknown;
};

export type FixtureData = {
  allFixtures: {
    fixtures: MatchFixture[];
    nextMatch: MatchFixture | null;
    lastMatch: MatchFixture | null;
  };
  primaryTournamentId: number;
  previousFixturesUrl: string;
  hasOngoingMatch: boolean;
};

// Main team detail data structure from API
export type TeamDetailData = {
  tabs: string[];
  allAvailableSeasons: unknown[];
  details: TeamDetails;
  overview: TeamOverview;
  fixtures: FixtureData;
  stats: TeamStats;
  squad?: SquadMember[];
  transfers: TransferData;
  table?: LeagueTable;
  history?: unknown;
  seostr?: string;
  QAData?: unknown[];
};

// Extended data with calculated fields
export type ExtendedTeamDetailData = TeamDetailData & {
  calculated: {
    upcomingMatch: MatchFixture | null;
    ongoingMatch: MatchFixture | null;
    previousMatches: MatchFixture[];
    nextMatches: MatchFixture[];
    currentLeaguePosition?: number;
    recentFormString?: string;
    nextMatchCountdown?: string;
    teamFormResults?: string;
  };
};
