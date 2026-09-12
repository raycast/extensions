export interface Mixtapes {
  metadata: MixtapesMetadata;
  results: MixtapesResult[];
  links: MixtapesLink[];
}

export interface MixtapesLink {
  rel: Rel;
  href: string;
  type: Type;
}

export enum Rel {
  Self = "self",
}

export enum Type {
  ApplicationVndMixtapeJSONCharsetUTF8 = "application/vnd.mixtape+json;charset=utf-8",
  ApplicationVndMixtapeListJSONCharsetUTF8 = "application/vnd.mixtape-list+json;charset=utf-8",
}

export interface MixtapesMetadata {
  subtitle: string;
  credits: string;
  mq_host: string;
  animation_large_portrait: string;
}

export interface MixtapesResult {
  mixtape_alias: string;
  title: string;
  subtitle: string;
  description: string;
  description_html: string;
  audio_stream_endpoint: string;
  credits: Credit[];
  media: Media;
  now_playing_topic: string;
  links: MixtapesLink[];
}

export interface Credit {
  name: string;
  path: string;
}

export interface Media {
  animation_large_landscape: string;
  animation_large_portrait: string;
  animation_thumb: string;
  icon_black: string;
  icon_white: string;
  picture_large: string;
  picture_medium: string;
  picture_medium_large: string;
  picture_small: string;
  picture_thumb: string;
}
