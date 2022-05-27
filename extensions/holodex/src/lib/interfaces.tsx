export interface Video {
  videoId: string;
  channelId: string;
  channelName: string;
  title: string;
  description: string;
  startAt: Date;
  avatarUrl: string;
  status: string;
  liveViewers: number;
  topic?: string;
  clips?: Video[];
}

export interface Clip {
  id: string;
  title: string;
  type: string;
  description: string;
  published_at: string;
  available_at: string;
  duration: number;
  status: string;
  lang: string;
  channel: Channel;
}

export interface Archive {
  id: string;
  title: string;
  type: LiveType;
  published_at: string;
  available_at: string;
  duration: number;
  status: Status;
  start_scheduled: string;
  start_actual?: string;
  live_viewers: number;
  description: string;
  channel: Channel;
  topic_id?: string;
  live_tl_count?: { [lang: string]: number };
  clips?: Clip[];
}

export interface Live {
  id: string;
  title: string;
  type: LiveType;
  published_at: string;
  available_at: string;
  duration: number;
  status: Status;
  start_scheduled: string;
  start_actual?: string;
  live_viewers: number;
  description: string;
  channel: Channel;
  topic_id?: string;
  live_tl_count?: { [lang: string]: number };
}

export interface Channel {
  id: string;
  name: string;
  org?: string;
  type: ChannelType;
  photo: string;
  english_name?: string;
}

export enum ChannelType {
  Vtuber = "vtuber",
}

export enum Status {
  Live = "live",
}

export enum LiveType {
  Stream = "stream",
}
