export interface LaLigaClub {
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
