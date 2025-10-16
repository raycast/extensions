export interface ListResponse {
  user_product_info: UserProductInfo;
  product: Product;
}

export interface Product {
  id: number;
  type: string;
  title: string;
  release_date: string;
  poster_file_path: string;
  trailer_url: string;
  items_count: number;
  items_released_count: number;
  subtitle?: string;
  runtime: number;
}

export interface UserProductInfo {
  modified_at: string;
  user_show_info: UserShowInfo;
  user_id: number;
  product_id: number;
  status: string;
  discussion_id: number;
  rate?: number;
  reviewed: boolean;
  is_disliked: boolean;
  is_notification_enabled?: boolean;
}

export interface UserShowInfo {
  episodes_watched: number;
  first_unwatched_episode: number;
}
