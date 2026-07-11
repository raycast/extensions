// ─── Jellyfin API Types ───────────────────────────────────────────────────────

/** The type of a Jellyfin media item we care about. */
export type JellyfinItemType = "Audio" | "MusicAlbum" | "MusicArtist";

/** A Jellyfin media item (track, album, or artist). */
export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: JellyfinItemType | string;
  /** For Audio: The parent album name */
  Album?: string;
  /** For Audio: The album's Jellyfin item ID */
  AlbumId?: string;
  /** For Audio: The album artist */
  AlbumArtist?: string;
  /** For Audio: Array of artist names */
  Artists?: string[];
  /** For Audio: Array of artist IDs */
  ArtistItems?: Array<{ Id: string; Name: string }>;
  /** ISO 8601 duration string, e.g. "00:03:45.0000000" — use RunTimeTicks instead for math */
  RunTimeTicks?: number; // 10,000 ticks = 1 ms; 10,000,000 ticks = 1 s
  ProductionYear?: number;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  /** Genre tags */
  Genres?: string[];
  GenreItems?: Array<{ Id: string; Name: string }>;
  /** Display tags */
  Tags?: string[];
  /** Bitrate in bits/s */
  Bitrate?: number;
  /** Container format, e.g. "flac", "mp3", "opus" */
  Container?: string;
  /** Official rating, e.g. "NR" */
  OfficialRating?: string;
  /** Whether the item is a favourite */
  UserData?: {
    IsFavorite: boolean;
    PlayCount: number;
    Played: boolean;
    PlaybackPositionTicks: number;
    UnplayedItemCount?: number;
  };
  /** Primary image tag used to build image URLs */
  ImageTags?: {
    Primary?: string;
    Art?: string;
    Logo?: string;
    Thumb?: string;
  };
  BackdropImageTags?: string[];
  AlbumPrimaryImageTag?: string;
  /** The Jellyfin server ID */
  ServerId?: string;
  ChildCount?: number;
}

/** Response shape from /Users/{userId}/Items */
export interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
  StartIndex: number;
}

/** Response from the /Users/AuthenticateByName endpoint */
export interface JellyfinAuthResponse {
  User: {
    Id: string;
    Name: string;
  };
  AccessToken: string;
  ServerId: string;
}

/** Resolved credentials — after auth is determined. */
export interface ResolvedCredentials {
  serverUrl: string;
  /** Active token to use as api_key query param or Authorization header */
  token: string;
  /** Resolved user ID (from prefs or auth response) */
  userId: string;
}
