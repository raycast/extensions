import { useForm } from "@raycast/utils";

export type DownloadOptions = {
  url: string;
  format: string;
  copyToClipboard: boolean;
  clip?: string;
};

export type ItemProps = ReturnType<typeof useForm<DownloadOptions>>["itemProps"];

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

export enum Category {
  Video = "Video",
  AudioOnly = "Audio Only",
}
