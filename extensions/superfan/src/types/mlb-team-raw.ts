export interface RootTwo {
  team: Team;
}

export interface Team {
  id: string;
  uid: string;
  slug: string;
  location: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  color: string;
  alternateColor: string;
  isActive: boolean;
  logos: Logo[];
  record: Record;
  groups: Groups;
  links: Link[];
  franchise: Franchise;
  nextEvent: NextEvent[];
  standingSummary: string;
}

export interface Logo {
  href: string;
  width: number;
  height: number;
  alt: string;
  rel: string[];
  lastUpdated: string;
}

export interface Record {
  items: Item[];
}

export interface Item {
  description: string;
  type: string;
  summary: string;
  stats: Stat[];
}

export interface Stat {
  name: string;
  value: number;
}

export interface Groups {
  id: string;
  parent: Parent;
  isConference: boolean;
}

export interface Parent {
  id: string;
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

export interface Franchise {
  $ref: string;
  id: string;
  uid: string;
  slug: string;
  location: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  color: string;
  isActive: boolean;
  venue: Venue;
  team: Team2;
  awards: Awards;
}

export interface Venue {
  $ref: string;
  id: string;
  fullName: string;
  address: Address;
  grass: boolean;
  indoor: boolean;
  images: Image[];
}

export interface Address {
  city: string;
  state: string;
  zipCode: string;
}

export interface Image {
  href: string;
  width: number;
  height: number;
  alt: string;
  rel: string[];
}

export interface Team2 {
  $ref: string;
}

export interface Awards {
  $ref: string;
}

export interface NextEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  season: Season;
  seasonType: SeasonType;
  week: Week;
  timeValid: boolean;
  competitions: Competition[];
  links: Link5[];
}

export interface Season {
  year: number;
  displayName: string;
}

export interface SeasonType {
  id: string;
  type: number;
  name: string;
  abbreviation: string;
}

export interface Week {
  number: number;
  text: string;
}

export interface Competition {
  id: string;
  date: string;
  attendance: number;
  type: Type;
  timeValid: boolean;
  neutralSite: boolean;
  boxscoreAvailable: boolean;
  ticketsAvailable: boolean;
  venue: Venue2;
  competitors: Competitor[];
  notes: Note[];
  broadcasts: Broadcast[];
  tickets: Ticket[];
  status: Status;
}

export interface Note {
  type: string;
  headline: string;
}

export interface Type {
  id: string;
  text: string;
  abbreviation: string;
  slug: string;
  type: string;
}

export interface Venue2 {
  fullName: string;
  address: Address2;
}

export interface Address2 {
  city: string;
  state: string;
  zipCode: string;
}

export interface Competitor {
  id: string;
  type: string;
  order: number;
  homeAway: string;
  team: Team3;
  probables: Probable[];
}

export interface Team3 {
  id: string;
  location: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  logos: Logo2[];
  links: Link2[];
}

export interface Logo2 {
  href: string;
  width: number;
  height: number;
  alt: string;
  rel: string[];
  lastUpdated: string;
}

export interface Link2 {
  rel: string[];
  href: string;
  text: string;
}

export interface Probable {
  name: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  playerId: number;
  athlete: Athlete;
  statistics: Statistic[];
}

export interface Athlete {
  id: string;
  lastName: string;
  displayName: string;
  shortName: string;
  links: Link3[];
  team: Team4;
}

export interface Link3 {
  href: string;
}

export interface Team4 {
  id: string;
  name: string;
}

export interface Statistic {
  name: string;
  stats: Stat2[];
}

export interface Stat2 {
  name: string;
  displayValue: string;
}

export interface Broadcast {
  type: Type2;
  market: Market;
  media: Media;
  lang: string;
  region: string;
}

export interface Type2 {
  id: string;
  shortName: string;
}

export interface Market {
  id: string;
  type: string;
}

export interface Media {
  shortName: string;
}

export interface Ticket {
  id: string;
  summary: string;
  description: string;
  maxPrice: number;
  startingPrice: number;
  numberAvailable: number;
  totalPostings: number;
  links: Link4[];
}

export interface Link4 {
  rel: string[];
  href: string;
}

export interface Status {
  clock: number;
  displayClock: string;
  period: number;
  type: Type3;
  halfInning: number;
  periodPrefix: string;
}

export interface Type3 {
  id: string;
  name: string;
  state: string;
  completed: boolean;
  description: string;
  detail: string;
  shortDetail: string;
}

export interface Link5 {
  language: string;
  rel: string[];
  href: string;
  text: string;
  shortText: string;
  isExternal: boolean;
  isPremium: boolean;
}
