type Highlight = {
  text: string;
  note: string;
};

export type Bookmark = {
  _id: number;
  collection: unknown; // object
  cover: string;
  created: string;
  domain: string;
  excerpt: string;
  lastUpdate: string;
  link: string;
  media: object[];
  tags: string[];
  title: string;
  type: string; // enum
  user: unknown; // object

  broken: boolean;
  cache: unknown; // object
  file: unknown; // object
  important: boolean;
  html: string;
  note: string;
  highlights: Highlight[];
};

export interface Preferences {
  token: string;
}
