/**
 * Sefaria API response types
 */

export interface SearchResult {
  _index: string;
  _id: string;
  _score: number;
  highlight?: {
    exact?: string[];
    [key: string]: string[] | undefined;
  };
}

export interface SearchResponse {
  hits: {
    hits: SearchResult[];
    total: number | { value: number };
  };
}

/**
 * Pagination types
 */
export interface PaginationState {
  hasMore: boolean;
  onLoadMore: () => void;
  pageSize: number;
}

export interface InfiniteSearchData {
  results: SearchResult[];
  totalCount: number;
  hasMore: boolean;
}

export interface InfiniteSearchReturn {
  data: InfiniteSearchData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  pagination: PaginationState;
}

export interface Version {
  text: string | string[];
  language: string;
  versionTitle: string;
  versionTitleInHebrew?: string;
  versionSource?: string;
  versionNotes?: string;
  actualLanguage: string;
  languageFamilyName: string;
  isSource: boolean;
  isPrimary: boolean;
  direction: string;
  priority?: number;
  status?: string;
  license?: string;
}

export interface TextContent {
  versions: Version[];
  available_versions: Version[];
  ref: string;
  heRef: string;
  book: string;
  heTitle: string;
  categories: string[];
  sections: string[];
  toSections: string[];
  sectionRef: string;
  heSectionRef: string;
  primary_category: string;
  type: string;
  indexTitle: string;
  heIndexTitle: string;
  collectiveTitle: string;
  heCollectiveTitle: string;
  isComplex: boolean;
  isDependant: boolean;
  isSpanning: boolean;
  next: string;
  prev: string;
  title: string;
  alts: Record<string, unknown>[];
  lengths: number[];
  length: number;
  textDepth: number;
  sectionNames: string[];
  addressTypes: string[];
  titleVariants: string[];
  heTitleVariants: string[];
  index_offsets_by_depth: Record<string, unknown>;
  warnings: string[];
}

/**
 * Processed text data types
 */
export interface ProcessedTextData {
  cleanText: string;
  footnotes: string[];
}

/**
 * Component props types
 */
export interface SourceDetailProps {
  reference: string;
}

export interface TextDisplayProps {
  reference: string;
}

/**
 * Category grouping types
 */
export interface CategoryGroup {
  category: string;
  count: number;
  results: SearchResult[];
}

export interface CategorySearchData {
  categories: CategoryGroup[];
  totalCount: number;
  hasMore: boolean;
}

export interface CategorySearchReturn {
  data: CategorySearchData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  pagination: PaginationState;
}

/**
 * Component props
 */
export interface CategoryListProps {
  query: string;
  data: CategorySearchData | undefined;
  error: Error | undefined;
  isLoading: boolean;
  onSelectCategory: (categoryName: string, categoryResults: SearchResult[]) => void;
}

export interface SearchListProps {
  query: string;
  data: InfiniteSearchData | undefined;
  error: Error | undefined;
  isLoading: boolean;
  pagination: PaginationState;
  onSelectResult: (reference: string) => void;
}
