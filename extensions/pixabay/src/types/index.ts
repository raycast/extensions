export interface Hit {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  collections: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

export interface ImageSearchResult {
  total: number;
  totalHits: number;
  hits?: Hit[];
}

export interface Video {
  url: string;
  width: number;
  height: number;
  size: number;
  thumbnail: string;
}

export interface Videos {
  large: Video;
  medium: Video;
  small: Video;
  tiny: Video;
}

export interface VideoHit {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  videos: Videos;
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

export interface VideoSearchResult {
  total: number;
  totalHits: number;
  hits: VideoHit[];
}

export type SearchImageType = "all" | "photo" | "illustration" | "vector";
export type SearchVideoType = "all" | "film" | "animation";
