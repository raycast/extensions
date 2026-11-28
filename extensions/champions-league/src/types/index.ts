export type Translations = Record<string, Record<string, string> | undefined>;

export interface Team {
  id: string;
  internationalName: string;
  teamCode: string;
  countryCode: string;
  logoUrl: string;
  mediumLogoUrl: string;
  bigLogoUrl: string;
  associationLogoUrl?: string;
  isPlaceHolder?: boolean;
  translations?: Translations;
}

export interface Person {
  id: string;
  internationalName?: string;
  clubShirtName?: string;
  countryCode?: string;
  birthDate?: string;
  age?: string;
  height?: number;
  weight?: number;
  imageUrl?: string;
  clubId?: string;
  clubJerseyNumber?: string;
  fieldPosition?: string;
  detailedFieldPosition?: string;
  nationalTeamId?: string;
  translations?: Translations;
}

export type Player = Person;

export interface Stadium {
  id: string;
  capacity?: number;
  openingDate?: string;
  address?: string;
  city?: { translations?: Translations };
  countryCode?: string;
  geolocation?: { latitude: number; longitude: number };
  images?: Record<string, string>;
  translations?: Translations;
}

export interface Round {
  id: string;
  seasonYear: string;
  phase: "PREQUALIFYING" | "QUALIFYING" | "TOURNAMENT";
  mode: string;
  orderInCompetition: number;
  status?: string;
  dateFrom: string;
  dateTo: string;
  metaData: { name: string; type: string };
  translations?: Translations;
}

export interface Matchday {
  id: string;
  longName: string;
  name: string;
}

export interface Score {
  home: number;
  away: number;
}

export interface MatchScore {
  regular?: Score;
  total?: Score;
  penalty?: Score;
  aggregate?: Score;
}

export type MatchStatus =
  | "UNKNOWN"
  | "FINISHED"
  | "UPCOMING"
  | "LIVE"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELED"
  | "ABANDONED";

export interface PlayerEvent {
  id: string;
  phase: string;
  teamId: string;
  player: Person;
  goalType?: "SCORED" | "OWN" | "PENALTY";
  penaltyType?: string;
  time: { minute: number; second: number; injuryMinute?: number };
}

export interface Referee {
  role: string;
  person: Person;
}

export interface Match {
  id: string;
  seasonYear: string;
  status: MatchStatus;
  phase?: string;
  type?: string;
  minute?: { normal?: number; injury?: number };
  homeTeam: Team;
  awayTeam: Team;
  score?: MatchScore;
  kickOffTime: { date: string; dateTime?: string; utcOffsetInHours?: number };
  fullTimeAt?: string;
  matchday?: Matchday;
  round: Round;
  group?: { id: string; metaData: { groupName: string } };
  leg?: { number: number };
  stadium?: Stadium;
  matchAttendance?: number;
  referees?: Referee[];
  playerOfTheMatch?: { player: Person; teamId: string };
  playerEvents?: {
    scorers?: PlayerEvent[];
    redCards?: PlayerEvent[];
    penaltyScorers?: PlayerEvent[];
  };
  winner?: {
    match?: { reason: string; team?: Team };
    aggregate?: { reason: string; team?: Team };
  };
  condition?: {
    temperature?: number;
    weatherCondition?: string;
    translations?: Translations;
  };
}

export interface StandingItem {
  rank: number;
  previousRank?: number;
  rankTrend?: "UP" | "DOWN" | "SAME";
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isLive?: boolean;
  team: Team;
  qualified?: boolean;
}

export interface Standing {
  group: {
    id: string;
    metaData: { groupName: string; groupShortName: string };
    teamsQualifiedNumber?: number;
    roundId: string;
  };
  items: StandingItem[];
}

export interface Season {
  id: string;
  seasonYear: string;
  name: string;
  shortName: string;
  startDate: string;
  endDate: string;
  status: "FUTURE" | "OPEN" | "CLOSED" | "INACTIVE" | string;
}

export interface Statistic {
  name: string;
  value: string;
  translations?: Translations;
}

export interface PlayerRanking {
  playerId: string;
  teamId: string;
  player?: Person;
  team?: Team;
  statistics: Statistic[];
}

export interface PlayerSeasonRecord {
  seasonYear: string;
  teamId: string;
  statistics: Statistic[];
}

export interface TeamRanking {
  teamId: string;
  team?: Team;
  statistics: Statistic[];
}

export interface SquadMember {
  jerseyNumber?: number;
  availableForNextMatch?: boolean;
  player: Person;
}

export interface Squad {
  teamId: string;
  coaches: {
    role: string;
    imageUrl?: string;
    person: Person;
    translations?: Translations;
  }[];
  squad: {
    fieldPosition: string;
    players: SquadMember[];
    translations?: Translations;
  }[];
}

export interface LineupPlayer {
  jerseyNumber?: number;
  type?: string;
  isCaptain?: boolean;
  player: Person;
}

export interface TeamLineup {
  team: Team;
  field?: LineupPlayer[];
  bench?: LineupPlayer[];
  coaches?: { person: Person; role: string }[];
  tactics?: { formation?: string } | string;
  shirtColor?: string;
}

export interface Lineups {
  matchId: string;
  lineupStatus: string;
  homeTeam: TeamLineup;
  awayTeam: TeamLineup;
}

export interface MatchEvent {
  id: string;
  type: string;
  subType?: string;
  phase: string;
  time?: { minute: number; second: number; injuryMinute?: number };
  timestamp?: string;
  injuryTimeMinutesAdded?: number;
  primaryActor?: { person?: Person; team?: Team; type?: string };
  secondaryActor?: { person?: Person; team?: Team; type?: string };
  totalScore?: Score;
  detail?: string;
  bodyPart?: string;
  varInfo?: { decision?: string; type?: string };
}

export interface TeamMatchStats {
  teamId: string;
  statistics: Statistic[];
}

export interface Pagination<T> {
  data: T[];
  hasMore: boolean;
}
