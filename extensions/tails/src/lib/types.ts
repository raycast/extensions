export interface Author {
  name: string | null;
  username: string | null;
  pictureUrl: string | null;
}

export interface MusicInfo {
  title: string;
  artist: string;
  album: string | null;
  coverUrl: string | null;
  songLinkUrl: string | null;
}

export interface VideoVariant {
  method: "direct";
  quality: string;
  label: string | null;
  container: string;
  width: number | null;
  height: number | null;
  fps: number | null;
  bitrate: number | null;
  size: number | null;
  cost: number;
  restricted?: boolean;
}

export interface AudioVariant {
  method: "direct";
  quality: string;
  label: string | null;
  container: string;
  bitrate: number | null;
  size: number | null;
  cost: number;
}

export interface VideoItem {
  type: "video";
  stableMediaId: string;
  thumbnailUrl: string | null;
  duration: number | null;
  sourceDuration: number | null;
  hasAudio: boolean;
  musicInfo: MusicInfo | null;
  storyboard: {
    pages: string[];
    cols: number;
    rows: number;
    thumbWidth: number;
    thumbHeight: number;
    interval: number;
    totalFrames: number;
  } | null;
  variants: VideoVariant[];
}

export interface AudioItem {
  type: "audio";
  stableMediaId: string;
  duration: number | null;
  sourceDuration: number | null;
  coverUrl: string | null;
  musicInfo: MusicInfo | null;
  musicInfoEmbedded?: boolean;
  variants: AudioVariant[];
}

export interface ImageItem {
  type: "image";
  stableMediaId: string;
  displayUrl: string;
  container: string;
  width: number | null;
  height: number | null;
  size: number | null;
}

export type MediaItem = VideoItem | AudioItem | ImageItem;

export interface MetadataResponse {
  stableId: string;
  title: string | null;
  description: string | null;
  postId: string;
  platform: string;
  postedAt: string | null;
  originUrl: string;
  author: Author | null;
  thumbnailUrl: string | null;
  media: MediaItem[];
  embed: unknown;
  extensions: Record<string, unknown> | null;
}

export interface StreamFile {
  url: string;
  fileName: string;
}

export interface StreamVariant {
  method: "direct";
  quality: string;
  cost: number;
  streams: StreamFile[];
  hints?: { seekable?: boolean };
}

export interface MediaStreams {
  stableMediaId: string;
  type: "video" | "audio" | "image";
  variants: StreamVariant[];
  offset?: number;
}

export interface StreamsResponse {
  medias: MediaStreams[];
}

export interface UsageInfo {
  used: number;
  quota: number;
  resetsAt: string;
}

export type ServiceStatus = "operational" | "degraded" | "down" | "unknown";

export interface DayBucket {
  date: string;
  totalChecks: number;
  passedChecks: number;
  status: ServiceStatus;
}

export interface ServiceStatusResponse {
  service: string;
  label: string;
  status: ServiceStatus;
  uptime30d: number | null;
  latestCheck: {
    passed: boolean;
    latencyMs: number | null;
    checkedAt: string;
  } | null;
  history: DayBucket[];
}

export interface StatusResponse {
  services: ServiceStatusResponse[];
  checkedAt: string;
}

export interface ServiceListItem {
  id: string;
  name: string;
  capabilities: ("save" | "edit")[];
  proxied: boolean;
}
