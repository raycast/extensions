export interface ScheduleResponse {
  leagues: LeaguesItem[];
  season: Season;
  week: Week;
  events: EventsItem[];
}
export interface LeaguesItem {
  id: string;
  uid: string;
  name: string;
  abbreviation: string;
  slug: string;
  season: Season;
  logos: LogosItem[];
  calendarType: string;
  calendarIsWhitelist: boolean;
  calendarStartDate: string;
  calendarEndDate: string;
  calendar: CalendarItem[];
}

export interface Season {
  year: number;
  startDate?: string;
  endDate?: string;
  displayName?: string;
  type: Type | number;
  slug?: string;
}

export interface Type {
  id: string;
  type?: number;
  name?: string;
  abbreviation?: string;
  state?: string;
  completed?: boolean;
  description?: string;
  detail?: string;
  shortDetail?: string;
  shortName?: string;
}

export interface LogosItem {
  href: string;
  width: number;
  height: number;
  alt: string;
  rel: string[];
  lastUpdated: string;
}

export interface CalendarItem {
  label: string;
  value: string;
  startDate: string;
  endDate: string;
}

export interface Week {
  number: number;
}

export interface EventsItem {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  season: Season;
  week: Week;
  competitions: CompetitionsItem[];
  links: LinksItem[];
  weather: Weather;
  status: Status;
}

export interface CompetitionsItem {
  id: string;
  uid: string;
  date: string;
  attendance: number;
  type: Type;
  timeValid: boolean;
  neutralSite: boolean;
  conferenceCompetition: boolean;
  playByPlayAvailable: boolean;
  recent: boolean;
  venue: Venue;
  competitors: CompetitorsItem[];
  notes: NotesItem[];
  status: Status;
  broadcasts: BroadcastsItem[];
  leaders: LeadersItem[];
  format: Format;
  tickets: TicketsItem[];
  startDate: string;
}

export interface Venue {
  id: string;
  fullName?: string;
  address?: Address;
  capacity?: number;
  indoor?: boolean;
}

export interface Address {
  city: string;
  state: string;
}

export interface CompetitorsItem {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: string;
  team: Team;
  score: string;
  records: RecordsItem[];
  leaders: LeadersItem[];
}

export interface Team {
  id: string;
  uid?: string;
  location?: string;
  name?: string;
  abbreviation?: string;
  displayName?: string;
  shortDisplayName?: string;
  color?: string;
  alternateColor?: string;
  isActive?: boolean;
  venue?: Venue;
  links?: LinksItem[];
  logo?: string;
}

export interface LinksItem {
  rel?: string[];
  href: string;
  text?: string;
  isExternal?: boolean;
  isPremium?: boolean;
  language?: string;
  shortText?: string;
}

export interface RecordsItem {
  name: string;
  abbreviation?: string;
  type: string;
  summary: string;
}

export interface LeadersItem {
  name?: string;
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  leaders: LeaderInnerItem[];
}

export interface LeaderInnerItem {
  displayValue: string;
  value: number;
  athlete: Athlete;
  team: InnerTeam;
}

export interface InnerTeam {
  id: string;
}

export interface Athlete {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: LinksItem[];
  headshot: string;
  jersey: string;
  position: Position;
  team: Team;
  active: boolean;
}

export interface Position {
  abbreviation: string;
}

export interface NotesItem {
  type: string;
  headline: string;
}

export interface Status {
  clock: number;
  displayClock: string;
  period: number;
  type: Type;
}

export interface BroadcastsItem {
  market: string;
  names: string[];
}

export interface Format {
  regulation: Regulation;
}

export interface Regulation {
  periods: number;
}

export interface TicketsItem {
  summary: string;
  numberAvailable: number;
  links: LinksItem[];
}

export interface Weather {
  displayValue: string;
  temperature: number;
  highTemperature: number;
  conditionId: string;
  link: Link;
}

export interface Link {
  language: string;
  rel: string[];
  href: string;
  text: string;
  shortText: string;
  isExternal: boolean;
  isPremium: boolean;
}
