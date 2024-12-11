import { Icon } from "@raycast/api";

export interface Repository {
  name: string;
  namespace: string;
  repository_type: string;
  status: number;
  is_private: boolean;
  star_count: number;
  pull_count: number;
  last_updated: string;
  date_registered: string;
  affiliation: string;
  media_types: (string | null)[];
  url: string;
  path: string;
}

export interface LoginResponse {
  token?: string;
  detail?: string;
  login_2fa_token?: string;
  message?: string;
  refresh_token?: string;
}

export interface ListReposResponse {
  next: string;
  previous: string | null;
  count: number;
  results: Repository[];
}

export interface UserInfo {
  id: string;
  uuid: string;
  username: string;
  full_name: string;
  location: string;
  company: string;
  profile_url: string;
  date_joined: string;
  gravatar_url: string;
  gravatar_email: string;
  type: string;
  is_admin: boolean;
  is_staff: boolean;
}

export interface TwoFactorLoginResponse {
  refresh_token?: string;
  token: string;
}

export interface ErrorResponse {
  message?: string;
  detail?: string;
}

export interface Image {
  architecture: string;
  digest: string;
  features: string;
  last_pulled: string;
  last_pushed: string;
  os: string;
  os_features: string;
  os_version: any;
  size: number;
  status: string;
  variant: any;
  os_arch?: string;
  url?: string;
  sizeHuman: string;
}

export interface Tag {
  id: number;
  creator: number;
  full_size: number;
  images: Image[];
  last_updated: string;
  last_updater: number;
  last_updater_username: string;
  name: string;
  repository: number;
  tag_last_pulled: string;
  tag_last_pushed: string;
  tag_status: string;
  v2: boolean;
}

export interface ListTagsResponse {
  count: number;
  next: string;
  previous: string;
  results: Tag[];
}

interface RatePlanRepository {
  name: string;
  namespace: string;
  description: string;
  type: SearchTypeEnum;
  pull_count: string;
  is_automated: boolean;
  is_official: boolean;
  is_trusted: boolean;
  last_pushed_at: string;
  last_pulled_at: string;
  archived: boolean;
}

interface RatePlan {
  id: string;
  repositories: RatePlanRepository[];
  operating_systems: OperatingSystem[];
  architectures: Architecture[];
}

export interface ImageSearchResult {
  id: string;
  name: string;
  slug: string;
  type: string;
  publisher: Publisher;
  created_at: string;
  updated_at: string;
  short_description: string;
  source: SourceType;
  categories: Record<string, string>[];
  rate_plans: RatePlan[];
  logo_url: LogoUrl;
  star_count: number;
  url?: string;
}

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

export enum TagStatusEnum {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export enum SourceType {
  STORE = "store",
  VERIFIED_PUBLISHER = "verified_publisher",
  COMMUNITY = "community",
  OPEN_SOURCE = "open_source",
}

export enum FilterType {
  OFFICIAL = "official",
  VERIFIED_PUBLISHER = "verified_publisher",
  COMMUNITY = "community",
  OPEN_SOURCE = "open_source",
}

export interface SearchResponse {
  total: number;
  results: ImageSearchResult[] | null;
}

export enum FilterTypes {
  OFFICIAL = "official",
  VERIFIED_PUBLISHER = "verified_publisher",
  COMMUNITY = "community",
}

export enum OperatingSystemEnum {
  WINDOWS = "windows",
  LINUX = "linux",
}

export enum ImageFilterEnum {
  OFFICIAL = "official",
  STORE = "store",
  OPEN_SOURCE = "open_source",
}

export interface SearchParams {
  image_filter?: string;
  operating_system?: string;
  size: number;
  query?: string;
  type?: SearchTypeEnum;
}

export enum SearchTypeEnum {
  IMAGE = "image",
  PLUGIN = "plugin",
}

export interface ExtensionsResponse {
  extensions: string[];
}

export interface ExtensionVersion {
  Tag: string;
  ManifestListDigest: string;
  Labels: {
    [key: string]: string;
  };
  Platforms: {
    Arch: string;
    Created: string;
    OS: string;
    Size: number;
  }[];
}

export interface ExtensionMetadata {
  CreatedTime: string;
  LatestVersion: ExtensionVersion;
  PreviousVersions: ExtensionVersion[];
  url: string;
  path: string;
}

export interface AccessToken {
  uuid: string;
  client_id: string;
  creator_ip: string;
  creator_ua: string;
  created_at: string;
  last_used: string | null;
  is_active: boolean;
  token: string;
  token_label: string;
  scopes: string[];
}

export interface ListAccessTokensResponse {
  active_count: number;
  count: number;
  next: string | null;
  previous: string | null;
  results: AccessToken[];
}

export interface ItemAccessory {
  icon: Icon;
  text?: string;
  tooltip?: string;
}
