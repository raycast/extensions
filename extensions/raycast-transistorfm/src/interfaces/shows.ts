export const enum ShowType {
  Episodic = "Episodic",
  Serial = "Serial",
}

interface IShowRelationships {
  show: IShowEpisodes;
}

interface IShowEpisodes {
  data: IEpisodeData;
}

interface IEpisodeData {
  id: string;
  type: string;
}

interface IShowAttributes {
  author: string;
  category: string;
  copyright: string;
  created_at: string;
  description: string;
  explicit: boolean;
  image_url: string | null;
  keywords: string;
  language: Intl.ListFormat;
  multiple_seasons: boolean;
  owner_email: string;
  playlist_limit: number;
  private: boolean;
  secondary_category: string;
  show_type: ShowType;
  slug: string;
  time_zone: Date;
  title: string;
  updated_at: string;
  website: string;
  feed_url: string;
  apple_podcasts: string | null;
  google_podcasts: string | null;
  amazon_music: string | null;
  deezer: string | null;
  spotify: string | null;
  podcast_addict: string | null;
  player_FM: string | null;
  anghami: string | null;
  castbox: string | null;
  castro: string | null;
  goodpods: string | null;
  iHeartRadio: string | null;
  overcast: string | null;
  pandora: string | null;
  pocket_casts: string | null;
  radioPublic: string | null;
  soundcloud: string | null;
  tuneIn: string | null;
  fountain: string | null;
  jiosaavn: string | null;
  gaana: string | null;
  email_notifications: boolean;
}

export interface IShowData {
  id: string;
  type: string;
  attributes: IShowAttributes;
  relationships: IShowRelationships;
}

interface IShows {
  data: IShowData[];
}

export default IShows;
