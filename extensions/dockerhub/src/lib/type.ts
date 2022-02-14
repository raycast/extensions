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

export interface Image {
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

export interface SearchImageResult {
  count: number;
  summaries?: Image[];
  page: number;
  page_size: number;
  next: string;
  previous: string;
}

export interface SearchTagResult {
  results?: Tag[];
  previous?: any;
  next?: string;
  count: number;
}

export interface Tag {
  creator: number;
  id: number;
  image_id?: any;
  images?: TagImage[];
  last_updated: string;
  last_updater: number;
  last_updater_username: string;
  name: string;
  repository: number;
  full_size: number;
  v2: boolean;
  tag_status: string;
  tag_last_pulled: string;
  tag_last_pushed: string;
  update_time?: string;
}

export interface TagImage {
  architecture: string;
  features: string;
  variant?: any;
  digest: string;
  os: string;
  os_features: string;
  os_version?: any;
  size: number;
  status: string;
  last_pulled: string;
  last_pushed: string;
  os_arch?: string;
  url?: string;
  sizeHuman: string;
}
