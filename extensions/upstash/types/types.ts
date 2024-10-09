export enum DatabaseType {
  Free = "Free",
  PayAsYouGo = "Pay as You Go",
  Enterprise = "Enterprise"
}

export enum Type {
  Paid = "paid",
  Free = "free"
}

export enum State {
  Active = "active",
  Archived = "archived",
  Deleted = "deleted"
}


export interface Database {
  database_id: string;
  database_name: string,
  database_type: DatabaseType,
  region: string
  type: Type
  port: number
  creation_time: number // 1616762891
  state: State
  endpoint: string
  tls: boolean
  eviction: boolean
  consistent: boolean
  // daily_backup_enabled: string
  // rest_token: string
  // read_write_access_key: string
  // read_only_access_key: string
  // admin_access_key: string
};

export interface Vector {
  id: string;
  name: string;
  similarity_function: string;
  dimension_count: string;
  endpoint: string;
  type: Type;
  region: string;
};