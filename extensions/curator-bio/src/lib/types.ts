export type Preference = {
  email: string;
  password: string;
};

export interface Item {
  id: string;
  customId: string;
  type: "image" | "url";
  url: string;
  cover: string;
  coverFitSize: boolean;
  title: string;
  subtitle: string;
  tags: string[];
  collections: CollectionsItem[];
  userId: string;
  user: User;
  meta: any[];
  content: Content;
  createdAt: string;
  updatedAt: string;
  status: string;
  settings: Settings;
  views?: number;
}
export interface CollectionsItem {
  name: string;
  icon: string;
  items: string[];
  childs: any[];
  views: number;
  subs: number;
  customId: string;
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface User {
  id: string;
  customId: string;
  name: string;
  avatar: string;
  about: string;
}
export interface Content {
  time: number;
  blocks: BlocksItem[];
  version: string;
  html: string;
}
export type BlocksItem = {
  id: string;
} & FileType;

type FileType =
  | {
      type: "linkTool";
      data: LinkData;
    }
  | {
      type: "image";
      data: ImageData;
    }
  | {
      type: "embed";
      data: EmbedData;
    }
  | {
      type: "paragraph";
      data: ParagraphData;
    }
  | {
      type: "string";
      data: unknown;
    };

export interface LinkData {
  link: string;
  meta: LinkMeta;
}
export interface LinkMeta {
  title: string;
  description: string;
  image: Image;
}
export interface Image {
  url: string;
}

export type ParagraphData = {
  text: string;
};

export interface ImageData {
  file: File;
  caption: string;
  stretched: boolean;
  withBorder: boolean;
  withBackground: boolean;
}
export interface File {
  url: string;
}
export interface Settings {
  link: Link;
}
export interface Link {
  enabled: boolean;
  value: string;
}

export interface EmbedData {
  service: string;
  source?: string;
  embed: string;
  width: number;
  height: number;
  caption: string;
}
