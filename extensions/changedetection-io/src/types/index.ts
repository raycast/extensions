export type Watch = {
  last_changed: number;
  last_checked: number;
  last_error: false | string;
  title: string | null;
  url: string;
  viewed: boolean;
};

export type WatchWithID = Watch & {
  id: string;
};

export type UseWatchesResult = {
  unseen: WatchWithID[];
  seen: WatchWithID[];
};

export type WatchDetails = Watch & {
  check_count: number;
  date_created: number;
  last_viewed: number;
  method: "OPTIONS" | "GET" | "DELETE" | "PATCH" | "POST" | "PUT";
  notification_alert_count: number;
  paused: boolean;
  processor: "restock_diff" | "text_json_diff";
  sort_text_alphabetically: boolean;
  tags: string[];
  uuid: string;
  last_notification_error: false | string;
  history_n: number;
};

export type Tag = {
  uuid: string;
  title: string;
  notification_urls: string[];
  notification_muted: boolean;
};

type ApiResponse<T> = {
  [key: string]: T;
};

export type WatchesResponse = ApiResponse<Watch>;
export type TagsResponse = ApiResponse<Tag>;
export type WatchHistoryResponse = ApiResponse<string>;

export type SortBy = "none" | "checked_asc" | "checked_des" | "changed_asc" | "changed_des";

export type CreateWatchFormValues = {
  url: string;
  title: string;
  paused: boolean;
  muted: boolean;
  method: string;
};
