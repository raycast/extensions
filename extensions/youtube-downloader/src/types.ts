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
  live_status: string;
  formats: Format[];
};
