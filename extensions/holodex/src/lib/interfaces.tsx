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
  clips: Video[];
  mentions: Mention[];
}

export interface Mention {
  id: string;
  name: string;
  english_name: string | null;
  org: string;
  lang: string | null;
  type: ChannelType;
  photo: string;
}

export interface HClip {
  id: string;
  title: string;
  type: string;
  description: string;
  published_at: string;
  available_at: string;
  duration: number;
  status: string;
  lang: string;
  channel: HChannel;
  mentions?: Mention[];
}

export interface HArchive {
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
  channel: HChannel;
  topic_id?: string;
  live_tl_count?: { [lang: string]: number };
  clips?: HClip[];
}

export interface HLive {
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
  channel: HChannel;
  topic_id?: string;
  live_tl_count?: { [lang: string]: number };
}

export interface HChannel {
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
