export interface IPreferences {
  email: string;
  apiKey: string;
}

export interface IDatabase {
  database_id: string;
  database_name: string;
  database_type: string;
  region: string;
  port: string;
  creation_time: string;
  state: string;
  password: string;
  user_email: string;
  endpoint: string;
  tls: boolean;
  multizone: boolean;
  rest_token: string;
  read_only_rest_token: string;
}

export interface ICluster {
  cluster_id: string;
  name: string;
  region: string;
  type: string;
  multizone: boolean;
  tcp_endpoint: string;
  rest_endpoint: string;
  state: string;
  username: string;
  password: string;
  max_retention_size: number;
  max_retention_time: number;
  max_messages_per_second: number;
  creation_time: number;
  max_message_size: number;
  max_partitions: number;
}
