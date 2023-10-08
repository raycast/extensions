export interface Episode {
  audio_sources: EpisodeAudioSource[];
  broadcast: Date;
  description: string;
  description_html: string;
  embeds: Embeds;
  episode_alias: string;
  external_links: string[];
  genres: EpisodeGenre[];
  intensity: null;
  links: EpisodeLink[];
  location_long: string;
  location_short: string;
  media: EpisodeMedia;
  mixcloud: string;
  moods: EpisodeGenre[];
  name: string;
  show_alias: string;
  status: string;
  updated: Date;
}

export interface EpisodeAudioSource {
  source: string;
  url: string;
}

export interface Embeds {
  tracklist: Tracklist;
}

export interface Tracklist {
  links: EpisodeLink[];
  metadata: EpisodeMetadata;
  results: EpisodeTracklistResult[];
}

export interface EpisodeLink {
  href: string;
  rel: string;
  type: string;
}

export interface EpisodeMetadata {
  resultset: EpisodeResultset;
}

export interface EpisodeResultset {
  count: number;
  limit: number;
  offset: number;
}

export interface EpisodeTracklistResult {
  artist: string;
  title: string;
}

export interface EpisodeGenre {
  id: string;
  value: string;
}

export interface EpisodeMedia {
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
