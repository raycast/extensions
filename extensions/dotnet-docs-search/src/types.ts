export interface DocResponse {
  results: Array<Result>;
}

export interface Result {
  displayName: string;
  url: string;
  itemType: string;
  description: string;
}
