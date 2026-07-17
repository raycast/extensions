export const enum EpisodeType {
  Full = "Full",
  Trailer = "Serial",
  Bonus = "Bonus",
}

export const enum PublishStatus {
  Published = "published",
  Scheduled = "scheduled",
  Draft = "draft",
}

interface IShowRelationships {
  show: IEpisodeShow;
}

interface IEpisodeShow {
  data: IShowData;
}

interface IShowData {
  id: string;
  type: string;
}

interface IEpisodeAttributes {
  author: string;
  created_at: Date;
  description: string;
  duration: number;
  explicit: boolean;
  keywords: string;
  published_at: Date;
  number: number;
  season: number;
  share_url: string;
  slug: string;
  status: PublishStatus;
  title: string;
  transcript_url: string;
  type: EpisodeType;
}

export interface IEpisodeData {
  id: string;
  type: string;
  attributes: IEpisodeAttributes;
  relationships: IShowRelationships;
}

interface IShows {
  data: IEpisodeData[];
}

export default IShows;
