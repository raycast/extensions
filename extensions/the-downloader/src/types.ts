export type SourceType = "video" | "gallery" | "spotify" | "webpage";

export type Format = {
  format_id: string;
  vcodec: string;
  acodec: string;
  ext: string;
  video_ext: string;
  protocol: string;
  filesize?: number;
  filesize_approx?: number;
  resolution: string;
  tbr: number | null;
  /** Optional fields used for the Quality size estimates and the preview's format table. */
  height?: number | null;
  width?: number | null;
  fps?: number | null;
  audio_ext?: string | null;
};

export type Video = {
  title: string;
  duration: number;
  /** Absent when the extractor never set it; some extractors emit an explicit `null`. */
  live_status?: string | null;
  formats: Format[];
  /** Optional fields the download view and the preview show when the extractor provides them. */
  uploader?: string | null;
  channel?: string | null;
  thumbnail?: string | null;
  extractor_key?: string | null;
  description?: string | null;
  view_count?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  /** `YYYYMMDD`. */
  upload_date?: string | null;
  webpage_url?: string | null;
  channel_follower_count?: number | null;
};
