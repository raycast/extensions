export interface Page<T> {
  total_count: number;
  page: number;
  per_page: number;
  sort_order: string;
  sort_field: string;
  data: T | null;
}
