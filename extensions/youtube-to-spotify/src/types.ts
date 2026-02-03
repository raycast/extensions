export type Video = {
  title: string;
  duration: number;
  live_status: string;
};

export type DownloadOptions = {
  url: string;
  artistName?: string;
  songTitle?: string;
};
