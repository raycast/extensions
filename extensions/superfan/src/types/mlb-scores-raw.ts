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
  midsizeName: string;
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
  links: Link10[];
  status: Status2;
  weather?: Weather;
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
  wasSuspended: boolean;
  venue: Venue;
  competitors: Competitor[];
  notes: Note[];
  status: Status;
  broadcasts: Broadcast[];
  leaders: Leader3[];
  format: Format;
  startDate: string;
  broadcast: string;
  geoBroadcasts: GeoBroadcast[];
  highlights: Highlight[];
  headlines?: Headline[];
  situation?: Situation;
  outsText?: string;
}

export interface Note {
  type: string;
  headline: string;
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
  winner?: boolean;
  team: Team;
  score: string;
  linescores: Linescore[];
  statistics: Statistic[];
  leaders: Leader[];
  probables: Probable[];
  hits: number;
  errors: number;
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
  links: Link[];
  logo: string;
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

export interface Probable {
  name: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  playerId: number;
  athlete: Athlete2;
  statistics: Statistic2[];
  record: string;
}

export interface Athlete2 {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: Link3[];
  headshot: string;
  jersey: string;
  position: string;
  team: Team4;
}

export interface Link3 {
  rel: string[];
  href: string;
}

export interface Team4 {
  id: string;
}

export interface Statistic2 {
  name: string;
  abbreviation: string;
  displayValue: string;
  rankDisplayValue?: string;
}

export interface Record {
  name: string;
  abbreviation?: string;
  type: string;
  summary: string;
}

export interface Status {
  clock: number;
  displayClock: string;
  period: number;
  type: Type3;
  featuredAthletes?: FeaturedAthlete[];
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

export interface FeaturedAthlete {
  name: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  playerId: number;
  athlete: Athlete3;
  team: Team6;
  statistics: Statistic3[];
}

export interface Athlete3 {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: Link4[];
  headshot: string;
  jersey: string;
  position: string;
  team: Team5;
}

export interface Link4 {
  rel: string[];
  href: string;
}

export interface Team5 {
  id: string;
}

export interface Team6 {
  id: string;
}

export interface Statistic3 {
  name: string;
  abbreviation: string;
  displayValue: string;
}

export interface Broadcast {
  market: string;
  names: string[];
}

export interface Leader3 {
  name: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  leaders: Leader4[];
}

export interface Leader4 {
  displayValue: string;
  value: number;
  athlete: Athlete4;
  team: Team8;
}

export interface Athlete4 {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: Link5[];
  headshot: string;
  jersey: string;
  position: Position2;
  team: Team7;
  active: boolean;
}

export interface Link5 {
  rel: string[];
  href: string;
}

export interface Position2 {
  abbreviation: string;
}

export interface Team7 {
  id: string;
}

export interface Team8 {
  id: string;
}

export interface Format {
  regulation: Regulation;
}

export interface Regulation {
  periods: number;
}

export interface GeoBroadcast {
  type: Type4;
  market: Market;
  media: Media;
  lang: string;
  region: string;
}

export interface Type4 {
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

export interface Highlight {
  id: number;
  cerebroId: string;
  source: string;
  headline: string;
  description: string;
  lastModified: string;
  originalPublishDate: string;
  duration: number;
  timeRestrictions: TimeRestrictions;
  deviceRestrictions: DeviceRestrictions;
  geoRestrictions: GeoRestrictions;
  thumbnail: string;
  links: Links;
  ad: Ad;
  tracking: Tracking;
}

export interface TimeRestrictions {
  embargoDate: string;
  expirationDate: string;
}

export interface DeviceRestrictions {
  type: string;
  devices: string[];
}

export interface GeoRestrictions {
  type: string;
  countries: string[];
}

export interface Links {
  web: Web;
  mobile: Mobile;
  api: Api;
  source: Source2;
  sportscenter: Sportscenter;
}

export interface Web {
  href: string;
  self: Self;
  seo: Seo;
}

export interface Self {
  href: string;
  dsi?: Dsi;
}

export interface Dsi {
  href: string;
}

export interface Seo {
  href: string;
}

export interface Mobile {
  href: string;
  source: Source;
  alert: Alert;
  streaming: Streaming;
  progressiveDownload: ProgressiveDownload;
}

export interface Source {
  href: string;
}

export interface Alert {
  href: string;
}

export interface Streaming {
  href: string;
}

export interface ProgressiveDownload {
  href: string;
}

export interface Api {
  self: Self2;
  artwork: Artwork;
}

export interface Self2 {
  href: string;
}

export interface Artwork {
  href: string;
}

export interface Source2 {
  href: string;
  mezzanine: Mezzanine;
  flash: Flash;
  hds: Hds;
  HLS: Hls;
  HD: Hd2;
  full: Full;
}

export interface Mezzanine {
  href: string;
}

export interface Flash {
  href: string;
}

export interface Hds {
  href: string;
}

export interface Hls {
  href: string;
  HD: Hd;
  cmaf: Cmaf;
  "9x16"?: N9x162;
}

export interface Hd {
  href: string;
}

export interface Cmaf {
  href: string;
  shield: Shield;
  "9x16"?: N9x16;
}

export interface Shield {
  href: string;
}

export interface N9x16 {
  href: string;
}

export interface N9x162 {
  href: string;
}

export interface Hd2 {
  href: string;
}

export interface Full {
  href: string;
}

export interface Sportscenter {
  href: string;
}

export interface Ad {
  sport: string;
  bundle: string;
}

export interface Tracking {
  sportName: string;
  leagueName: string;
  coverageType: string;
  trackingName: string;
  trackingId: string;
}

export interface Headline {
  type: string;
  description: string;
  shortLinkText: string;
  video?: Video[];
}

export interface Video {
  id: number;
  source: string;
  headline: string;
  thumbnail: string;
  duration: number;
  tracking: Tracking2;
  deviceRestrictions: DeviceRestrictions2;
  geoRestrictions: GeoRestrictions2;
  links: Links2;
}

export interface Tracking2 {
  sportName: string;
  leagueName: string;
  coverageType: string;
  trackingName: string;
  trackingId: string;
}

export interface DeviceRestrictions2 {
  type: string;
  devices: string[];
}

export interface GeoRestrictions2 {
  type: string;
  countries: string[];
}

export interface Links2 {
  web: Web2;
  mobile: Mobile2;
  api: Api2;
  source: Source4;
  sportscenter: Sportscenter2;
}

export interface Web2 {
  href: string;
  self: Self3;
  seo: Seo2;
}

export interface Self3 {
  href: string;
  dsi?: Dsi2;
}

export interface Dsi2 {
  href: string;
}

export interface Seo2 {
  href: string;
}

export interface Mobile2 {
  href: string;
  source: Source3;
  alert: Alert2;
  streaming: Streaming2;
  progressiveDownload: ProgressiveDownload2;
}

export interface Source3 {
  href: string;
}

export interface Alert2 {
  href: string;
}

export interface Streaming2 {
  href: string;
}

export interface ProgressiveDownload2 {
  href: string;
}

export interface Api2 {
  self: Self4;
  artwork: Artwork2;
}

export interface Self4 {
  href: string;
}

export interface Artwork2 {
  href: string;
}

export interface Source4 {
  href: string;
  mezzanine: Mezzanine2;
  flash: Flash2;
  hds: Hds2;
  HLS: Hls2;
  HD: Hd4;
  full: Full2;
}

export interface Mezzanine2 {
  href: string;
}

export interface Flash2 {
  href: string;
}

export interface Hds2 {
  href: string;
}

export interface Hls2 {
  href: string;
  HD: Hd3;
  cmaf: Cmaf2;
  "9x16": N9x164;
}

export interface Hd3 {
  href: string;
}

export interface Cmaf2 {
  href: string;
  "9x16": N9x163;
  shield: Shield2;
}

export interface N9x163 {
  href: string;
}

export interface Shield2 {
  href: string;
}

export interface N9x164 {
  href: string;
}

export interface Hd4 {
  href: string;
}

export interface Full2 {
  href: string;
}

export interface Sportscenter2 {
  href: string;
}

export interface Situation {
  lastPlay: LastPlay;
  balls: number;
  strikes: number;
  outs: number;
  pitcher?: Pitcher;
  batter?: Batter;
  onFirst: boolean;
  onSecond: boolean;
  onThird: boolean;
  dueUp?: DueUp[];
}

export interface LastPlay {
  id: string;
  type: Type5;
  text: string;
  scoreValue: number;
  team: Team9;
  atBatId: string;
  summaryType?: string;
  athletesInvolved?: AthletesInvolved[];
}

export interface Type5 {
  id: string;
  text: string;
  abbreviation?: string;
  alternativeText?: string;
  type: string;
}

export interface Team9 {
  id: string;
}

export interface AthletesInvolved {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: Link6[];
  headshot: string;
  jersey: string;
  position: string;
  team: Team10;
}

export interface Link6 {
  rel: string[];
  href: string;
}

export interface Team10 {
  id: string;
}

export interface Pitcher {
  playerId: number;
  period: number;
  athlete: Athlete5;
  summary: string;
}

export interface Athlete5 {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: Link7[];
  headshot: string;
  jersey: string;
  position: string;
  team: Team11;
}

export interface Link7 {
  rel: string[];
  href: string;
}

export interface Team11 {
  id: string;
}

export interface Batter {
  playerId: number;
  period: number;
  athlete: Athlete6;
  summary: string;
}

export interface Athlete6 {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: Link8[];
  headshot: string;
  jersey: string;
  position: string;
  team: Team12;
}

export interface Link8 {
  rel: string[];
  href: string;
}

export interface Team12 {
  id: string;
}

export interface DueUp {
  playerId: number;
  period: number;
  athlete: Athlete7;
  batOrder: number;
  summary: string;
}

export interface Athlete7 {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string;
  links: Link9[];
  headshot: string;
  jersey: string;
  position: string;
  team: Team13;
}

export interface Link9 {
  rel: string[];
  href: string;
}

export interface Team13 {
  id: string;
}

export interface Link10 {
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

export interface Weather {
  displayValue: string;
  temperature: number;
  highTemperature: number;
  conditionId: string;
  link: Link11;
}

export interface Link11 {
  language: string;
  rel: string[];
  href: string;
  text: string;
  shortText: string;
  isExternal: boolean;
  isPremium: boolean;
}
