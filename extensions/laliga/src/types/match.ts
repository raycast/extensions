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

export interface Team {
  id: number;
  slug: string;
  name: string;
  nickname: string;
  boundname: string;
  shortname: string;
  sprite_status: SpriteStatus;
  shield: Shield;
  competitions: any[];
}

export interface Shield {
  id: number;
  url: string;
}

export enum SpriteStatus {
  Created = "created",
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

export enum Status {
  FullTime = "FullTime",
  PreMatch = "PreMatch",
}

export interface Subscription {
  name: SubscriptionName;
  teams: any[];
  rounds: any[];
}

export enum SubscriptionName {
  LaLigaSantander = "LaLiga Santander",
}

export interface Temperature {
  enabled_historical: boolean;
  enabled_forecast: boolean;
}

export interface Venue {
  name: string;
  latitude: string;
  longitude: string;
  address: string;
  timezone: Timezone;
  city: string;
}

export enum Timezone {
  EuropeMadrid = "Europe/Madrid",
}
