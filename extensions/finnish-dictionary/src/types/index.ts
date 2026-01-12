export interface Suggestion {
  title: string;
  url: string;
  detail?: string;
}

export interface ResultDetailProps {
  res: Suggestion;
  from: string;
  to: string;
}

export interface WordDictionaryProps {
  from: string;
  to: string;
}

export interface RedFoxAPIResponse {
  translations: {
    empty: boolean;
    entryGroups: Array<{
      category: string;
      entries: Array<{
        text: string;
        context?: string;
      }>;
    }>;
  };
  definitions: {
    empty: boolean;
    entryGroups: Array<{
      category: string;
      entries: Array<{
        text: string;
      }>;
    }>;
  };
  definitionsInDestLanguage?: {
    empty: boolean;
    entryGroups: Array<{
      category: string;
      entries: Array<{
        text: string;
      }>;
    }>;
  };
  subtitleResult?: {
    resultList: Array<{
      subtitle1: string;
      subtitle2: string;
    }>;
  };
}

export interface BackupAPIResponse {
  subtitleResult: {
    query: {
      word1: string;
      word2: string;
    };
  };
}

export interface RecentSearch {
  title: string;
  from: string;
  to: string;
  detail: string;
}
