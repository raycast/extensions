export interface Root {
  leagues: League[];
  season: Season2;
  day: Day;
  events: Event[];
}

export interface League {
  id: string;
  uid: string;
  name: string;
  abbreviation: string;
  slug: string;
  season: Season;
  logos: Logo[];
  calendarType: string;
  calendarIsWhitelist: boolean;
  calendarStartDate: string;
  calendarEndDate: string;
  calendar: string[];
}

export interface Season {
  year: number;
  startDate: string;
  endDate: string;
  displayName: string;
  type: Type;
}

export interface Type {
  id: string;
  type: number;
  name: string;
  abbreviation: string;
}

export interface Logo {
  href: string;
  width: number;
  height: number;
  alt: string;
  rel: string[];
  lastUpdated: string;
}

export interface Season2 {
  type: number;
  year: number;
}

export interface Day {
  date: string;
}

export interface Event {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  season: Season3;
  competitions: Competition[];
  links: Link4[];
  status: Status2;
}

export interface Season3 {
  year: number;
  type: number;
  slug: string;
}

export interface Competition {
  id: string;
  uid: string;
  date: string;
  attendance: number;
  type: Type2;
  timeValid: boolean;
  neutralSite: boolean;
  conferenceCompetition: boolean;
  playByPlayAvailable: boolean;
  recent: boolean;
  venue: Venue;
  competitors: Competitor[];
  notes: Note[];
  situation: Situation;
  status: Status;
  broadcasts: Broadcast[];
  format: Format;
  startDate: string;
  series: Series;
  broadcast: string;
  geoBroadcasts: GeoBroadcast[];
  highlights: [];
}

export interface Type2 {
  id: string;
  abbreviation: string;
}

export interface Venue {
  id: string;
  fullName: string;
  address: Address;
  indoor: boolean;
}

export interface Address {
  city: string;
  state: string;
}

export interface Competitor {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: string;
  team: Team;
  score: string;
  linescores: Linescore[];
  statistics: Statistic[];
  leaders: Leader[];
  record: string;
  records: Record[];
}

export interface Team {
  id: string;
  uid: string;
  location: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  color: string;
  alternateColor: string;
  isActive: boolean;
  venue: Venue2;
  links: Link[];
  logo: string;
}

export interface Venue2 {
  id: string;
}

export interface Link {
  rel: string[];
  href: string;
  text: string;
  isExternal: boolean;
  isPremium: boolean;
}

export interface Linescore {
  value: number;
  displayValue: string;
  period: number;
}

export interface Statistic {
  name: string;
  abbreviation: string;
  displayValue: string;
}

export interface Leader {
  name: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  leaders: Leader2[];
}

export interface Leader2 {
  displayValue: string;
  value: number;
  athlete: Athlete;
  team: Team3;
}

export interface Athlete {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: Link2[];
  headshot: string;
  jersey: string;
  position: Position;
  team: Team2;
  active: boolean;
}

export interface Link2 {
  rel: string[];
  href: string;
}

export interface Position {
  abbreviation: string;
}

export interface Team2 {
  id: string;
}

export interface Team3 {
  id: string;
}

export interface Record {
  name: string;
  abbreviation?: string;
  type: string;
  summary: string;
}

export interface Note {
  type: string;
  headline: string;
}

export interface Situation {
  lastPlay: LastPlay;
}

export interface LastPlay {
  id: string;
  type: Type3;
  text: string;
  scoreValue: number;
  team: Team4;
  probability: Probability;
  athletesInvolved: AthletesInvolved[];
}

export interface Type3 {
  id: string;
  text: string;
}

export interface Team4 {
  id: string;
}

export interface Probability {
  tiePercentage: number;
  homeWinPercentage: number;
  awayWinPercentage: number;
}

export interface AthletesInvolved {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: Link3[];
  headshot: string;
  jersey: string;
  position: string;
  team: Team5;
}

export interface Link3 {
  rel: string[];
  href: string;
}

export interface Team5 {
  id: string;
}

export interface Status {
  clock: number;
  displayClock: string;
  period: number;
  type: Type4;
}

export interface Type4 {
  id: string;
  name: string;
  state: string;
  completed: boolean;
  description: string;
  detail: string;
  shortDetail: string;
}

export interface Broadcast {
  market: string;
  names: string[];
}

export interface Format {
  regulation: Regulation;
}

export interface Regulation {
  periods: number;
}

export interface Series {
  type: string;
  title: string;
  summary: string;
  completed: boolean;
  totalCompetitions: number;
  competitors: Competitor2[];
}

export interface Competitor2 {
  id: string;
  uid: string;
  wins: number;
  ties: number;
  href: string;
}

export interface GeoBroadcast {
  type: Type5;
  market: Market;
  media: Media;
  lang: string;
  region: string;
}

export interface Type5 {
  id: string;
  shortName: string;
}

export interface Market {
  id: string;
  type: string;
}

export interface Media {
  shortName: string;
  logo?: string;
  darkLogo?: string;
}

export interface Link4 {
  language: string;
  rel: string[];
  href: string;
  text: string;
  shortText: string;
  isExternal: boolean;
  isPremium: boolean;
}

export interface Status2 {
  clock: number;
  displayClock: string;
  period: number;
  type: Type6;
}

export interface Type6 {
  id: string;
  name: string;
  state: string;
  completed: boolean;
  description: string;
  detail: string;
  shortDetail: string;
}
