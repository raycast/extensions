// JSON:API wrapper types and pagination

export interface PaginatedResponse<T> {
  data: T[];
  included?: IncludedResource[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

export interface IncludedResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
}

export interface SingleResponse<T> {
  data: T;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string | null;
  per_page: number;
  to: number | null;
  total: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
