export interface Channel {
  name: string;
  group: string;
  url: string;
}

export interface RankedChannel {
  channel: Channel;
  score: number;
}

export interface Preferences {
  playlistUrl: string;
  autoPip: boolean;
  pipDelay: string;
}
