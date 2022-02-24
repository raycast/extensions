export interface State {
  query?: string;
  result?: string;
  type?: string;
  error?: Error;
  isLoading: boolean;
}
