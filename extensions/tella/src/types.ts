// Core Types

export interface Video {
  id: string;
  name: string;
  description: string;
  views: number;
  aspectRatio: string;
  createdAt: string;
  updatedAt: string;
  durationSeconds?: number;
  chapters?: Chapter[];
  transcript?: Transcript;
  thumbnails?: Thumbnails;
  exports?: VideoExport[];
  settings?: VideoSettings;
  links: {
    viewPage: string;
    embedPage: string;
  };
  playlistIds?: string[];
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  timestampSeconds: number;
}

export interface Transcript {
  status: "ready" | "processing" | "failed";
  language: string;
  text: string;
  sentences: TranscriptSentence[];
}

export interface TranscriptSentence {
  text: string;
  startSeconds: number;
  endSeconds: number;
}

export interface Thumbnails {
  xl?: ThumbnailSet;
  large?: ThumbnailSet;
  medium?: ThumbnailSet;
  small?: ThumbnailSet;
}

export interface ThumbnailSet {
  jpg: string;
  webp: string;
  gif: string;
  mp4: string;
}

export interface VideoExport {
  exportId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  downloadUrl?: string;
  updatedAt: string;
}

export interface VideoSettings {
  defaultPlaybackRate: number;
  captionsDefaultEnabled: boolean;
  transcriptsEnabled: boolean;
  publishDateEnabled: boolean;
  viewCountEnabled: boolean;
  commentsEnabled: boolean;
  commentEmailsEnabled: boolean;
  downloadsEnabled: boolean;
  rawDownloadsEnabled: boolean;
  linkScope: "public" | "private" | "password" | "embedonly";
  searchEngineIndexingEnabled: boolean;
  allowedEmbedDomains: string[];
  customThumbnailURL?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  videos: number;
  linkScope: "public" | "private" | "password" | "embedonly";
  searchEngineIndexingEnabled: boolean;
  visibility: "org" | "personal";
  createdAt: string;
  updatedAt: string;
  links: {
    viewPage: string;
  };
}

export interface Pagination {
  nextCursor?: string;
  hasMore: boolean;
}

// API Request Types

export interface ListVideosParams {
  cursor?: string;
  limit?: number; // 1-100, default: 20
  playlistId?: string;
}

export interface UpdateVideoRequest {
  name?: string; // 1-255 chars
  description?: string; // max 5000 chars
  defaultPlaybackRate?: number; // 0.5-2.0
  captionsDefaultEnabled?: boolean;
  transcriptsEnabled?: boolean;
  publishDateEnabled?: boolean;
  viewCountEnabled?: boolean;
  commentsEnabled?: boolean;
  commentEmailsEnabled?: boolean;
  downloadsEnabled?: boolean;
  rawDownloadsEnabled?: boolean;
  linkScope?: "public" | "private" | "password" | "embedonly";
  password?: string; // 1-255 chars, required if linkScope is "password"
  searchEngineIndexingEnabled?: boolean;
  allowedEmbedDomains?: string[];
  customThumbnailURL?: string;
}

export interface StartExportRequest {
  granularity: "story" | "scenes" | "raw";
  resolution?: "1080p" | "4k"; // default: "1080p"
  fps?: "30" | "60"; // default: "30"
  subtitles?: boolean;
  speed?: "1" | "2" | "0.5" | "0.75" | "1.25" | "1.5" | "1.75"; // default: "1"
}

export interface DuplicateVideoRequest {
  name?: string; // 1-255 chars, defaults to original name + " (Copy)"
}

export interface ListPlaylistsParams {
  visibility?: "org" | "personal"; // default: "personal"
  cursor?: string;
  limit?: number; // 1-100, default: 20
}

export interface CreatePlaylistRequest {
  name: string; // 1-255 chars, required
  description?: string; // max 5000 chars
  emoji?: string; // max 10 chars
  linkScope?: "public" | "private" | "password" | "embedonly"; // default: "public"
  password?: string; // 1-255 chars, required if linkScope is "password"
  searchEngineIndexingEnabled?: boolean; // default: false
  visibility?: "org" | "personal"; // default: "personal"
}

export interface UpdatePlaylistRequest {
  name?: string; // 1-255 chars
  description?: string; // max 5000 chars
  // Note: emoji cannot be updated after creation, only set via POST /playlists
  linkScope?: "public" | "private" | "password" | "embedonly";
  password?: string; // 1-255 chars, required if linkScope is "password"
  searchEngineIndexingEnabled?: boolean;
}

export interface AddVideoToPlaylistRequest {
  videoId: string; // required
}

// API Response Types

export interface ListVideosResponse {
  videos: Video[];
  pagination: Pagination;
}

export interface GetVideoResponse {
  video: Video;
}

export interface DeleteVideoResponse {
  status: "ok";
}

export interface StartExportResponse {
  export: VideoExport;
}

export interface ListPlaylistsResponse {
  playlists: Playlist[];
  pagination: Pagination;
}

export interface GetPlaylistResponse {
  playlist: Playlist;
}

export interface CreatePlaylistResponse {
  playlist: Playlist;
}

export interface DeletePlaylistResponse {
  status: "ok";
}

export interface AddVideoToPlaylistResponse {
  status: "ok";
}

export interface RemoveVideoFromPlaylistResponse {
  status: "ok";
}

// Utility Types

export type LinkScope = "public" | "private" | "password" | "embedonly";
export type Visibility = "org" | "personal";
export type ExportGranularity = "story" | "scenes" | "raw";
export type ExportResolution = "1080p" | "4k";
export type ExportFPS = "30" | "60";
export type ExportSpeed = "1" | "2" | "0.5" | "0.75" | "1.25" | "1.5" | "1.75";
export type TranscriptStatus = "ready" | "processing" | "failed";
export type ExportStatus = "pending" | "processing" | "completed" | "failed";
export type WebhookEventType =
  | "video.created"
  | "export.ready"
  | "transcript.ready"
  | "playlist.created"
  | "playlist.video_added";
