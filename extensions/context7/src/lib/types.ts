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
  /** GitHub stars. `-1` for non-GitHub sources — guard before sorting or they rank as unpopular. */
  stars?: number;
  /** Indexing state; anything other than `finalized` is not fully searchable yet. */
  state?: "finalized" | "initial" | "processing" | "error" | "delete";
  branch?: string;
}

export interface ContextSnippet {
  title: string;
  /** One-line differentiator for the list row — Context7 reuses titles like "Basic example" heavily. */
  subtitle?: string;
  content: string;
  source?: string;
  /** Which half of the `/api/v2/context` response this came from. */
  kind: "code" | "docs";
}

export interface ContextSearchResponse {
  codeSnippets?: ContextCodeSnippet[];
  infoSnippets?: ContextInfoSnippet[];
  /** Owner- and team-authored usage rules shipped alongside snippets. Not surfaced in the UI yet. */
  rules?: {
    global?: string[];
    libraryOwn?: string[];
    libraryTeam?: string[];
  };
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

export interface BrowseDocsResponse {
  snippets: ContextCodeSnippet[];
}

export interface ContextInfoSnippet {
  pageId?: string;
  breadcrumb?: string;
  content: string;
  contentTokens?: number;
}

export interface SavedLibrary extends LibrarySummary {
  /** ISO timestamp of when the library was added to My Libraries. */
  addedAt?: string;
  /** Legacy field from when this was called "favorites"; read for migration, never written. */
  favoritedAt?: string;
}

/** A snippet carrying which library it came from — needed once results span libraries. */
export interface ScopedSnippet extends ContextSnippet {
  libraryId: string;
  libraryName: string;
}

export interface SavedSnippet extends ContextSnippet {
  /** Stable identity — the origin doc URL where Context7 provides one. */
  key: string;
  libraryId: string;
  libraryName: string;
  savedAt: string;
}

export interface Context7ErrorPayload {
  error?: string;
  message?: string;
  redirectUrl?: string;
}

export interface SearchLibrariesResponse {
  results: LibrarySummary[];
  /** True when a teamspace policy filtered the results — an empty list may not mean "no match". */
  searchFilterApplied?: boolean;
}

export interface LibrarySearchResult {
  libraries: LibrarySummary[];
  searchFilterApplied: boolean;
  endpoint: "v1" | "v2";
}
