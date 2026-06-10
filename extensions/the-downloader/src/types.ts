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
};

export type Video = {
  title: string;
  duration: number;
  /** Absent when the extractor never set it; some extractors emit an explicit `null`. */
  live_status?: string | null;
  formats: Format[];
};
