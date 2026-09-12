export interface RaycastExtPreferences {
  token: string;
  twosToken: string;
}

export interface ApiResponse {
  pagination: Pagination;
  results: Result[];
}

interface Pagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
  urls: Record<string, unknown>;
}

interface Format {
  name: string;
  qty: string;
  descriptions: string[];
}

interface Result {
  country: string;
  year: string;
  format: string[];
  label: string[];
  type: string;
  genre: string[];
  style: string[];
  id: number;
  barcode: string[];
  user_data: UserData;
  master_id: number;
  master_url: string;
  uri: string;
  catno: string;
  title: string;
  thumb: string;
  cover_image: string;
  resource_url: string;
  community: Community;
  formats: Format[];
}

interface UserData {
  in_wantlist: boolean;
  in_collection: boolean;
}

interface Community {
  want: number;
  have: number;
}

export interface DiscogsResult {
  id: number;
  title: string;
  year?: number;
  country?: string;
  catno?: string;
  barcode?: string[];
  format?: string[];
  label?: string[];
  cover_image?: string;
  thumb?: string;
  resource_url: string;
}

/**
 * Minimal subset of fields we care about when fetching a single release
 * via https://api.discogs.com/releases/:id.
 */
export interface DiscogsIdentifier {
  type?: string;
  value?: string;
}

export interface DiscogsReleaseLabel {
  name?: string;
  catno?: string;
}

export interface DiscogsReleaseArtist {
  name?: string;
  anv?: string;
  join?: string;
  role?: string;
  tracks?: string;
  id?: number;
  resource_url?: string;
  thumbnail_url?: string;
}

export interface DiscogsReleaseDetail {
  id: number;
  title: string;
  year?: number;
  released?: string;
  released_formatted?: string;
  country?: string;
  resource_url: string;
  uri?: string;
  identifiers?: DiscogsIdentifier[];
  labels?: DiscogsReleaseLabel[];
  genres?: string[];
  styles?: string[];
  artists?: DiscogsReleaseArtist[];
}

export interface DiscogsSearchResponse {
  results: DiscogsResult[];
}
