import { Color, Icon } from "@raycast/api";
import { Ownership, SourceStatus, SourceType } from "./response";

export type Notebook = {
  title: string;
  sources: Source[];
  id: string;
  icon: string;
  owned: Ownership;
  shared: boolean;
  created_at: string;
};

export type Source = {
  id: string;
  title: string;
  metadata: Metadata;
  status: SourceStatus;
};

export type Metadata = {
  gdoc_id: string[] | null;
  word_count: number | null;
  create_time: string;
  complete_info: {
    id: string;
    complete_time: string;
  } | null;
  source_type: SourceType;
  youtube_info?: YoutubeInfo | null;
  site_url?: string[] | null;
  icon?: {
    source: string | Icon;
    tintColor?: Color;
  };
};

export type YoutubeInfo = {
  url?: string;
  videoId?: string;
  channelName?: string;
};

export type TimestampTuple = [timestamp: number, nanoseconds: number];
