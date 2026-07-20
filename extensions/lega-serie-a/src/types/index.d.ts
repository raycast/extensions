export interface SerieA<T> {
  success: boolean;
  message: string;
  errors: unknown[];
  data: T;
  code: number;
}

export interface Matchday {
  id_category: number;
  title: string;
  description: string;
  slug: string;
  url: string;
  category_status: CategoryStatus;
}

export enum CategoryStatus {
  Live = "LIVE",
  Played = "PLAYED",
  ToBePlayed = "TO BE PLAYED",
}

export interface DataV3 {
  apiCallRequestTime: Date;
  standings: TableStanding[];
}

export interface TableStanding {
  apiCallRequestTime: Date;
  competition: Competition;
  editorials: unknown[];
  legenda: unknown[];
  teams: Standing[];
  type: string;
}

export interface Standing {
  achievementStatuses: AchievementStatus[];
  acronymName: string;
  acronymNameLocalized: string;
  countryCode: null;
  isTeamFake: boolean;
  mediaName: string;
  mediaShortName: string;
  note: string;
  officialName: string;
  providerId: string;
  qualification: Qualification | null;
  shortName: string;
  stadium: null;
  stats: Stat[];
  teamId: string;
  teamType: null;
  team_active: string;
  team_id: string;
  team_image: string;
  team_image_secondary: string;
  team_slug: string;
  // legacy api
  CAMPIONATO: string;
  CODSQUADRA: string;
  GIRONE: string;
  Giocate: number;
  GiocateCasa: number;
  GiocateFuori: number;
  Nome: string;
  NomeCompleto: string;
  NomeSintetico: string;
  Pareggiate: number;
  PareggiateCasa: number;
  PareggiateFuori: number;
  Perse: number;
  PerseCasa: number;
  PerseFuori: number;
  PosCls: number;
  PuntiCls: number;
  PuntiClsCasa: number;
  PuntiClsFuori: number;
  PuntiPen: number;
  RETIFATTE: number;
  RETISUBITE: number;
  RetiFatteCasa: number;
  RetiFatteFuori: number;
  RetiSubiteCasa: number;
  RetiSubiteFuori: number;
  STAGIONE: string;
  TURNO: string;
  Vinte: number;
  VinteCasa: number;
  VinteFuori: number;
  do_deleted: number;
  do_inserted: number;
  do_loaded: number;
  do_updated: number;
  team_active: string;
  team_image: string;
  team_image_secondary: string;
  team_slug: string;
  Note?: string;
  NoteENG?: string;
}

export interface Match {
  away_coach_id: number;
  away_coach_image: string;
  away_coach_name: string;
  away_coach_surname: string;
  away_goal: number;
  away_netco_id: string;
  away_penalty_goal: number;
  away_schema: string;
  away_secondary_team_logo: string;
  away_team_active: number;
  away_team_logo: string;
  away_team_name: string;
  away_team_short_name: string;
  away_team_url: string;
  broadcasters?: string;
  category_status: string;
  championship_background_image: string;
  championship_category_id: number;
  championship_category_status: string;
  championship_image: string;
  championship_metadata: string;
  championship_title: string;
  date_time: Date;
  georule_id: number;
  highlight: string;
  home_coach_id: number;
  home_coach_image: string;
  home_coach_name: string;
  home_coach_surname: string;
  home_goal: number;
  home_netco_id: string;
  home_penalty_goal: number;
  home_schema: string;
  home_secondary_team_logo: string;
  home_team_active: number;
  home_team_logo: string;
  home_team_name: string;
  home_team_short_name: string;
  home_team_ticket_url: string;
  home_team_url: string;
  id_category: number;
  live_timing: string;
  match_day_category_status: CategoryStatus;
  match_day_id_category: number;
  match_day_title: string;
  match_hm: string;
  match_id: number;
  match_lineup_pdf: string;
  match_name: string;
  match_program_pdf: string;
  match_report: number;
  match_report_pdf: string;
  match_status: number;
  minutes_played: string;
  netco_id: string;
  play_phase: string;
  referee: string;
  round_category_status: null;
  round_id_category: number;
  round_title: string;
  season_title: string;
  slug: string;
  ticket_url: string;
  unknown_datetime: number;
  venue_background_image: string;
  venue_id: number;
  venue_image: string;
  venue_name: string;
  venue_plan_image: string;
  weather?: string;
}

export interface Competition {
  acronymName: string;
  competitionId: string;
  endDateUtc: null;
  name: string;
  officialName: string;
  providerId: string;
  seasonId: string;
  seasonName: string;
  shortName: string;
  startDateUtc: null;
}

export interface Qualification {
  qualificationId: number;
  qualificationLabel: string;
}

export interface AchievementStatus {
  statusLabel: string;
  typeLabel: string;
}

export interface Stat {
  statsId: string;
  statsLabel: string;
  statsLabelAbbreviation: string;
  statsUnit: null;
  statsUnitAbbreviation: null;
  statsValue: StatsValue[] | string | number | null;
}

export interface StatsValue {
  formLabel: string;
  formLabelAbbreviation: string;
  formType: string;
}

export interface Broadcaster {
  url: string;
  name: string;
  image: string;
}

export interface Teams {
  name: string;
  type: string;
  uicode: string;
  body: Team[];
  data: Pagination;
}

export interface Team {
  id: string;
  team_logo: string;
  team_name: string;
  url: string;
}

export interface Pagination {
  _limit: string;
  _total: number;
  subtitle: string;
  title: string;
}

export interface SquadGroup {
  A: Squad[];
  C: Squad[];
  D: Squad[];
  P: Squad[];
}

export interface Squad {
  player_id: number;
  slug: string;
  name: string;
  surname: string;
  surname_full: string;
  short_name: string;
  category_season_id: number;
  birth_day: Date;
  image: string;
  medium_shot: string;
  head_shot: string;
  uniform_number: number;
  nationality: string;
  team_id: number;
  formation: number;
  cod_role: CodRole;
  role: Role;
  visible: boolean;
  netco_id: string;
  opta_id: string;
  active: boolean;
  georule_id: number;
  status: Status;
  iso3: string;
  team_name: string;
  team_logo: string;
}

export enum CodRole {
  A = "A",
  C = "C",
  D = "D",
  P = "P",
}

export enum Role {
  Attaccante = "Attaccante",
  Centrocampista = "Centrocampista",
  Difensore = "Difensore",
  Portiere = "Portiere",
}

export interface Club {
  active: number;
  address: string;
  background_image: string;
  business_name: string;
  category_season_id: number;
  city: string;
  coach_id: number;
  cod_coach: string;
  created_at: Date;
  deleted_at: null;
  entity_id: number;
  facebook_url: string;
  fax: string;
  georule: string;
  georule_id: number;
  instagram_url: string;
  json_tag: string;
  logo: string;
  name: string;
  netco_full_id: string;
  netco_id: string;
  opta_id: string;
  order: number;
  phone_number: string;
  president: string;
  secondary_logo: string;
  shop_url: string;
  short_name: string;
  slug: string;
  source_full_logo_path: null;
  status: string;
  tag: string;
  team_id: number;
  team_type: string;
  ticket_url: string;
  twitter_url: string;
  uniform_away: string;
  uniform_away_url: string;
  uniform_home: string;
  uniform_home_url: string;
  uniform_third: string;
  uniform_third_url: string;
  updated_at: Date;
  venue_id: number;
  website: string;
  youtube: string;
  zip_code: number;
  "x-geoip-country": string;
  image_url: string;
}
