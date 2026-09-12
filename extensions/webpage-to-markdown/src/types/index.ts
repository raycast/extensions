export interface Metadata {
  title?: string;
  wordCount?: number;
  readingTime?: string;
}

export interface ArticleLinks {
  [key: string]: string;
}

export interface JinaResponse {
  code: number;
  status: number;
  data: {
    title: string;
    description: string;
    url: string;
    content: string;
    links?: {
      [key: string]: string;
    };
    usage: {
      tokens: number;
    };
  };
}

export interface Preferences {
  includeMetadata: boolean;
  prependFrontMatter: boolean;
  includeLinksSummary: boolean;
  jinaApiKey?: string;
}
export interface Arguments {
  url: string;
}
