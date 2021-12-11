export interface Response<T> {
  result?: T;
  error?: string;
  isLoading?: boolean;
}
