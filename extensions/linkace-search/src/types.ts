export type SortOrder = "title:asc" | "title:desc" | "url:asc" | "url:desc" | "created_at:asc" | "created_at:desc";

export type VisibilityFilter = "all" | "private";

export type SearchFilters = {
  searchTitle: boolean;
  searchDescription: boolean;
  visibility: VisibilityFilter;
  brokenOnly: boolean;
  emptyLists: boolean;
  emptyTags: boolean;
  selectedListIds: string[];
  selectedTagIds: string[];
  sortOrder: SortOrder;
};

export type LinkAceTag = {
  id: number;
  name: string;
  description?: string | null;
  visibility?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LinkAceList = {
  id: number;
  name: string;
  description?: string | null;
  visibility?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LinkAceLink = {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  icon?: string | null;
  visibility?: number | null;
  status?: number | null;
  check_disabled?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  tags?: LinkAceTag[];
  lists?: LinkAceList[];
};

export type LinkAceApiError = {
  message?: string;
  error?: string;
  detail?: string;
};

export type LinkAcePaginatedResponse<T> = LinkAceApiError & {
  data?: T[];
  total?: number;
  current_page?: number;
  last_page?: number;
  per_page?: number | string;
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  searchTitle: true,
  searchDescription: true,
  visibility: "all",
  brokenOnly: false,
  emptyLists: false,
  emptyTags: false,
  selectedListIds: [],
  selectedTagIds: [],
  sortOrder: "title:asc",
};

export const SORT_ORDER_OPTIONS: Array<{ title: string; value: SortOrder }> = [
  { title: "Title ↑", value: "title:asc" },
  { title: "Title ↓", value: "title:desc" },
  { title: "URL ↑", value: "url:asc" },
  { title: "URL ↓", value: "url:desc" },
  { title: "Created ↑", value: "created_at:asc" },
  { title: "Created ↓", value: "created_at:desc" },
];

export const VISIBILITY_OPTIONS: Array<{ title: string; value: VisibilityFilter }> = [
  { title: "All Visible Links", value: "all" },
  { title: "Private Only", value: "private" },
];
