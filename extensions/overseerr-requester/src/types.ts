export interface MovieResult {
  id: number;
  mediaType: string;
  popularity: number;
  posterPath: string;
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

export interface MediaInfo {
  id: number;
  tmdbId: number;
  tvdbId: number;
  status: number;
  requests: Request[];
  createdAt: string;
  updatedAt: string;
}

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

export interface RadarrSettings {
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

export interface RootFolder {
  id: number;
  path: string;
}

export interface ServerTestResponse {
  profiles: ServerProfile[];
  rootFolders: RootFolder[];
}
