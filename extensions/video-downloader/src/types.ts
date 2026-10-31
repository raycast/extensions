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
  fps?: number | null;
  dynamic_range?: string | null;
  language?: string | null;
  format_note?: string;
};

export type Video = {
  title: string;
  duration: number;
  live_status: string | null;
  formats: Format[];
};
