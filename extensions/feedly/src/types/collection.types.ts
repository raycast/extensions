export interface Collection {
  customizable: boolean;
  id: string;
  feeds: Feed[];
  label: string;
  enterprise: boolean;
  created: number;
  numFeeds: number;
}

export interface Feed {
  description: string;
  contentType?: ContentType;
  language: Language;
  id: string;
  title: string;
  feedId: string;
  website: string;
  topics?: string[];
  subscribers: number;
  velocity: number;
  updated: number;
  iconUrl?: string;
  visualUrl?: string;
  partial?: boolean;
  estimatedEngagement?: number;
  coverUrl?: string;
  coverColor?: string;
  state?: string;
  logo?: string;
  wordmark?: string;
  relatedLayout?: string;
  relatedTarget?: string;
  accentColor?: string;
}

export enum ContentType {
  Article = "article",
  Longform = "longform",
}

export enum Language {
  En = "en",
}
