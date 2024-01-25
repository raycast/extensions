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
  tags: string[];
  favicon?: string;
}

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

export interface Preferences {
  provider?: "openai" | "raycast";
  apiKey?: string;
  apiModel?: string;
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
  writeFreelyEndpoint?: string;
  writeFreelyAccount?: string;
  writeFreelyPassword?: string;
}

export interface ProviderOptions {
  apiKey?: string;
  apiHost?: string;
  apiModel?: string;
  httpProxy?: string;
  summarizePrompt?: string;
  translatePrompt?: string | ((lang: string) => string);
}

export interface RecommendedSourcesFromInterest {
  title: string;
  sources: Source[];
}

export type RecommendedData = RecommendedSourcesFromInterest[];

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
