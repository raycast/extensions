export type FetcherArgs = {
  query: string;
  offset?: number;
};

export type DocsResponse = {
  __type: string;
  instrumentation: {
    __type: string;
    pingUrlBase: string;
    pageLoadPingUrl: string;
  };
  queryContext: {
    originalQuery: string;
  };
  webPages: {
    value: DocsItem[];
  };
  rankingResponse: {
    mainline?: {
      items: {
        answerType: string;
        resultIndex: number;
        value: {
          id: string;
        };
      };
    };
  };
};

export type DocsItem = {
  id: string;
  name: string;
  url: string;
  urlPingSuffix: string;
  datePublished: string;
  datePublishedDisplayText: string;
  isFamilyFriendly: boolean;
  displayUrl: string;
  snippet: string;
  dateLastCrawled: string;
  openGraphImage: {
    contentUrl: string;
    width: number;
    height: number;
  };
  fixedPosition: boolean;
  language: string;
  isNavigational: boolean;
};

export enum Language {
  English = "en",
}

export type DocFile = {
  title: string;
  link: string;
};

export type Preferences = {
  language: "en";
};
