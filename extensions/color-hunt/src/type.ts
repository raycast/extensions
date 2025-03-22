export interface Tags {
  colors: string[];
  collections: string[];
}

export interface Single {
  date: string;
  likes: string;
  tags: string;
}

export interface Feed {
  code: string;
  likes: string;
  date: string;
}

export interface IndexData {
  data: Feed;
  svg: string;
  liked: boolean;
}

export interface StorageData {
  code: string;
  svg: string;
}
