export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
  pagination?: Pagination;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface GetRecordingsParams {
  page?: number;
  per_page?: number;
  search?: string;
  folder_id?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
}

export interface GetRecordingsResponse {
  recordings: import("./recording").Recording[];
  pagination: Pagination;
}
