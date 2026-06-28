export interface Feed {
  id: string;
  feedId: string;
  title: string;
  direction: string;
  updated: number;
  alternate: Alternate[];
  items: Item[];
}

export interface Alternate {
  type: Type;
  href: string;
}

export enum Type {
  TextHTML = "text/html",
}

export interface Item {
  fingerprint: string;
  id: string;
  originId: string;
  origin: Origin;
  title: string;
  author: string;
  crawled: number;
  published: number;
  alternate: Alternate[];
  visual?: Visual;
  canonicalUrl: string;
  unread: boolean;
  categories: Category[];
  summary?: Summary;
  content?: Summary;
}

export interface Category {
  id: string;
  label: Label;
}

export enum Label {
  Dev = "Dev",
}

export interface Origin {
  title: string;
  streamId: string;
  htmlUrl: string;
}

export interface Summary {
  content: string;
  direction: string;
}

export interface Visual {
  contentType: ContentType;
  processor: string;
  url: string;
  expirationDate: number;
  edgeCacheUrl: string;
  width: number;
  height: number;
}

export enum ContentType {
  ImageJPEG = "image/jpeg",
  ImagePNG = "image/png",
}
