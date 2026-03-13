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
  custom_id?: string;
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
      type: "header";
      data: HeaderData;
    }
  | {
      type: "delimiter";
      data: Record<string, never>;
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

export type HeaderData = {
  text: string;
  level: number;
};

export interface UserData {
  id: string;
  googleId: string;
  twitterId: string;
  customId: string;
  name: string;
  avatar: string;
  cover: string;
  headline: string;
  location: string;
  about: string;
  keywords: any[];
  availabilities: any[];
  urls: UrlsItem[];
  settings: UserSettings;
  sections: SectionsItem[];
  status: Status;
}
interface UrlsItem {
  type: string;
  url: string;
}
interface UserSettings {
  analytics: Analytics;
  notification: Notification;
}
interface Analytics {
  ga: string;
}
interface Notification {
  weeklyReport: boolean;
}
interface SectionsItem {
  layout: Layout;
  source: Source;
  title: string;
  description: string;
  id: string;
}
interface Layout {
  type: string;
}
interface Source {
  type: string;
  value: string[];
}
interface Status {
  onboard: string;
}

export type APIData<T> = {
  status: number;
  data: T;
};

export interface CollectionData {
  id: string;
  nestedColls: NestedCollsItem[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}
interface NestedCollsItem {
  id: string;
  name: string;
  icon: string;
  customId: string;
  items: string[];
  childs: any[];
}

export type LoginResponse =
  | {
      status: 200;
      data: UserData;
    }
  | {
      status: 201;
      data: {
        verificationId: string;
        verificationEmail: string;
      };
    };
