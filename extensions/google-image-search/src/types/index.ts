// Types and interfaces for Google Image Search extension

export interface Preferences {
  apiKey: string;
  searchEngineId: string;
  siteSearch?: string;
  safeSearch: boolean;
  columns: number;
  downloadPath?: string;
}

export interface GoogleImageResult {
  link: string;
  title: string;
  mime?: string;
  fileFormat?: string;
  image: {
    height: number;
    width: number;
    thumbnailLink: string;
    contextLink: string;
  };
  globalIndex?: number; // For ordering results
}

export interface SearchResponse {
  items?: GoogleImageResult[];
  error?: {
    message: string;
  };
  searchInformation?: {
    totalResults: string;
  };
}

export interface SearchOptions {
  term: string;
  limit?: number;
  viewType?: string;
}

// Modified to match Raycast Grid component's expected pagination format
export interface PaginationInfo {
  pageSize: number;
  hasMore: boolean;
  onLoadMore: () => void;
  // Additional properties for our own use
  startIndex: number;
  totalResults: number;
  isLoadingMore: boolean;
}

export interface SearchResult {
  data: GoogleImageResult[];
  orderedData?: GoogleImageResult[]; // Optional, for ordered results
  isLoading: boolean;
  error: string | undefined;
  pagination: PaginationInfo;
}

export interface ImageTypeAccessoryProps {
  setViewType: (viewType: string) => void;
}

export interface ImageActionPanelProps {
  result: GoogleImageResult;
  detail?: boolean;
  searchText?: string;
}
