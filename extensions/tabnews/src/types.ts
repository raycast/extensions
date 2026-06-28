export interface PostResponse {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  tabcoins: number;
  owner_username: string;
  children_deep_count: number;
}

export enum Strategy {
  Relevant = "relevant",
  New = "new",
  Old = "old",
}
