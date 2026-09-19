export type WorkKind =
  "book" | "article" | "thesis" | "report" | "encyclopedia" | "other";

export type AccessKind =
  "download" | "read" | "borrow" | "record" | "purchase" | "institution";

export type FileFormat =
  | "pdf"
  | "tex"
  | "doc"
  | "txt"
  | "epub"
  | "html"
  | "djvu"
  | "rtf"
  | "xml"
  | "mobi"
  | "unknown";

export type AccessLink = {
  label: string;
  url: string;
  source: string;
  kind: AccessKind;
  format?: string;
  language?: string;
  isOpenAccess?: boolean;
};

export type WorkEdition = {
  id: string;
  title?: string;
  year?: number;
  publisher?: string;
  languages: string[];
  identifiers: {
    isbn?: string[];
    other?: string[];
  };
  sources: string[];
  accessLinks: AccessLink[];
};

export type WorkResult = {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  publisher?: string;
  kind: WorkKind;
  languages?: string[];
  coverUrl?: string;
  abstract?: string;
  license?: string;
  version?: string;
  isRetracted?: boolean;
  confidence?: "exact" | "high" | "probable" | "related";
  identifiers: {
    doi?: string;
    isbn?: string[];
    issn?: string[];
    pmid?: string;
    other?: string[];
  };
  citation?: {
    containerTitle?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    edition?: string;
    url?: string;
  };
  sources: string[];
  /** Internal provenance used to keep discovery/access and bibliographic metadata choices independent. */
  providerId?: string;
  metadataEligible?: boolean;
  metadataSources?: string[];
  accessSources?: string[];
  accessLinks: AccessLink[];
  editions?: WorkEdition[];
};

export type AdvancedSearchQuery = {
  general?: string;
  title?: string;
  authors?: string;
  kind?: WorkKind | "any";
  publisher?: string;
  yearFrom?: number;
  yearTo?: number;
  journal?: string;
  isbn?: string;
  issn?: string;
  doi?: string;
  languages?: string[];
  exactTitle?: boolean;
  openAccessOnly?: boolean;
  withAcceptedFilesOnly?: boolean;
};

export type SearchRequest = {
  text: string;
  /** Queries tried only when the primary query returns no result from a provider. */
  fallbackTexts?: string[];
  /** Text used to rank fallback results when `text` is an identifier such as a DOI. */
  matchText?: string;
  advanced?: AdvancedSearchQuery;
};

export type SearchContext = {
  signal: AbortSignal;
  contactEmail?: string;
  googleBooksApiKey?: string;
  semanticScholarApiKey?: string;
  coreApiKey?: string;
  advanced?: AdvancedSearchQuery;
  fallbackQueries?: string[];
};

export type SearchProvider = {
  id: string;
  name: string;
  /** The provider applies fallback queries independently to its internal source groups. */
  handlesFallbackQueries?: boolean;
  search(query: string, context: SearchContext): Promise<WorkResult[]>;
};

export type ProviderFailure = {
  provider: string;
  message: string;
};
