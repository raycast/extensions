export interface Publisher {
  id: string;
  name: string;
}

export interface OperatingSystem {
  name: string;
  label: string;
}

export interface Architecture {
  name: string;
  label: string;
}

export interface LogoUrl {
  large: string;
  small: string;
}

export enum SourceType {
  STORE = "store",
  VERIFIED_PUBLISHER = "verified_publisher",
  COMMUNITY = "community",
}

export enum FilterType {
  OFFICIAL = "official",
  VERIFIED_PUBLISHER = "verified_publisher",
  COMMUNITY = "community",
}

export interface SearchSummary {
  id: string;
  name: string;
  slug: string;
  type: string;
  publisher: Publisher;
  created_at: string;
  updated_at: string;
  short_description: string;
  source: SourceType;
  popularity: number;
  categories: any;
  operating_systems: OperatingSystem[];
  architectures: Architecture[];
  logo_url: LogoUrl;
  certification_status: string;
  star_count: number;
  pull_count: number;
  filter_type: FilterType;
  url?: string;
  from?: string;
}

export interface SearchResult {
  count: number;
  summaries: SearchSummary[];
  page: number;
  page_size: number;
  next: string;
  previous: string;
}
