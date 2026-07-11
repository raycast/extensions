export interface Source {
  id: string;
  url: string;
  title: string;
  schedule: "everyday" | "custom";
  // Mondy, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
  customDays?: string[];
  rssLink?: string;
  // Time span of the content pulled by rss, default is 1 day
  timeSpan?: string;
  tags?: string[];
  favicon?: string;
  description?: string;
}

export type ExternalSource = Pick<Source, "url" | "title" | "description" | "favicon" | "rssLink" | "tags"> & {
  available?: boolean;
  // 权重
  weight?: number;
  // 活跃度分数 0 - 100
  activeScore?: number;
  // 活跃状态
  activeStatus?: "active" | "lowActive" | "inactive";
};

export type SummarizeStatus = "summraized" | "failedToSummarize" | "raw";

export interface DigestItem {
  status: SummarizeStatus;
}

export interface Digest {
  id: string;
  title: string;
  content: string;
  createAt: number;
  items: DigestItem[];
  type: "manual" | "auto";
}

export interface RSSFeed {
  title: string;
  url: string;
  filter?: (item: RSSItem) => boolean;
  maxItems?: number;
  tags?: string[];
}

export interface RSSItem {
  link?: string;
  title?: string;
  pubDate?: string | number;
  creator?: string;
  summary?: string;
  content?: string;
  coverImage?: string;
  feed?: RSSFeed;
  [k: string]: any;
}

export interface RawFeed {
  title: string;
  link: string;
  feedUrl: string;
  items: RSSItem[];
  description?: string;
}

export interface Preferences {
  provider?: "openai" | "raycast" | "moonshot";
  apiKey?: string;
  apiModel?: string;
  maxTokens?: number;
  apiHost?: string;
  preferredLanguage?: string;
  httpProxy?: string;
  summarizePrompt?: string;
  maxItemsPerFeed?: number;
  maxApiConcurrency?: number;
  retryCount?: number;
  retryDelay?: number;
  notificationTime?: string;
  autoGenDigest?: boolean;
  requestTimeout?: number;
  enableItemLinkProxy?: boolean;
  splitByTags?: boolean;
  writeFreelyEndpoint?: string;
  writeFreelyAccount?: string;
  writeFreelyPassword?: string;
}

export interface ProviderOptions {
  apiKey?: string;
  apiHost?: string;
  apiModel?: string;
  maxTokens?: number;
  httpProxy?: string;
  summarizePrompt?: string;
  translatePrompt?: string | ((lang: string) => string);
}

export interface RecommendedSourcesFromInterest {
  title: string;
  sources: Source[];
}

export type RecommendedData = RecommendedSourcesFromInterest[];

export type DigestStageStatus = "start" | "success" | "failed" | "processing";
export type PullItemsStage =
  | {
      stageName: "pull_items";
      status: "start";
      data: null;
    }
  | {
      stageName: "pull_items";
      status: "success";
      // 代表拉取到的items数量
      data: number;
    }
  | {
      stageName: "pull_items";
      status: "failed";
      data: null;
    };

export type TranslateTitlesStage =
  | {
      stageName: "translate_titles";
      status: "start";
      data: null;
    }
  | {
      stageName: "translate_titles";
      status: "success";
      // 代表拉取到的items数量
      data: null;
    }
  | {
      stageName: "translate_titles";
      status: "failed";
      data: null;
    };

export type SummarizeItemStage =
  | {
      stageName: "summarize_item";
      status: "start";
      data: RSSItem;
      type: "raw" | "ai";
    }
  | {
      stageName: "summarize_item";
      status: "success";
      data: RSSItem;
      type: "raw" | "ai";
    }
  | {
      stageName: "summarize_item";
      status: "failed";
      data: RSSItem;
      type: "raw" | "ai";
    };

export type DigestStage = PullItemsStage | TranslateTitlesStage | SummarizeItemStage;

export abstract class Provider {
  available: boolean = true;

  // 定义构造函数和它的参数
  constructor(protected options: ProviderOptions) {
    // 初始化操作
  }

  // 定义一个抽象方法
  abstract summarize(content: string): Promise<string>;
  abstract translate(content: string, targetLang: string): Promise<string>;
}
