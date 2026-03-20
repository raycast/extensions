// API Response Types for Ahotu Event Search

export interface EventSearchResult {
  value: number; // event id
  label: string; // event name
  date: string | null;
  edition_status: string | null;
  status: string;
  city: string | null;
  country: string | null;
  region: string | null;
  url: string | null;
  ro_is_client: boolean;
  ahotu_is_client: boolean;
  editions?: Edition[];
}

export interface Edition {
  id: number;
  date: string | null;
  status: string;
  a_event_id: number;
  races?: Race[];
}

export interface Race {
  id: number;
  name: string;
  date: string | null;
  status: string;
  activity: string | null;
  a_edition_id: number;
  event_id: number;
  event_name: string;
  city: string | null;
  country: string | null;
  region_2: string | null;
}

export interface SearchParams {
  term?: string;
  id?: number[];
  wm_id?: string[];
  permalink?: string[];
  country_in?: string[];
  region_in?: string[];
  month_in?: number[];
  year_in?: number[];
  exclude_keywords?: string[];
  client?: boolean;
  population?: string;
  status_in?: string[];
  registration_platform_in?: string[];
  include_editions?: boolean;
  include_races?: boolean;
  admin?: boolean;
}

export interface Preferences {
  apiUrl: string;
  userEmail: string;
  userToken: string;
  apiKey: string;
}
