export interface LaLigaClub {
  team: Team;
}

export interface LaLigaClubs {
  total: number;
  teams: Team[];
}

export interface LaLigaStanding {
  standings: Standing[];
}

export interface LaLigaMatch {
  matches: Match[];
}

export interface Match {
  id: number;
  name: string;
  slug: string;
  date: Date;
  time: Date;
  home_score: number;
  away_score: number;
  status: Status;
  home_team: Team;
  away_team: Team;
  venue: Venue;
  persons_role: PersonsRole[];
  subscription: Subscription;
  temperature: Temperature;
  ball: Ball;
}

export interface Standing {
  played: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: string;
  position: number;
  previous_position: number;
  difference_position: number;
  team: Team;
}

export interface Team {
  id: number;
  slug: string;
  name: string;
  nickname: string;
  boundname: string;
  shortname: string;
  color: string;
  color_secondary: string;
  shirt_style?: string;
  foundation?: Date;
  address: string;
  web: string;
  twitter: string;
  facebook: string;
  instagram?: string;
  mail?: string;
  phone: string;
  fax?: string;
  sprite_status: string;
  club: Club;
  venue: Venue;
  shield: Shield;
  competitions: Competition[];
  last_main_competition: Competition;
  opta_id: string;
  lde_id: number;
}

export interface Club {
  id: number;
  slug: string;
  name: string;
  nickname: string;
  boundname: string;
  shortname: string;
  selector_name: string;
  address: string;
  foundation: Date;
  web: string;
  twitter: string;
  facebook: string;
  instagram: string;
  mail: string;
  phone: string;
  fax?: string;
  president?: string;
}

export interface Competition {
  id: number;
  name: string;
  slug: string;
  main: boolean;
}

export interface Shield {
  id: number;
  name: string;
  caption?: string;
  url: string;
  resizes: Resizes;
}

export interface Resizes {
  xsmall: string;
  small: string;
  medium: string;
  large: string;
  xlarge: string;
}

export interface Venue {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  capacity: number;
  address: string;
  country: Country;
  image?: Shield;
  timezone: string;
  city: string;
  slug: string;
  opta_id: string;
  lde_id: number;
}

export interface Country {
  id: string;
}

export interface Ball {
  id: number;
  name: BallName;
  image: string;
}

export enum BallName {
  Accelerate = "ACCELERATE",
  Adrenalina = "ADRENALINA",
}

export enum Status {
  FullTime = "FullTime",
  PreMatch = "PreMatch",
}

export interface PersonsRole {
  person: Person;
  role: Role;
}

export interface Person {
  name: string;
  nickname: string;
  firstname: string;
  lastname: string;
}

export interface Role {
  id: number;
  name: RoleName;
}

export enum RoleName {
  Avar = "AVAR",
  Var = "VAR",
  ÁrbitroPrincipal = "Árbitro Principal",
}

export interface Subscription {
  name: string;
  teams: Team[];
  rounds: any[];
}

export interface Temperature {
  enabled_historical: boolean;
  enabled_forecast: boolean;
}
