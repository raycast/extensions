export interface Show {
  description: string;
  description_html: string;
  embeds: ShowEmbeds;
  external_links: string[];
  frequency: string;
  genres: any[];
  intensity: null;
  links: ShowLink[];
  location_long: string;
  location_short: string;
  media: ShowMedia;
  moods: Mood[];
  name: string;
  show_alias: string;
  status: Status;
  timeslot: string;
  type: RelEnum;
  updated: Date;
}

export interface ShowEmbeds {
  episodes: Episodes;
}

export interface Episodes {
  links: ShowLink[];
  metadata: ShowMetadata;
  results: ShowResult[];
}

export interface ShowLink {
  href: string;
  rel: RelEnum;
  type: PurpleType;
}

export enum RelEnum {
  Episodes = "episodes",
  Self = "self",
  Show = "show",
  Tracklist = "tracklist",
}

export enum PurpleType {
  ApplicationVndEpisodeJSONCharsetUTF8 = "application/vnd.episode+json;charset=utf-8",
  ApplicationVndEpisodeListJSONCharsetUTF8 = "application/vnd.episode-list+json;charset=utf-8",
  ApplicationVndShowJSONCharsetUTF8 = "application/vnd.show+json;charset=utf-8",
  ApplicationVndTrackListJSONCharsetUTF8 = "application/vnd.track-list+json;charset=utf-8",
}

export interface ShowMetadata {
  resultset: ShowResultset;
}

export interface ShowResultset {
  count: number;
  limit: number;
  offset: number;
}

export interface ShowResult {
  audio_sources: ShowAudioSource[];
  broadcast: Date;
  description: string;
  description_html: string;
  embeds: any;
  episode_alias: string;
  external_links: string[];
  genres: Mood[];
  intensity: null;
  links: ShowLink[];
  location_long: string;
  location_short: string;
  media: ShowMedia;
  mixcloud: string;
  moods: Mood[];
  name: string;
  show_alias: string;
  status: Status;
  updated: Date;
}

export interface ShowAudioSource {
  source: ShowSource;
  url: string;
}

export enum ShowSource {
  Soundcloud = "soundcloud",
}

export interface Mood {
  id: string;
  value: string;
}

export interface ShowMedia {
  background_large: string;
  background_medium: string;
  background_medium_large: string;
  background_small: string;
  background_thumb: string;
  picture_large: string;
  picture_medium: string;
  picture_medium_large: string;
  picture_small: string;
  picture_thumb: string;
}

export enum Status {
  Published = "published",
}
