export interface RecordItem {
  title: string,
  type: string,
  location: string,
  description: string,
  url: string,
}

export interface SearchState {
  records?: RecordItem[];
  error?: Error;
  loading?: boolean;
}