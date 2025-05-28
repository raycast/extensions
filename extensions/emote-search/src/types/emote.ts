export type EmoteSource = "bttv" | "ffz" | "7tv";

export interface Emote {
  id: string;
  url: string;
  name: string;
  source?: EmoteSource;
}

export interface BTTVEmote {
  id: string;
  code: string;
  emote?: {
    id: string;
    code: string;
  };
}

export interface SevenTVEmote {
  id: string;
  name: string;
  host?: {
    url: string;
  };
  animated: boolean;
}

export interface SevenTVResponse {
  data?: {
    emotes?: {
      items: SevenTVEmote[];
    };
  };
}

export interface FFZEmote {
  id: number;
  name: string;
  height: number;
  width: number;
  public: boolean;
  hidden: boolean;
  modifier: boolean;
  modifier_flags: number;
  owner?: {
    _id: number;
    name: string;
    display_name: string;
  };
  artist?: {
    name: string;
    display_name: string;
  };
  urls: Record<string, string>;
  status: number;
  usage_count: number;
  created_at: string;
  last_updated: string;
}

export interface FFZSet {
  id: number;
  _type: number;
  title: string;
  emoticons: FFZEmote[];
}

export interface FFZGlobalResponse {
  default_sets: number[];
  sets: Record<string, FFZSet>;
  users: Record<string, string[]>;
}

export interface FFZSearchResponse {
  _pages: number;
  _total: number;
  emoticons: FFZEmote[];
}
