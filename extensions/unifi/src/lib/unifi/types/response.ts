export interface ApiResponse<T> {
  offset: number;
  limit: number;
  count: number;
  totalCount: number;
  data: T[];
}

export interface ApiResponseObject<T> {
  offset: number;
  limit: number;
  count: number;
  totalCount: number;
  data: T;
}

export type AsyncResponse<T> = Promise<ApiResponse<T>>;
