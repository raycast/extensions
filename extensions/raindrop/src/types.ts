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

type CollectionParent = {
  $id: number;
};

export type Collection = {
  _id: number;
  title: string;
  parent: CollectionParent;
  children?: Collection[];
};

export type Group = {
  title: string;
  hidden: boolean;
  sort: number;
  collections: number[];
};
export interface Preferences {
  token: string;
  useLastCollection?: boolean;
}

export interface CollectionsResponse {
  result: boolean;
  items: Collection[];
}

export interface BookmarksResponse {
  items: Bookmark[];
}

export type UserData = {
  // files: unknown;
  // avatar: string;
  // pro: boolean;
  _id: number;
  // registered: string;
  // config: unknown;
  // email: string;
  // fullName: string;
  // lastAction: string;
  groups: Group[];
  // lastUpdate: string;
  // lastVisit: string;
  // apple: unknown;
  name: string;
  // dropbox: unknown;
  password: boolean;
};

export interface UserResponse {
  result: boolean;
  user: UserData;
}

export interface CollectionItem {
  value?: number;
  label: string;
}

export type BookmarksParams = {
  collection: string;
  search?: string;
};
