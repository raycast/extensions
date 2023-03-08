export interface Preferences {
  matterToken: string;
}

export interface Items {
  id: string;
  feed: Item;
  next: any;
  previous: any;
  current_profile: any;
  code: string;
}

export interface Item {
  id: string;
  content: Content;
}

export interface Content {
  id: number;
  url: string;
  title: string;
  authior: any;
  publisher: any;
  publication_date: string;
  feed_date: string;
  sub_title: string;
  excerpt: string;
  photo_thumbnail_url: string;
  source_type: string;
  history: any;
}
