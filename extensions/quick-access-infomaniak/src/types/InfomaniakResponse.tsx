export interface InfomaniakResponse<T> {
  result: "success" | "error";
  data: T[];
  total: number;
  pages: number;
  items_per_page: number;
  page: number;
}
