export interface LibrarySummary {
  id: string;
  name: string;
  title?: string;
  description?: string;
  lastUpdateDate?: string;
  totalSnippets?: number;
  totalTokens?: number;
  trustScore?: number;
  benchmarkScore?: number;
  versions?: string[];
}

export interface ContextSnippet {
  title: string;
  content: string;
  source?: string;
}

export interface ContextSearchResponse {
  codeSnippets?: ContextCodeSnippet[];
  infoSnippets?: ContextInfoSnippet[];
}

export interface ContextCodeSnippet {
  codeTitle?: string;
  codeDescription?: string;
  codeLanguage?: string;
  codeTokens?: number;
  codeId?: string;
  pageTitle?: string;
  codeList?: Array<{
    language?: string;
    code: string;
  }>;
}

export interface ContextInfoSnippet {
  pageId?: string;
  breadcrumb?: string;
  content: string;
  contentTokens?: number;
}

export type FavoriteLibrary = LibrarySummary;

export interface Context7ErrorPayload {
  error?: string;
  message?: string;
  redirectUrl?: string;
}

export interface SearchLibrariesResponse {
  results: LibrarySummary[];
}
