export type Log = {
  _app: string;
  _source_id: string;
  dt: string;
  _insert_index: number;
  _dt: string;
  "fly.app.name": string;
  "fly.app.instance": string;
  "fly.region": string;
  host: string;
  "log.level": string;
  message: string | null;
} & { [key: string]: string };

export type LogResponse = {
  data: Log[];
  pagination: Pagination;
};

export type SourceAttributes = {
  team_id: number;
  name: string;
  platform: string;
  table_name: string;
  token: string;
  retention: number;
  ingesting_paused: boolean;
  autogenerate_views: boolean;
  created_at: "2023-04-26T16:26:59.995Z";
  updated_at: "2023-05-11T05:10:37.889Z";
};

export type Source = {
  id: string;
  type: string;
  attributes: SourceAttributes;
};

export type Pagination = {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
};

export type SourceResponse = {
  data: Source[];
  pagination: Pagination;
};
