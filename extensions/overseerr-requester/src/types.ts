/**
 * Represents a media item from the API (movie, TV show, or person)
 * Contains basic information about the media including metadata and status
 */
export interface MediaResult {
  id: number;
  mediaType: string;
  popularity: number;
  posterPath: string;
  profilePath?: string;
  backdropPath: string;
  voteCount: number;
  voteAverage: number;
  genreIds: number[];
  overview: string;
  originalLanguage: string;
  title?: string;
  name?: string;
  originalTitle?: string;
  originalName?: string;
  releaseDate?: string;
  firstAirDate?: string;
  adult: boolean;
  video?: boolean;
  mediaInfo?: MediaInfo;
}

/**
 * Valid media types supported by the application
 */
export type MediaType = "movie" | "tv" | "person";

/**
 * Display information for different media types including icons
 */
export interface MediaTypeInfo {
  icon: string;
  label: string;
}

/**
 * Mapping of media types to their display information
 */
export const MEDIA_TYPE_MAP: Record<MediaType, MediaTypeInfo> = {
  movie: { icon: "🎬", label: "Movie" },
  tv: { icon: "📺", label: "TV Show" },
  person: { icon: "👤", label: "Person" },
};

/**
 * Information about media status and download progress
 */
export interface MediaInfo {
  id: number;
  tmdbId: number;
  tvdbId: number;
  status: number;
  status4k?: number;
  requests: Request[];
  createdAt: string;
  updatedAt: string;
  downloadStatus?: Array<{
    title: string;
    status: string;
    size: number;
    sizeLeft: number;
    timeLeft: string;
    estimatedCompletionTime: string;
  }>;
}

/**
 * Application preferences/settings
 */
export interface Preferences {
  apiUrl: string;
  apiKey: string;
}

/**
 * Represents a media request made by a user
 */
export interface Request {
  id: number;
  status: number;
  media: string;
  createdAt: string;
  updatedAt: string;
  requestedBy: User;
  modifiedBy: User;
  is4k: boolean;
  serverId: number;
  profileId: number;
  rootFolder: string;
}

/**
 * User information and permissions
 */
export interface User {
  id: number;
  email: string;
  username: string;
  plexToken: string;
  plexUsername: string;
  userType: number;
  permissions: number;
  avatar: string;
  createdAt: string;
  updatedAt: string;
  requestCount: number;
}

/**
 * Configuration for Radarr/Sonarr servers
 */
export interface ArrSettings {
  id: number;
  name: string;
  hostname: string;
  port: number;
  apiKey: string;
  useSsl: boolean;
  baseUrl: string;
  activeProfileId: number;
  activeProfileName: string;
  activeDirectory: string;
  is4k: boolean;
  minimumAvailability: string;
  isDefault: boolean;
  externalUrl: string;
  syncEnabled: boolean;
  preventSearch: boolean;
}

/**
 * Quality profile configuration for media downloads
 */
export interface ServerProfile {
  name: string;
  id: number;
  upgradeAllowed: boolean;
  items: Array<{
    name?: string;
    quality?: {
      id: number;
      name: string;
    };
    allowed: boolean;
  }>;
}

/**
 * Root folder configuration for media storage
 */
export interface RootFolder {
  id: number;
  path: string;
}

/**
 * Server tag configuration
 */
export interface ServerTag {
  label: string;
  id: number;
}

/**
 * Server test response containing profiles, folders, and tags
 */
export interface ServerTestResponse {
  profiles: ServerProfile[];
  rootFolders: RootFolder[];
  tags?: ServerTag[]; // Add tags to the response type
}

/**
 * Information about a TV show season
 */
export interface TVShowSeason {
  id: number;
  airDate: string;
  episodeCount: number;
  name: string;
  overview: string;
  posterPath: string;
  seasonNumber: number;
}

/**
 * Basic TV show information including seasons
 */
export interface TVShowDetails {
  id: number;
  name: string;
  seasons: TVShowSeason[];
}

/**
 * Comprehensive TV show information including runtime and ratings
 */
export interface DetailedTVShowInfo {
  episodeRunTime: number[];
  numberOfEpisodes: number;
  numberOfSeasons: number;
  inProduction: boolean;
  status: string;
  contentRatings?: {
    results: Array<{
      iso_3166_1: string;
      rating: string;
    }>;
  };
  networks: Array<{
    id: number;
    name: string;
    logoPath: string;
  }>;
  lastEpisodeToAir?: {
    airDate: string;
    episodeNumber: number;
    seasonNumber: number;
    name: string;
  };
  nextEpisodeToAir?: {
    airDate: string;
    episodeNumber: number;
    seasonNumber: number;
    name: string;
  };
  seasons: Array<{
    id: number;
    name: string;
    episodeCount: number;
    seasonNumber: number;
    airDate?: string;
  }>;
  genres: Array<{
    id: number;
    name: string;
  }>;
}

/**
 * Detailed information about a person (actor, director, etc.)
 */
export interface PersonDetails {
  id: number;
  name: string;
  deathday?: string;
  knownForDepartment?: string;
  alsoKnownAs?: string[];
  gender?: string;
  biography?: string;
  popularity?: string;
  placeOfBirth?: string;
  profilePath?: string;
  adult?: boolean;
  imdbId?: string;
  homepage?: string;
  birthday?: string;
}

/**
 * Extended media information including 4K status and download progress
 */
export interface ExtendedMediaInfo extends MediaInfo {
  status4k?: number;
  downloadStatus?: Array<{
    title: string;
    status: string;
    size: number;
    sizeLeft: number;
    timeLeft: string;
    estimatedCompletionTime: string;
  }>;
}

/**
 * Search response containing paginated results
 */
export interface SearchResponse {
  page: number;
  totalPages: number;
  totalResults: number;
  results: MediaResult[];
}
